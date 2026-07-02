// @ts-check
import fs from "node:fs";
import path from "node:path";

function finiteNumbers(values) {
  return values.filter((value) => typeof value === "number" && Number.isFinite(value));
}

function average(values) {
  const nums = finiteNumbers(values);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function percent(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "0%";
}

function percentile(values, p) {
  const nums = finiteNumbers(values);
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function activationRank(cls) {
  if (cls === "READY_TO_EXECUTE") return 0;
  if (cls === "NEEDS_LIGHT_REFINEMENT") return 1;
  if (cls === "NEEDS_INTAKE") return 2;
  return null;
}

function overIntakeCandidate(row) {
  const expected = activationRank(row.expected);
  const actual = activationRank(row.classification);
  return expected !== null && actual !== null && actual > expected;
}

function underIntakeCandidate(row) {
  const expected = activationRank(row.expected);
  const actual = activationRank(row.classification);
  if (row.expected === "BLOCKED") return row.classification && row.classification !== "BLOCKED";
  return expected !== null && actual !== null && actual < expected;
}

export function summarizeIds(rows) {
  return rows.length ? rows.map((row) => row.id).join(", ") : "none";
}

export function summarizeLiveRows(rows, classes, ceilingFor, passed) {
  const n = rows.length;
  const questionCounts = finiteNumbers(rows.map((row) => row.numQuestions));
  const classificationCorrect = rows.filter((row) => row.classification === row.expected).length;
  const overRows = rows.filter(overIntakeCandidate);
  const underRows = rows.filter(underIntakeCandidate);

  return {
    n,
    passed,
    passRate: percent(passed, n),
    classificationCorrect,
    classificationAccuracy: percent(classificationCorrect, n),
    totalIn: rows.reduce((sum, row) => sum + (row.inputTokens || 0), 0),
    totalOut: rows.reduce((sum, row) => sum + (row.outputTokens || 0), 0),
    avgOutputTokens: Math.round(average(rows.map((row) => row.outputTokens))),
    p95OutputTokens: percentile(rows.map((row) => row.outputTokens), 95),
    avgQuestions: questionCounts.length ? average(questionCounts).toFixed(2) : "0.00",
    overRows,
    underRows,
    byClass: classes.map((cls) => {
      const classRows = rows.filter((row) => row.expected === cls);
      const classQuestions = finiteNumbers(classRows.map((row) => row.numQuestions));
      return {
        classification: cls,
        cases: classRows.length,
        avgOutputTokens: Math.round(average(classRows.map((row) => row.outputTokens))),
        p95OutputTokens: percentile(classRows.map((row) => row.outputTokens), 95),
        avgQuestions: classQuestions.length ? average(classQuestions).toFixed(2) : "0.00",
        ceiling: ceilingFor(cls),
      };
    }),
  };
}

function markdownEscape(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(markdownEscape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdownEscape).join(" | ")} |`),
  ].join("\n");
}

export function writeMarkdownReport(target, root, markdown) {
  if (!target || !target.trim()) return null;
  const abs = path.isAbsolute(target) ? target : path.join(root, target);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, markdown, "utf8");
  return abs.startsWith(root + path.sep) ? path.relative(root, abs) : abs;
}

export function dryRunMarkdownReport({ args, rows, errors }) {
  return [
    "# Intake Eval Dry-Run Report",
    "",
    `- Generated: ${new Date().toISOString()}`,
    "- Mode: dry-run (no network, no model calls)",
    `- Cases file: ${args.file}`,
    `- Cases checked: ${rows.length}`,
    `- Result: ${errors.length ? "FAIL" : "PASS"}`,
    "",
    "Dry-run validates JSONL shape and static cost-guard expectations. It does not produce live model metrics.",
    "",
    markdownTable(
      ["case", "expected", "result", "notes"],
      rows.map((row) => [row.id, row.expected || "?", row.pass ? "PASS" : "FAIL", row.errors.join("; ") || "-"])
    ),
    "",
    `Summary: ${rows.filter((row) => row.pass).length}/${rows.length} case(s) passed static validation.`,
  ].join("\n") + "\n";
}

export function liveMarkdownReport({ args, providerKey, model, maxTokens, rows, summary }) {
  return [
    "# Intake Eval Report",
    "",
    `- Generated: ${new Date().toISOString()}`,
    "- Mode: live model eval",
    `- Provider: ${providerKey}`,
    `- Model: ${model}`,
    `- Cases file: ${args.file}`,
    `- Max tokens per call: ${maxTokens}`,
    "- Harness: one call per case, no tools, temperature 0",
    "",
    "## Summary",
    "",
    markdownTable(
      ["metric", "value"],
      [
        ["cases passed", `${summary.passed}/${summary.n} (${summary.passRate})`],
        ["classification accuracy", `${summary.classificationCorrect}/${summary.n} (${summary.classificationAccuracy})`],
        ["tokens in/out", `${summary.totalIn} / ${summary.totalOut}`],
        ["avg output tokens", summary.avgOutputTokens],
        ["p95 output tokens", summary.p95OutputTokens],
        ["avg questions", summary.avgQuestions],
        ["over-intake candidates", `${summary.overRows.length} (${summarizeIds(summary.overRows)})`],
        ["under-intake candidates", `${summary.underRows.length} (${summarizeIds(summary.underRows)})`],
      ]
    ),
    "",
    "## By Expected Class",
    "",
    markdownTable(
      ["expected class", "cases", "avg output tokens", "p95 output tokens", "ceiling", "avg questions"],
      summary.byClass.map((row) => [
        row.classification,
        row.cases,
        row.avgOutputTokens,
        row.p95OutputTokens,
        row.ceiling,
        row.avgQuestions,
      ])
    ),
    "",
    "## Cases",
    "",
    markdownTable(
      ["case", "expected", "actual", "questions", "input tokens", "output tokens", "result"],
      rows.map((row) => [
        row.id,
        row.expected,
        row.classification || (row.error ? "ERR" : "?"),
        row.numQuestions ?? "-",
        row.inputTokens ?? "-",
        row.outputTokens ?? "-",
        row.checks.every((ch) => ch.pass) ? "PASS" : "FAIL",
      ])
    ),
  ].join("\n") + "\n";
}
