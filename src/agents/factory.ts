import { GeoAIAgent } from "./core/base-agent";
import { AgentConfig } from "./core/types";
import { SiteAnalysisAgent } from "./personas/site-analysis-agent";

// Registry of available agent types
const AGENT_REGISTRY = new Map<string, () => GeoAIAgent>([
  ["site-analysis", () => new SiteAnalysisAgent()],
]);

/**
 * Create an agent by name
 */
export function createAgent(name: string): GeoAIAgent {
  const agentFactory = AGENT_REGISTRY.get(name);

  if (!agentFactory) {
    throw new Error(
      `Unknown agent type: ${name}. Available agents: ${Array.from(AGENT_REGISTRY.keys()).join(", ")}`
    );
  }

  return agentFactory();
}

/**
 * Get an agent instance (alias for createAgent)
 */
export function getAgent(name: string): GeoAIAgent {
  return createAgent(name);
}

/**
 * List available agents
 */
export function listAvailableAgents(): string[] {
  return Array.from(AGENT_REGISTRY.keys());
}

/**
 * Register a new agent type
 */
export function registerAgent(name: string, factory: () => GeoAIAgent): void {
  AGENT_REGISTRY.set(name, factory);
}

/**
 * Create a custom agent from configuration
 */
export function createCustomAgent(config: AgentConfig): GeoAIAgent {
  // For now, we'll create a basic agent implementation
  // In the future, this could be more sophisticated
  class CustomAgent extends GeoAIAgent {
    constructor() {
      super(config);
    }
  }

  return new CustomAgent();
}
