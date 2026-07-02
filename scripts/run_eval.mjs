#!/usr/bin/env node
// @ts-check
/*
 * run_eval.mjs — execute and score the intake eval cases.
 *
 * The whole point of this project is to keep intake CHEAP. So the runner is
 * built to make that measurable AND to enforce it structurally:
 *
 *   - It makes EXACTLY ONE plain chat/messages call per case, with no tools,
 *     bounded max_tokens, and temperature 0. That means "extended reasoning",
 *     "spawn subagents" and "read files" are impossible by construction — the
 *     harness cannot do them, so those `must_not_do` items always hold.
 *   - It records input/output tokens per case and enforces a per-class output
 *     token ceiling (cost regression guard). PASS/FAIL is reported per case and
 *     overall. The summary reports classification accuracy, avg/p95 output
 *     tokens, avg questions, and over/under-intake candidates.
 *
 * The model is asked to emit the router JSON (schemas/intake-router.schema.json)
 * built from the canonical prompts (prompts/system-intake.md + intake-router.md),
 * so scoring is deterministic instead of parsing free-form prose.
 *
 * Zero dependencies: native `https` only, so it honors package.json engines
 * (node >=16) and does NOT require Node 18's global fetch.
 *
 * Run with --help for CLI options and environment variables.
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import {
  dryRunMarkdownReport,
  liveMarkdownReport,
  summarizeIds,
  summarizeLiveRows,
  writeMarkdownReport,
} from "./eval_report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CLASSES = ["READY_TO_EXECUTE", "NEEDS_LIGHT_REFINEMENT", "NEEDS_INTAKE", "BLOCKED"];
const RECOMMENDED_MODES = [
  "execute_now",
  "state_assumptions_then_execute",
  "ask_before_execute",
  "decline_or_redirect",
];
const DECISION_KEYS = [
  "schema_version",
  "classification",
  "confidence",
  "readiness_score",
  "ambiguity_score",
  "activation_signals",
  "suppression_signals",
  "recommended_mode",
  "compact_summary",
  "reason",
  "known_fields",
  "critical_gaps",
  "suggested_questions",
  "provisional_task",
];

// Per-class output-token ceilings (cost regression guard). A READY case must
// stay tiny; a full NEEDS_INTAKE brief is allowed more room. Override via
// INTAKE_EVAL_CEILING_READY_TO_EXECUTE etc.
const DEFAULT_CEILINGS = {
  READY_TO_EXECUTE: 320,
  NEEDS_LIGHT_REFINEMENT: 460,
  NEEDS_INTAKE: 720,
  BLOCKED: 460,
};

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const col = (k, s) => (useColor ? C[k] + s + C.reset : s);
const PASS = () => col("green", "PASS");
const FAIL = () => col("red", "FAIL");

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = {
    dryRun: false,
    file: "evals/intake-cases.jsonl",
    provider: null,
    model: null,
    limit: null,
    report: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--dry-run") a.dryRun = true;
    else if (v === "--help" || v === "-h") a.help = true;
    else if (v === "--file") a.file = argv[++i];
    else if (v.startsWith("--file=")) a.file = v.slice(7);
    else if (v === "--provider") a.provider = argv[++i];
    else if (v.startsWith("--provider=")) a.provider = v.slice(11);
    else if (v === "--model") a.model = argv[++i];
    else if (v.startsWith("--model=")) a.model = v.slice(8);
    else if (v === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (v.startsWith("--limit=")) a.limit = parseInt(v.slice(8), 10);
    else if (v === "--report") a.report = argv[++i];
    else if (v.startsWith("--report=")) a.report = v.slice(9);
  }
  return a;
}

function printHelp() {
  console.log(`
${col("bold", "run_eval.mjs")} — execute and score the intake eval cases

${col("bold", "Usage")}
  node scripts/run_eval.mjs --dry-run     validate jsonl + static asserts (no network)
  node scripts/run_eval.mjs               run cases against the model
  npm run eval:dry                        same as --dry-run
  npm run eval                            same as a full run

${col("bold", "Options")}
  --dry-run            no network; validate schema + static cost-guard asserts
  --provider <p>       anthropic (default) | openai
  --model <id>         model id (defaults per provider)
  --file <path>        cases file (default evals/intake-cases.jsonl)
  --limit <n>          run only the first n cases
  --report <path>      write a local markdown report (no extra model calls)
  --help, -h           this help

${col("bold", "Env")}
  INTAKE_EVAL_PROVIDER, INTAKE_EVAL_MODEL, INTAKE_EVAL_API_KEY
  ANTHROPIC_API_KEY / OPENAI_API_KEY, INTAKE_EVAL_BASE_URL, INTAKE_EVAL_REPORT
  INTAKE_EVAL_MAX_TOKENS
  INTAKE_EVAL_CEILING_<CLASS>, INTAKE_EVAL_PRICE_IN, INTAKE_EVAL_PRICE_OUT
`);
}

// ---------------------------------------------------------------------------
// load + validate cases
// ---------------------------------------------------------------------------
function loadCases(file) {
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  const raw = fs.readFileSync(abs, "utf8");
  const cases = [];
  const errors = [];
  raw.split("\n").forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch (e) {
      errors.push(`line ${idx + 1}: invalid JSON (${e.message})`);
      return;
    }
    cases.push(obj);
  });
  return { cases, errors };
}

// Schema + static cost-guard asserts. Returns array of error strings (empty = OK).
function expectStringArray(c, key, at, errs) {
  if (key in c && (!Array.isArray(c[key]) || !c[key].every((x) => typeof x === "string" && x.length > 0))) {
    errs.push(`${at}: ${key} must be a non-empty-string array`);
  }
}

function expectScoreBound(c, key, at, errs) {
  if (key in c && (!Number.isInteger(c[key]) || c[key] < 0 || c[key] > 100)) {
    errs.push(`${at}: ${key} must be an integer from 0 to 100`);
  }
}

function validateCase(c, i) {
  const errs = [];
  const at = `case[${i}]${c && c.id ? ` "${c.id}"` : ""}`;
  if (typeof c.id !== "string" || !c.id) errs.push(`${at}: missing string "id"`);
  if (typeof c.input !== "string" || !c.input) errs.push(`${at}: missing string "input"`);
  if (!CLASSES.includes(c.expected_classification))
    errs.push(`${at}: expected_classification must be one of ${CLASSES.join("|")}`);
  if ("max_questions" in c && (!Number.isInteger(c.max_questions) || c.max_questions < 0))
    errs.push(`${at}: max_questions must be a non-negative integer`);
  for (const key of ["must_ask_about", "must_not_do"]) {
    if (key in c) {
      if (!Array.isArray(c[key]) || !c[key].every((x) => typeof x === "string"))
        errs.push(`${at}: ${key} must be an array of strings`);
    }
  }
  if ("must_state_assumptions" in c && typeof c.must_state_assumptions !== "boolean")
    errs.push(`${at}: must_state_assumptions must be boolean`);
  for (const key of ["expected_activation_signals", "expected_suppression_signals"]) {
    expectStringArray(c, key, at, errs);
  }
  if ("expected_recommended_mode" in c && !RECOMMENDED_MODES.includes(c.expected_recommended_mode))
    errs.push(`${at}: expected_recommended_mode must be one of ${RECOMMENDED_MODES.join("|")}`);
  for (const key of [
    "expected_readiness_min",
    "expected_readiness_max",
    "expected_ambiguity_min",
    "expected_ambiguity_max",
  ]) {
    expectScoreBound(c, key, at, errs);
  }
  if (
    "expected_readiness_min" in c &&
    "expected_readiness_max" in c &&
    c.expected_readiness_min > c.expected_readiness_max
  )
    errs.push(`${at}: expected_readiness_min must be <= expected_readiness_max`);
  if (
    "expected_ambiguity_min" in c &&
    "expected_ambiguity_max" in c &&
    c.expected_ambiguity_min > c.expected_ambiguity_max
  )
    errs.push(`${at}: expected_ambiguity_min must be <= expected_ambiguity_max`);

  // Static cost-guard consistency: a READY case must not budget any question.
  if (c.expected_classification === "READY_TO_EXECUTE" && "max_questions" in c && c.max_questions !== 0)
    errs.push(`${at}: READY_TO_EXECUTE should have max_questions: 0`);
  // Question budget hard cap is 5 (see protocol).
  if ("max_questions" in c && c.max_questions > 5)
    errs.push(`${at}: max_questions exceeds the hard cap of 5`);
  return errs;
}

// ---------------------------------------------------------------------------
// prompt assembly (faithful to canonical files)
// ---------------------------------------------------------------------------
function buildSystem() {
  const systemText = fs.readFileSync(path.join(ROOT, "prompts/system-intake.md"), "utf8");
  const routerText = fs.readFileSync(path.join(ROOT, "prompts/intake-router.md"), "utf8");
  return (
    systemText +
    "\n\n---\n\n" +
    routerText +
    "\n\n---\n\nOutput ONLY the JSON object described above. No markdown fences, no commentary before or after."
  );
}

// ---------------------------------------------------------------------------
// provider adapters (pluggable)
// ---------------------------------------------------------------------------
function httpsPostJson(urlString, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlString);
    const payload = JSON.stringify(bodyObj);
    const req = https.request(
      {
        method: "POST",
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = { raw: data };
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const msg = parsed?.error?.message || parsed?.error || data.slice(0, 300);
            reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
          } else {
            resolve(parsed);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

const ADAPTERS = {
  anthropic: {
    defaultModel: "claude-haiku-4-5-20251001",
    defaultBaseUrl: "https://api.anthropic.com/v1/messages",
    keyEnv: "ANTHROPIC_API_KEY",
    async call({ baseUrl, apiKey, model, system, user, maxTokens }) {
      const res = await httpsPostJson(
        baseUrl,
        { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        {
          model,
          max_tokens: maxTokens,
          temperature: 0,
          system,
          messages: [{ role: "user", content: user }],
        }
      );
      const text = (res.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      return {
        text,
        inputTokens: res.usage?.input_tokens ?? 0,
        outputTokens: res.usage?.output_tokens ?? 0,
      };
    },
  },
  openai: {
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
    async call({ baseUrl, apiKey, model, system, user, maxTokens }) {
      const res = await httpsPostJson(
        baseUrl,
        { Authorization: `Bearer ${apiKey}` },
        {
          model,
          max_tokens: maxTokens,
          temperature: 0,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }
      );
      const text = res.choices?.[0]?.message?.content ?? "";
      return {
        text,
        inputTokens: res.usage?.prompt_tokens ?? 0,
        outputTokens: res.usage?.completion_tokens ?? 0,
      };
    },
  },
};

// ---------------------------------------------------------------------------
// decision parsing + scoring
// ---------------------------------------------------------------------------
function parseDecision(text) {
  let t = (text || "").trim();
  // strip ```json fences if present
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object found in model output");
  return JSON.parse(t.slice(start, end + 1));
}

function isStringArray(value, maxItems = Infinity) {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function validateDecision(decision) {
  const errs = [];
  if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
    return ["decision must be an object"];
  }
  for (const key of Object.keys(decision)) {
    if (!DECISION_KEYS.includes(key)) errs.push(`unexpected field "${key}"`);
  }
  for (const key of DECISION_KEYS) {
    if (!(key in decision)) errs.push(`missing field "${key}"`);
  }
  if (decision.schema_version !== "0.4") errs.push(`schema_version must be "0.4"`);
  if (!CLASSES.includes(decision.classification)) errs.push(`classification must be one of ${CLASSES.join("|")}`);
  if (typeof decision.confidence !== "number" || decision.confidence < 0 || decision.confidence > 1)
    errs.push("confidence must be a number from 0 to 1");
  for (const key of ["readiness_score", "ambiguity_score"]) {
    if (!Number.isInteger(decision[key]) || decision[key] < 0 || decision[key] > 100)
      errs.push(`${key} must be an integer from 0 to 100`);
  }
  if (!isStringArray(decision.activation_signals, 5))
    errs.push("activation_signals must be an array of 0-5 strings");
  if (!isStringArray(decision.suppression_signals, 5))
    errs.push("suppression_signals must be an array of 0-5 strings");
  if (!RECOMMENDED_MODES.includes(decision.recommended_mode))
    errs.push(`recommended_mode must be one of ${RECOMMENDED_MODES.join("|")}`);
  if (typeof decision.compact_summary !== "string" || decision.compact_summary.trim().length === 0)
    errs.push("compact_summary must be a non-empty string");
  else if (decision.compact_summary.length > 220) errs.push("compact_summary must be <= 220 characters");
  if (typeof decision.reason !== "string" || decision.reason.trim().length === 0)
    errs.push("reason must be a non-empty string");
  else if (decision.reason.length > 400) errs.push("reason must be <= 400 characters");
  const kf = decision.known_fields;
  const knownKeys = ["objective", "deliverable", "context", "audience", "constraints", "format", "success_criteria"];
  if (!kf || typeof kf !== "object" || Array.isArray(kf)) {
    errs.push("known_fields must be an object");
  } else {
    for (const key of Object.keys(kf)) {
      if (!knownKeys.includes(key)) errs.push(`known_fields has unexpected field "${key}"`);
    }
    for (const key of knownKeys) {
      if (!(key in kf)) errs.push(`known_fields missing "${key}"`);
    }
    for (const key of knownKeys.filter((key) => key !== "constraints")) {
      if (kf[key] !== null && typeof kf[key] !== "string")
        errs.push(`known_fields.${key} must be string or null`);
    }
    if (!isStringArray(kf.constraints, Infinity)) errs.push("known_fields.constraints must be an array of strings");
  }
  if (!isStringArray(decision.critical_gaps, 5)) errs.push("critical_gaps must be an array of 0-5 strings");
  if (!isStringArray(decision.suggested_questions, 5))
    errs.push("suggested_questions must be an array of 0-5 strings");
  if (decision.provisional_task !== null && typeof decision.provisional_task !== "string")
    errs.push("provisional_task must be string or null");
  else if (typeof decision.provisional_task === "string" && decision.provisional_task.length > 800)
    errs.push("provisional_task must be <= 800 characters");
  return errs;
}

const normalize = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// must_not_do: process items are enforced structurally by the harness (single
// call, no tools, bounded tokens). Question-shaped items map to the observed
// question count / classification.
function checkMustNotDo(item, { classification, numQuestions }) {
  const s = normalize(item);
  if (s.includes("more than one question")) {
    return { pass: numQuestions <= 1, note: `${numQuestions} question(s)` };
  }
  if (s.includes("full intake")) {
    return {
      pass: classification !== "NEEDS_INTAKE" && numQuestions === 0,
      note: `class=${classification}, q=${numQuestions}`,
    };
  }
  if (s.includes("question")) {
    return { pass: numQuestions === 0, note: `${numQuestions} question(s)` };
  }
  // extended reasoning / spawn subagents / read files — impossible in this harness
  return { pass: true, note: "enforced by harness (single call, no tools)" };
}

function topicCovered(topic, questions) {
  const nt = normalize(topic);
  const words = nt.split(/\s+/).filter((w) => w.length >= 4);
  return questions.some((q) => {
    const nq = normalize(q);
    if (nq.includes(nt)) return true;
    return words.some((w) => nq.includes(w));
  });
}

function valueInRange(value, min, max) {
  if (!Number.isFinite(value)) return false;
  if (Number.isFinite(min) && value < min) return false;
  if (Number.isFinite(max) && value > max) return false;
  return true;
}

function ceilingFor(cls) {
  const env = process.env[`INTAKE_EVAL_CEILING_${cls}`];
  if (env && Number.isFinite(Number(env))) return Number(env);
  return DEFAULT_CEILINGS[cls] ?? 600;
}

function scoreCase(c, decision, usage) {
  const checks = [];
  const schemaErrors = validateDecision(decision);
  for (const err of schemaErrors) {
    checks.push({ name: "schema", pass: false, note: err });
  }
  const cls = decision.classification;
  const questions = Array.isArray(decision.suggested_questions) ? decision.suggested_questions : [];
  const numQuestions = questions.length;

  // (a) classification
  checks.push({
    name: "class",
    pass: cls === c.expected_classification,
    note: `got ${cls}, want ${c.expected_classification}`,
  });

  // (b) question budget
  if ("max_questions" in c) {
    checks.push({
      name: "questions",
      pass: numQuestions <= c.max_questions,
      note: `${numQuestions} <= ${c.max_questions}`,
    });
  }

  // (c) must_not_do
  if (Array.isArray(c.must_not_do)) {
    for (const item of c.must_not_do) {
      const r = checkMustNotDo(item, { classification: cls, numQuestions });
      checks.push({ name: `must_not_do:${item}`, pass: r.pass, note: r.note });
    }
  }

  // (d) must_ask_about
  if (Array.isArray(c.must_ask_about)) {
    for (const topic of c.must_ask_about) {
      checks.push({
        name: `asks:${topic}`,
        pass: topicCovered(topic, questions),
        note: topicCovered(topic, questions) ? "covered" : "not covered",
      });
    }
  }

  // (e) must_state_assumptions
  if (c.must_state_assumptions) {
    const kf = decision.known_fields || {};
    const filledFields = Object.entries(kf).filter(([k, v]) => {
      if (k === "objective") return false;
      if (Array.isArray(v)) return v.length > 0;
      return v !== null && v !== undefined && v !== "";
    }).length;
    const hasProvisional = typeof decision.provisional_task === "string" && decision.provisional_task.trim().length > 0;
    checks.push({
      name: "assumptions",
      pass: hasProvisional || filledFields > 0,
      note: hasProvisional ? "provisional_task set" : `${filledFields} known field(s)`,
    });
  }

  // (f) v0.4 signal / score expectations
  if (Array.isArray(c.expected_activation_signals)) {
    const actual = Array.isArray(decision.activation_signals) ? decision.activation_signals : [];
    for (const signal of c.expected_activation_signals) {
      checks.push({
        name: `activation:${signal}`,
        pass: topicCovered(signal, actual),
        note: topicCovered(signal, actual) ? "covered" : `got [${actual.join(", ")}]`,
      });
    }
  }
  if (Array.isArray(c.expected_suppression_signals)) {
    const actual = Array.isArray(decision.suppression_signals) ? decision.suppression_signals : [];
    for (const signal of c.expected_suppression_signals) {
      checks.push({
        name: `suppression:${signal}`,
        pass: topicCovered(signal, actual),
        note: topicCovered(signal, actual) ? "covered" : `got [${actual.join(", ")}]`,
      });
    }
  }
  if ("expected_recommended_mode" in c) {
    checks.push({
      name: "mode",
      pass: decision.recommended_mode === c.expected_recommended_mode,
      note: `got ${decision.recommended_mode}, want ${c.expected_recommended_mode}`,
    });
  }
  if ("expected_readiness_min" in c || "expected_readiness_max" in c) {
    const min = Number.isFinite(c.expected_readiness_min) ? c.expected_readiness_min : -Infinity;
    const max = Number.isFinite(c.expected_readiness_max) ? c.expected_readiness_max : Infinity;
    checks.push({
      name: "readiness_score",
      pass: valueInRange(decision.readiness_score, min, max),
      note: `${decision.readiness_score} in ${min === -Infinity ? "-∞" : min}..${max === Infinity ? "∞" : max}`,
    });
  }
  if ("expected_ambiguity_min" in c || "expected_ambiguity_max" in c) {
    const min = Number.isFinite(c.expected_ambiguity_min) ? c.expected_ambiguity_min : -Infinity;
    const max = Number.isFinite(c.expected_ambiguity_max) ? c.expected_ambiguity_max : Infinity;
    checks.push({
      name: "ambiguity_score",
      pass: valueInRange(decision.ambiguity_score, min, max),
      note: `${decision.ambiguity_score} in ${min === -Infinity ? "-∞" : min}..${max === Infinity ? "∞" : max}`,
    });
  }

  // (g) cost ceiling (uses expected class so a misclassification doesn't hide cost regressions)
  const ceiling = ceilingFor(c.expected_classification);
  checks.push({
    name: "cost",
    pass: usage.outputTokens <= ceiling,
    note: `${usage.outputTokens} out <= ${ceiling}`,
  });

  return { checks, numQuestions };
}

// ---------------------------------------------------------------------------
// reporting
// ---------------------------------------------------------------------------
function pad(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function reportTarget(args) {
  const target = args.report || process.env.INTAKE_EVAL_REPORT;
  return target && target.trim() ? target.trim() : null;
}

function writeReportIfRequested(args, markdown) {
  const displayPath = writeMarkdownReport(reportTarget(args), ROOT, markdown);
  if (!displayPath) return;
  console.log(col("dim", `  markdown report written to ${displayPath}`));
}

// ---------------------------------------------------------------------------
// dry-run
// ---------------------------------------------------------------------------
function runDry(cases, loadErrors, args) {
  console.log(col("bold", "\nDry run — schema + static cost-guard asserts (no network)\n"));
  let errors = [...loadErrors];
  const rows = [];
  cases.forEach((c, i) => {
    const e = validateCase(c, i);
    errors = errors.concat(e);
    const ok = e.length === 0;
    rows.push({ id: c.id || `case[${i}]`, expected: c.expected_classification, pass: ok, errors: e });
    console.log(`  ${ok ? PASS() : FAIL()}  ${pad(c.id || `case[${i}]`, 32)} ${col("dim", c.expected_classification || "?")}`);
    e.forEach((msg) => console.log(`        ${col("red", msg)}`));
  });
  console.log("");
  writeReportIfRequested(args, dryRunMarkdownReport({ args, rows, errors }));
  if (errors.length) {
    console.log(col("red", `✗ ${errors.length} error(s); ${cases.length} case(s) checked.`));
    return 1;
  }
  console.log(col("green", `✓ ${cases.length} case(s) valid. Schema + static asserts OK.`));
  return 0;
}

// ---------------------------------------------------------------------------
// live run
// ---------------------------------------------------------------------------
async function runLive(cases, args) {
  const providerKey = (args.provider || process.env.INTAKE_EVAL_PROVIDER || "anthropic").toLowerCase();
  const adapter = ADAPTERS[providerKey];
  if (!adapter) {
    console.error(col("red", `Unknown provider "${providerKey}". Supported: ${Object.keys(ADAPTERS).join(", ")}`));
    return 2;
  }
  const apiKey = process.env.INTAKE_EVAL_API_KEY || process.env[adapter.keyEnv];
  if (!apiKey) {
    console.error(col("red", `No API key. Set INTAKE_EVAL_API_KEY or ${adapter.keyEnv}. (Use --dry-run for CI without a key.)`));
    return 2;
  }
  const model = args.model || process.env.INTAKE_EVAL_MODEL || adapter.defaultModel;
  const baseUrl = process.env.INTAKE_EVAL_BASE_URL || adapter.defaultBaseUrl;
  const maxTokens = Number(process.env.INTAKE_EVAL_MAX_TOKENS) || 1024;
  const system = buildSystem();

  console.log(col("bold", `\nLive run — provider=${providerKey} model=${model}\n`));
  console.log(col("dim", "  One call per case · no tools · temperature 0 · bounded max_tokens\n"));

  const rows = [];
  for (const c of cases) {
    let row = { id: c.id, expected: c.expected_classification };
    try {
      const usage = await adapter.call({ baseUrl, apiKey, model, system, user: c.input, maxTokens });
      let decision;
      try {
        decision = parseDecision(usage.text);
      } catch (e) {
        row.error = `parse: ${e.message}`;
        row.inputTokens = usage.inputTokens;
        row.outputTokens = usage.outputTokens;
        row.checks = [{ name: "parse", pass: false, note: e.message }];
        rows.push(row);
        continue;
      }
      const { checks, numQuestions } = scoreCase(c, decision, usage);
      row.classification = decision.classification;
      row.numQuestions = numQuestions;
      row.inputTokens = usage.inputTokens;
      row.outputTokens = usage.outputTokens;
      row.checks = checks;
    } catch (e) {
      row.error = e.message;
      row.checks = [{ name: "call", pass: false, note: e.message }];
    }
    rows.push(row);
  }

  // table
  console.log(
    "  " +
      col("bold", pad("id", 30) + pad("class", 16) + pad("q", 4) + pad("in", 7) + pad("out", 7) + pad("cost", 6) + "result")
  );
  console.log("  " + col("dim", "-".repeat(76)));
  let passed = 0;
  for (const row of rows) {
    const allPass = row.checks.every((ch) => ch.pass);
    if (allPass) passed++;
    const costCheck = (row.checks || []).find((ch) => ch.name === "cost");
    const costStr = costCheck ? (costCheck.pass ? col("green", "ok") : col("red", "OVER")) : "-";
    console.log(
      "  " +
        pad(row.id, 30) +
        pad(row.classification || (row.error ? "ERR" : "?"), 16) +
        pad(row.numQuestions ?? "-", 4) +
        pad(row.inputTokens ?? "-", 7) +
        pad(row.outputTokens ?? "-", 7) +
        pad(costStr, 6 + (useColor ? 9 : 0)) +
        (allPass ? PASS() : FAIL())
    );
    // show failing checks
    for (const ch of row.checks) {
      if (!ch.pass) console.log("    " + col("red", `✗ ${ch.name}`) + col("dim", ` — ${ch.note}`));
    }
  }

  // summary
  const summary = summarizeLiveRows(rows, CLASSES, ceilingFor, passed);
  console.log("\n" + col("bold", "  Summary"));
  console.log(`    cases passed              ${summary.passed}/${summary.n} (${summary.passRate})`);
  console.log(
    `    classification accuracy   ${summary.classificationCorrect}/${summary.n} (${summary.classificationAccuracy})`
  );
  console.log(`    tokens (in/out)           ${summary.totalIn} / ${summary.totalOut}`);
  console.log(`    avg output tokens         ${summary.avgOutputTokens}`);
  console.log(`    p95 output tokens         ${summary.p95OutputTokens}`);
  console.log(`    avg questions             ${summary.avgQuestions}`);
  console.log(`    over-intake candidates    ${summary.overRows.length} (${summarizeIds(summary.overRows)})`);
  console.log(`    under-intake candidates   ${summary.underRows.length} (${summarizeIds(summary.underRows)})`);
  console.log("\n" + col("bold", "  By expected class"));
  console.log("    " + col("bold", pad("class", 24) + pad("cases", 7) + pad("avg out", 9) + pad("p95 out", 9) + pad("ceiling", 9) + "avg q"));
  console.log("    " + col("dim", "-".repeat(70)));
  for (const row of summary.byClass) {
    console.log(
      "    " +
        pad(row.classification, 24) +
        pad(row.cases, 7) +
        pad(row.avgOutputTokens, 9) +
        pad(row.p95OutputTokens, 9) +
        pad(row.ceiling, 9) +
        row.avgQuestions
    );
  }

  const priceIn = Number(process.env.INTAKE_EVAL_PRICE_IN);
  const priceOut = Number(process.env.INTAKE_EVAL_PRICE_OUT);
  if (Number.isFinite(priceIn) && Number.isFinite(priceOut)) {
    const usd = (summary.totalIn / 1e6) * priceIn + (summary.totalOut / 1e6) * priceOut;
    console.log(`    est. cost (USD)  $${usd.toFixed(6)} (in $${priceIn}/1M, out $${priceOut}/1M)`);
  } else {
    console.log(col("dim", "    (set INTAKE_EVAL_PRICE_IN / INTAKE_EVAL_PRICE_OUT for a USD estimate)"));
  }

  writeReportIfRequested(args, liveMarkdownReport({ args, providerKey, model, maxTokens, rows, summary }));

  console.log("");
  if (passed === summary.n) {
    console.log(
      col(
        "green",
        `✓ All ${summary.n} case(s) passed (schema, classification, signals, question budget, must_not_do, cost ceiling).`
      )
    );
    return 0;
  }
  console.log(col("red", `✗ ${summary.n - passed} of ${summary.n} case(s) failed.`));
  return 1;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp(), 0;

  const { cases: allCases, errors: loadErrors } = loadCases(args.file);
  const cases = Number.isInteger(args.limit) ? allCases.slice(0, args.limit) : allCases;

  if (args.dryRun) return runDry(cases, loadErrors, args);

  if (loadErrors.length) {
    console.error(col("red", "JSONL parse errors (run --dry-run for detail):"));
    loadErrors.forEach((e) => console.error("  " + e));
    return 1;
  }
  // schema must be valid before spending tokens
  let schemaErrors = [];
  cases.forEach((c, i) => (schemaErrors = schemaErrors.concat(validateCase(c, i))));
  if (schemaErrors.length) {
    console.error(col("red", "Schema errors (run --dry-run for detail):"));
    schemaErrors.forEach((e) => console.error("  " + e));
    return 1;
  }
  return runLive(cases, args);
}

main()
  .then((code) => process.exit(code || 0))
  .catch((e) => {
    console.error(col("red", "Error: ") + (e && e.stack ? e.stack : e));
    process.exit(1);
  });
