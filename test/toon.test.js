"use strict";

const assert = require("assert");
const { encodeToon, AgenticIntakePipeline } = require("../index.js");

console.log("Running TOON token optimization tests for agentic-prompt-intake...");

// Test 1: Array of objects encoding (TOON tabular format)
const sampleDocs = [
  { id: "doc1", title: "Setup Guide", score: 0.95 },
  { id: "doc2", title: "API Reference", score: 0.88 }
];

const toonDocs = encodeToon(sampleDocs, "docs");
assert.strictEqual(
  toonDocs,
  "docs[2]{id,title,score}:\ndoc1,Setup Guide,0.95\ndoc2,API Reference,0.88",
  "TOON tabular encoding for array of objects failed"
);
console.log("✓ Test 1 passed: TOON tabular array of objects encoding");

// Test 2: Nested Object encoding
const sampleBrief = {
  intent: "Optimize prompt token consumption",
  score: 90,
  assumptions: ["Fast execution", "Zero dependencies"]
};

const toonBrief = encodeToon(sampleBrief, "brief");
assert.ok(toonBrief.includes("intent: Optimize prompt token consumption"), "TOON key-value formatting failed");
assert.ok(toonBrief.includes("assumptions[2]:"), "TOON array header failed");
assert.ok(toonBrief.includes("- Fast execution"), "TOON array item failed");
console.log("✓ Test 2 passed: TOON key-value & primitive array encoding");

// Test 3: AgenticIntakePipeline TOON format output
const pipeline = new AgenticIntakePipeline({ format: "toon" });
const result = pipeline.process("Update the build pipeline for production release");

assert.ok(result.formattedOutput.includes("readiness: READY_TO_EXECUTE"), "Pipeline TOON output missing readiness");
assert.ok(result.formattedOutput.includes("payload: Update the build pipeline for production release"), "Pipeline TOON output missing payload");
console.log("✓ Test 3 passed: AgenticIntakePipeline TOON integration");

console.log("All TOON unit tests passed successfully!");
