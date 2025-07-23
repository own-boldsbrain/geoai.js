import {
  AgentInput,
  AgentResult,
  AgentContext,
  AgentConfig,
  ExecutionPlan,
  WorkflowStep,
} from "./types";
import { WorkflowEngine } from "./workflow-engine";
import { ProviderParams } from "@/core/types";

export abstract class GeoAIAgent {
  protected config: AgentConfig;
  protected workflowEngine: WorkflowEngine;

  constructor(config: AgentConfig) {
    this.config = config;
    this.workflowEngine = new WorkflowEngine();
  }

  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  get objective(): string {
    return this.config.objective;
  }

  /**
   * Main entry point - analyze an area with the agent's expertise
   */
  async analyze(
    input: AgentInput,
    providerParams: ProviderParams
  ): Promise<AgentResult> {
    const startTime = Date.now();

    // Create execution context
    const context = this.createContext(input, providerParams, startTime);

    try {
      // Plan the execution
      const plan = await this.plan(context);

      // Execute the workflow
      const results = await this.workflowEngine.execute(plan.steps, context);

      // Generate final result
      const agentResult = await this.synthesizeResult(context, results);

      return {
        ...agentResult,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `Agent execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create execution plan based on input and context
   */
  async plan(_context: AgentContext): Promise<ExecutionPlan> {
    // Default implementation uses the configured workflow
    const steps = this.config.workflow;

    return {
      steps,
      estimatedTime: this.estimateExecutionTime(steps),
      requiredModels: this.extractRequiredModels(steps),
    };
  }

  /**
   * Create execution context for this run
   */
  protected createContext(
    input: AgentInput,
    providerParams: ProviderParams,
    startTime: number
  ): AgentContext {
    return {
      sessionId: this.generateSessionId(),
      objective: input.objective || this.config.objective,
      constraints: input.constraints || this.config.defaultConstraints || [],
      polygon: input.polygon,
      providerParams,
      findings: new Map(),
      decisions: [],
      startTime,
    };
  }

  /**
   * Synthesize final result from workflow execution
   */
  protected async synthesizeResult(
    context: AgentContext,
    results: any[]
  ): Promise<Omit<AgentResult, "executionTime">> {
    // Default implementation - subclasses should override for domain-specific synthesis

    return {
      summary: await this.generateSummary(context, results),
      confidence: this.calculateConfidence(context, results),
      findings: this.extractFindings(results),
      recommendations: await this.generateRecommendations(context, results),
      reasoning: context.decisions.map(d => d.reasoning),
      rawResults: results,
    };
  }

  /**
   * Generate human-readable summary
   */
  protected async generateSummary(
    _context: AgentContext,
    results: any[]
  ): Promise<string> {
    // Default implementation
    return `Analysis completed for ${this.name}. Found ${results.length} results.`;
  }

  /**
   * Calculate overall confidence score
   */
  protected calculateConfidence(
    context: AgentContext,
    _results: any[]
  ): number {
    // Default implementation - average confidence of all decisions
    const confidences = context.decisions.map(d => d.confidence);
    return confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.5;
  }

  /**
   * Extract findings from raw results
   */
  protected extractFindings(results: any[]): any[] {
    // Default implementation - subclasses should override
    return results.map((result, index) => ({
      type: "general-finding",
      description: `Finding ${index + 1}`,
      confidence: 0.8,
      metadata: result,
    }));
  }

  /**
   * Generate actionable recommendations
   */
  protected async generateRecommendations(
    _context: AgentContext,
    _results: any[]
  ): Promise<string[]> {
    // Default implementation - subclasses should override
    return ["Review analysis results", "Consider additional data sources"];
  }

  /**
   * Estimate execution time for workflow steps
   */
  protected estimateExecutionTime(steps: WorkflowStep[]): number {
    // Simple estimation - 10 seconds per model step, 1 second per decision
    return steps.reduce((time, step) => {
      switch (step.type) {
        case "model":
          return time + 10000; // 10 seconds
        case "parallel":
          return time + 15000; // 15 seconds for parallel execution
        default:
          return time + 1000; // 1 second
      }
    }, 0);
  }

  /**
   * Extract required models from workflow
   */
  protected extractRequiredModels(steps: WorkflowStep[]): string[] {
    const models = new Set<string>();

    steps.forEach(step => {
      if (step.type === "model" && step.task) {
        models.add(step.task);
      }
    });

    return Array.from(models);
  }

  /**
   * Generate unique session ID
   */
  protected generateSessionId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
