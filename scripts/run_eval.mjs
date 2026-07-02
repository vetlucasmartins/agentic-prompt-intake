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
 *     overall.
 *
 * The model is asked to emit the router JSON (schemas/intake-router.schema.json)
 * built from the canonical prompts (prompts/system-intake.md + intake-router.md),
 * so scoring is deterministic instead of parsing free-form prose.
 *
 * Zero dependencies: native `https` only, so it honors package.json engines
 * (node >=16) and does NOT require Node 18's global fetch.
 *
 * Usage:
 *   node scripts/run_eval.mjs --dry-run      # validate jsonl + static asserts, no network
 *   node scripts/run_eval.mjs                # run the cases against the model
 *   INTAKE_EVAL_PROVIDER=anthropic INTAKE_EVAL_MODEL=claude-haiku-4-5-20251001 \
 *     ANTHROPIC_API_KEY=sk-... node scripts/run_eval.mjs
 *
 * Env:
 *   INTAKE_EVAL_PROVIDER   anthropic (default) | openai
 *   INTAKE_EVAL_MODEL      model id (defaults per provider)
 *   INTAKE_EVAL_API_KEY    API key (falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY)
 *   INTAKE_EVAL_BASE_URL   override endpoint (advanced)
 *   INTAKE_EVAL_MAX_TOKENS hard max_tokens for the call (default 1024)
 *   INTAKE_EVAL_CEILING_<CLASS>  override the output-token ceiling for a class
 *   INTAKE_EVAL_PRICE_IN / INTAKE_EVAL_PRICE_OUT  USD per 1M tokens (optional $ estimate)
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CLASSES = ["READY_TO_EXECUTE", "NEEDS_LIGHT_REFINEMENT", "NEEDS_INTAKE", "BLOCKED"];

// Per-class output-token ceilings (cost regression guard). A READY case must
// stay tiny; a full NEEDS_INTAKE brief is allowed more room. Override via
// INTAKE_EVAL_CEILING_READY_TO_EXECUTE etc.
const DEFAULT_CEILINGS = {
  READY_TO_EXECUTE: 220,
  NEEDS_LIGHT_REFINEMENT: 380,
  NEEDS_INTAKE: 650,
  BLOCKED: 400,
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
  const a = { dryRun: false, file: "evals/intake-cases.jsonl", provider: null, model: null, limit: null, help: false };
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
  --help, -h           this help

${col("bold", "Env")}
  INTAKE_EVAL_PROVIDER, INTAKE_EVAL_MODEL, INTAKE_EVAL_API_KEY
  ANTHROPIC_API_KEY / OPENAI_API_KEY, INTAKE_EVAL_BASE_URL, INTAKE_EVAL_MAX_TOKENS
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

function ceilingFor(cls) {
  const env = process.env[`INTAKE_EVAL_CEILING_${cls}`];
  if (env && Number.isFinite(Number(env))) return Number(env);
  return DEFAULT_CEILINGS[cls] ?? 600;
}

function scoreCase(c, decision, usage) {
  const checks = [];
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

  // (f) cost ceiling (uses expected class so a misclassification doesn't hide cost regressions)
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
function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

// ---------------------------------------------------------------------------
// dry-run
// ---------------------------------------------------------------------------
function runDry(cases, loadErrors) {
  console.log(col("bold", "\nDry run — schema + static cost-guard asserts (no network)\n"));
  let errors = [...loadErrors];
  cases.forEach((c, i) => {
    const e = validateCase(c, i);
    errors = errors.concat(e);
    const ok = e.length === 0;
    console.log(`  ${ok ? PASS() : FAIL()}  ${pad(c.id || `case[${i}]`, 32)} ${col("dim", c.expected_classification || "?")}`);
    e.forEach((msg) => console.log(`        ${col("red", msg)}`));
  });
  console.log("");
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
  const outTokens = [];
  let totalIn = 0;
  let totalOut = 0;
  for (const row of rows) {
    const allPass = row.checks.every((ch) => ch.pass);
    if (allPass) passed++;
    totalIn += row.inputTokens || 0;
    totalOut += row.outputTokens || 0;
    if (row.outputTokens != null) outTokens.push(row.outputTokens);
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
  const n = rows.length;
  const accuracy = n ? ((passed / n) * 100).toFixed(0) : "0";
  const avgOut = outTokens.length ? Math.round(outTokens.reduce((a, b) => a + b, 0) / outTokens.length) : 0;
  const p95Out = percentile(outTokens, 95);
  console.log("\n" + col("bold", "  Summary"));
  console.log(`    cases passed     ${passed}/${n} (${accuracy}%)`);
  console.log(`    tokens (in/out)  ${totalIn} / ${totalOut}`);
  console.log(`    output avg / p95 ${avgOut} / ${p95Out}`);

  const priceIn = Number(process.env.INTAKE_EVAL_PRICE_IN);
  const priceOut = Number(process.env.INTAKE_EVAL_PRICE_OUT);
  if (Number.isFinite(priceIn) && Number.isFinite(priceOut)) {
    const usd = (totalIn / 1e6) * priceIn + (totalOut / 1e6) * priceOut;
    console.log(`    est. cost (USD)  $${usd.toFixed(6)} (in $${priceIn}/1M, out $${priceOut}/1M)`);
  } else {
    console.log(col("dim", "    (set INTAKE_EVAL_PRICE_IN / INTAKE_EVAL_PRICE_OUT for a USD estimate)"));
  }

  console.log("");
  if (passed === n) {
    console.log(col("green", `✓ All ${n} case(s) passed (classification, question budget, must_not_do, cost ceiling).`));
    return 0;
  }
  console.log(col("red", `✗ ${n - passed} of ${n} case(s) failed.`));
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

  if (args.dryRun) return runDry(cases, loadErrors);

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
