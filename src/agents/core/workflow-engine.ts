import { WorkflowStep, AgentContext, ModelResult } from "./types";
import { geoai } from "@/geobase-ai";

export class WorkflowEngine {
  /**
   * Execute a workflow of steps
   */
  async execute(steps: WorkflowStep[], context: AgentContext): Promise<any[]> {
    const results: any[] = [];

    for (const step of steps) {
      try {
        const result = await this.executeStep(step, context);
        results.push(result);

        // Store result in context for future steps
        context.findings.set(step.id, result);
      } catch (error) {
        console.error(`Step ${step.id} failed:`, error);

        if (step.required !== false) {
          throw new Error(
            `Required step ${step.id} failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }

        // Continue with null result for optional steps
        results.push(null);
        context.findings.set(step.id, null);
      }
    }

    return results;
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(step: WorkflowStep, context: AgentContext): Promise<any> {
    console.log(`[WorkflowEngine] Executing step: ${step.id} (${step.type})`);

    switch (step.type) {
      case "model":
        return this.executeModelStep(step, context);

      case "decision":
        return this.executeDecisionStep(step, context);

      case "parallel":
        return this.executeParallelStep(step, context);

      case "custom":
        return this.executeCustomStep(step, context);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute an AI model step
   */
  private async executeModelStep(
    step: WorkflowStep,
    context: AgentContext
  ): Promise<ModelResult> {
    if (!step.task) {
      throw new Error(`Model step ${step.id} missing task`);
    }

    console.log(`[WorkflowEngine] Running AI model: ${step.task}`);

    // Create pipeline for this specific task
    const pipeline = await geoai.pipeline(
      [
        {
          task: step.task,
          modelId: step.modelId,
        },
      ],
      context.providerParams
    );

    // Execute inference
    const result = await pipeline.inference({
      inputs: {
        polygon: context.polygon,
        // Add any step-specific inputs here
      },
      mapSourceParams: {
        zoomLevel: 18, // Default zoom level, could be configurable
      },
    });

    console.log(`[WorkflowEngine] Model ${step.task} completed`);
    return result;
  }

  /**
   * Execute a decision step
   */
  private async executeDecisionStep(
    step: WorkflowStep,
    context: AgentContext
  ): Promise<string> {
    if (!step.condition) {
      throw new Error(`Decision step ${step.id} missing condition`);
    }

    const conditionResult = step.condition(context);
    const nextStep = conditionResult ? step.ifTrue : step.ifFalse;

    // Record the decision
    const decision = {
      step: step.id,
      decision: conditionResult ? "true" : "false",
      reasoning:
        step.description || `Condition evaluated to ${conditionResult}`,
      timestamp: Date.now(),
      confidence: 0.9, // Default confidence for rule-based decisions
    };

    context.decisions.push(decision);

    console.log(
      `[WorkflowEngine] Decision ${step.id}: ${decision.decision} - ${decision.reasoning}`
    );

    return nextStep as string;
  }

  /**
   * Execute parallel steps
   */
  private async executeParallelStep(
    step: WorkflowStep,
    _context: AgentContext
  ): Promise<any[]> {
    if (!step.steps || step.steps.length === 0) {
      throw new Error(`Parallel step ${step.id} missing sub-steps`);
    }

    console.log(
      `[WorkflowEngine] Executing ${step.steps.length} steps in parallel`
    );

    // Note: This is a simplified parallel execution
    // In a real implementation, we'd want to find the actual step definitions
    const promises = step.steps.map(async stepId => {
      // For now, just return the stepId - this would be expanded to execute actual steps
      return { stepId, result: "parallel-execution-placeholder" };
    });

    const results = await Promise.all(promises);
    console.log(`[WorkflowEngine] Parallel execution completed`);

    return results;
  }

  /**
   * Execute a custom step
   */
  private async executeCustomStep(
    step: WorkflowStep,
    context: AgentContext
  ): Promise<any> {
    if (!step.execute) {
      throw new Error(`Custom step ${step.id} missing execute function`);
    }

    console.log(`[WorkflowEngine] Executing custom step: ${step.id}`);

    const result = await step.execute(context);

    console.log(`[WorkflowEngine] Custom step ${step.id} completed`);
    return result;
  }
}
