import {
  ProviderParams,
  ObjectDetectionResults,
  SegmentationResults,
} from "@/core/types";

// Core agent types
export interface AgentInput {
  polygon: GeoJSON.Feature;
  objective?: string;
  constraints?: string[];
  options?: Record<string, any>;
}

export interface AgentResult {
  summary: string;
  confidence: number;
  findings: AgentFinding[];
  recommendations: string[];
  reasoning: string[];
  rawResults: any[];
  executionTime: number;
}

export interface AgentFinding {
  type: string;
  description: string;
  confidence: number;
  location?: GeoJSON.Feature;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  sessionId: string;
  objective: string;
  constraints: string[];
  polygon: GeoJSON.Feature;
  providerParams: ProviderParams;
  findings: Map<string, any>;
  decisions: DecisionRecord[];
  startTime: number;
}

export interface DecisionRecord {
  step: string;
  decision: string;
  reasoning: string;
  timestamp: number;
  confidence: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "model" | "decision" | "parallel" | "custom";

  // For model steps
  task?: string;
  modelId?: string;

  // For decision steps
  condition?: (context: AgentContext) => boolean;
  ifTrue?: string | string[];
  ifFalse?: string | string[];

  // For parallel steps
  steps?: string[];

  // For custom steps
  execute?: (context: AgentContext) => Promise<any>;

  // Common properties
  description?: string;
  required?: boolean;
  timeout?: number;
}

export interface AgentConfig {
  name: string;
  description: string;
  objective: string;
  workflow: WorkflowStep[];
  defaultConstraints?: string[];
  timeout?: number;
}

export interface ExecutionPlan {
  steps: WorkflowStep[];
  estimatedTime: number;
  requiredModels: string[];
}

// Model execution result types
export type ModelResult = ObjectDetectionResults | SegmentationResults;

// Re-export the base agent class
export type { GeoAIAgent } from "./base-agent";
