import { CompressionResult, LccOptions } from 'local-context-compiler';

export interface AgenticIntakeOptimizationConfig {
  enabled: boolean;
  maxTokens?: number;
  strategy?: 'local-first' | 'truncation' | 'summarization';
}

export interface AgenticIntakeConfig {
  optimization?: AgenticIntakeOptimizationConfig;
  model?: string;
  defaultTaskType?: string;
  format?: 'markdown' | 'toon' | 'json';
}

export type ReadinessClassification =
  | 'READY_TO_EXECUTE'
  | 'NEEDS_LIGHT_REFINEMENT'
  | 'NEEDS_INTAKE'
  | 'BLOCKED';

export interface ParsedIntake {
  intent: string;
  readiness: ReadinessClassification;
  questions: string[];
  assumptions: string[];
  readinessScore: number;
  ambiguityScore: number;
}

export interface IngestionResult {
  rawInput: string;
  parsedInput: ParsedIntake;
  optimization?: {
    compressedText: string;
    originalTokens: number;
    compressedTokens: number;
    savedTokens: number;
    savingsPercentage: number;
    strategyUsed: string;
  };
  formattedOutput: string;
  meta: {
    engine: string;
    version: string;
    timestamp: string;
  };
}

export class AgenticIntakePipeline {
  constructor(config?: AgenticIntakeConfig);
  parseInput(rawInput: string): ParsedIntake;
  process(rawInput: string, context?: Record<string, any>): IngestionResult;
}

export function processIngestion(rawInput: string, config?: AgenticIntakeConfig): IngestionResult;
export function encodeToon(data: any, rootName?: string): string;

