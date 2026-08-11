"use strict";

/**
 * agentic-intake Core Pipeline & Middleware Interface
 * 
 * Pipeline flow:
 * Raw Input -> Agentic Intake Parsing/Validation -> lcc Local Optimization/Token Guardrail -> Formatted Output / LLM Dispatch
 */

let LccCompressor;
try {
  ({ LccCompressor } = require("local-context-compiler"));
} catch (e) {
  try {
    ({ LccCompressor } = require("../lcc/index.js"));
  } catch (e2) {
    try {
      ({ LccCompressor } = require("../LCC/lcc/index.js"));
    } catch (e3) {
      ({ LccCompressor } = require(require("path").resolve(__dirname, "../LCC/lcc/index.js")));
    }
  }
}

const PKG = require("./package.json");
const { encodeToon } = require("./lib/toon.js");

/**
 * Classifies raw intake prompt into protocol readiness state.
 */
function parseInput(rawInput) {
  const text = (rawInput || "").trim();
  if (!text) {
    return {
      intent: "Empty request",
      readiness: "BLOCKED",
      questions: ["Please provide a valid prompt or context."],
      assumptions: [],
      readinessScore: 0,
      ambiguityScore: 100
    };
  }

  const length = text.length;
  const wordCount = text.split(/\s+/).length;
  const hasQuestionMark = text.includes("?");

  let readiness = "READY_TO_EXECUTE";
  let questions = [];
  let assumptions = [];
  let readinessScore = 90;
  let ambiguityScore = 10;

  if (wordCount < 5 && !hasQuestionMark) {
    readiness = "NEEDS_LIGHT_REFINEMENT";
    assumptions.push(`Interpreted '${text}' as a request to analyze or summarize.`);
    readinessScore = 70;
    ambiguityScore = 30;
  } else if (text.toLowerCase().includes("maybe") || text.toLowerCase().includes("something with")) {
    readiness = "NEEDS_INTAKE";
    questions.push("What specific output format or primary goal do you require?");
    readinessScore = 40;
    ambiguityScore = 60;
  }

  return {
    intent: text.slice(0, 80) + (text.length > 80 ? "..." : ""),
    readiness,
    questions,
    assumptions,
    readinessScore,
    ambiguityScore
  };
}

class AgenticIntakePipeline {
  constructor(config = {}) {
    this.config = {
      model: config.model || "gpt-4.1",
      format: config.format || "markdown",
      optimization: {
        enabled: config.optimization ? config.optimization.enabled !== false : true,
        maxTokens: config.optimization ? config.optimization.maxTokens : undefined,
        strategy: (config.optimization && config.optimization.strategy) || "local-first"
      }
    };

    if (this.config.optimization.enabled) {
      this.compressor = new LccCompressor({
        model: this.config.model,
        strategy: this.config.optimization.strategy,
        maxTokens: this.config.optimization.maxTokens
      });
    }
  }

  parseInput(rawInput) {
    return parseInput(rawInput);
  }

  process(rawInput, extraContext = {}) {
    const parsed = parseInput(rawInput);
    let optimizationResult = null;
    let finalPayloadText = rawInput;

    if (this.config.optimization.enabled && this.compressor) {
      const lccRes = this.compressor.compress(rawInput);
      optimizationResult = {
        compressedText: lccRes.compressedText,
        originalTokens: lccRes.originalTokens,
        compressedTokens: lccRes.compressedTokens,
        savedTokens: lccRes.savedTokens,
        savingsPercentage: lccRes.savingsPercentage,
        strategyUsed: this.config.optimization.strategy
      };
      finalPayloadText = lccRes.compressedText;
    }

    const format = extraContext.format || this.config.format;
    let formattedOutput = "";

    if (format === "toon") {
      const toonPayload = {
        readiness: parsed.readiness,
        score: parsed.readinessScore,
        assumptions: parsed.assumptions,
        questions: parsed.questions,
        payload: finalPayloadText
      };
      formattedOutput = encodeToon(toonPayload, "intake");
    } else if (format === "json") {
      formattedOutput = JSON.stringify({
        readiness: parsed.readiness,
        score: parsed.readinessScore,
        assumptions: parsed.assumptions,
        questions: parsed.questions,
        payload: finalPayloadText
      });
    } else {
      // Default markdown format with header tags
      formattedOutput = [
        `<!-- agentic-intake:readiness status="${parsed.readiness}" score="${parsed.readinessScore}" -->`,
        parsed.assumptions.length ? `<!-- assumptions: ${parsed.assumptions.join("; ")} -->` : "",
        finalPayloadText
      ].filter(Boolean).join("\n\n");
    }

    return {
      rawInput,
      parsedInput: parsed,
      optimization: optimizationResult,
      formattedOutput,
      meta: {
        engine: "agentic-prompt-intake",
        version: PKG.version,
        timestamp: new Date().toISOString()
      }
    };
  }
}

function processIngestion(rawInput, config) {
  const pipeline = new AgenticIntakePipeline(config);
  return pipeline.process(rawInput);
}

module.exports = {
  AgenticIntakePipeline,
  processIngestion,
  parseInput,
  encodeToon
};

