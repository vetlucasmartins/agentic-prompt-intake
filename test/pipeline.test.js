"use strict";

const assert = require("assert");
const { AgenticIntakePipeline, processIngestion } = require("../index.js");

console.log("Running agentic-prompt-intake pipeline tests...");

const pipeline = new AgenticIntakePipeline({
  optimization: {
    enabled: true,
    maxTokens: 500,
    strategy: "local-first"
  }
});

const sampleInput = `
CONFIDENTIAL NOTICE: Do not share outside company network.
Sent from my iPhone

Rewrite the following specification for clarity and tone.
Rewrite the following specification for clarity and tone.

This is paragraph 1 of the specification.
`;

const res = pipeline.process(sampleInput);

assert.strictEqual(typeof res.rawInput, "string");
assert.strictEqual(typeof res.parsedInput.readiness, "string");
assert(res.optimization !== null, "Optimization result should be populated");
assert(res.optimization.originalTokens >= res.optimization.compressedTokens);
assert(!res.formattedOutput.includes("Sent from my iPhone"));
assert(res.formattedOutput.includes("agentic-intake:readiness"));

const resDisabled = processIngestion("Simple prompt", { optimization: { enabled: false } });
assert.strictEqual(resDisabled.optimization, null);
assert(resDisabled.formattedOutput.includes("Simple prompt"));

console.log("✓ All agentic-prompt-intake pipeline tests passed cleanly!");
