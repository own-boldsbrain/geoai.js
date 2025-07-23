import { useState, useCallback, useRef } from "react";
import { GeoAIAgent } from "../agents/core/base-agent";
import { AgentResult, AgentInput } from "../agents/core/types";
import { createAgent } from "../agents/factory";
import { ProviderParams } from "@/core/types";

export interface UseGeoAIAgentReturn {
  // State
  agent: GeoAIAgent | null;
  isAnalyzing: boolean;
  result: AgentResult | null;
  error: string | null;

  // Actions
  initializeAgent: (agentName: string) => void;
  runAnalysis: (
    input: AgentInput,
    providerParams: ProviderParams
  ) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * React hook for using GeoAI agents
 */
export function useGeoAIAgent(): UseGeoAIAgentReturn {
  const [agent, setAgent] = useState<GeoAIAgent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use ref to prevent stale closure issues
  const agentRef = useRef<GeoAIAgent | null>(null);

  const initializeAgent = useCallback((agentName: string) => {
    try {
      const newAgent = createAgent(agentName);
      setAgent(newAgent);
      agentRef.current = newAgent;
      setError(null);

      console.log(`[useGeoAIAgent] Initialized agent: ${newAgent.name}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize agent";
      setError(errorMessage);
      console.error("[useGeoAIAgent] Agent initialization failed:", err);
    }
  }, []);

  const runAnalysis = useCallback(
    async (input: AgentInput, providerParams: ProviderParams) => {
      const currentAgent = agentRef.current;

      if (!currentAgent) {
        setError("No agent initialized. Please initialize an agent first.");
        return;
      }

      if (isAnalyzing) {
        console.warn("[useGeoAIAgent] Analysis already in progress");
        return;
      }

      setIsAnalyzing(true);
      setError(null);
      setResult(null);

      try {
        console.log(
          `[useGeoAIAgent] Starting analysis with ${currentAgent.name}`
        );

        const analysisResult = await currentAgent.analyze(
          input,
          providerParams
        );

        setResult(analysisResult);
        console.log("[useGeoAIAgent] Analysis completed successfully");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Analysis failed";
        setError(errorMessage);
        console.error("[useGeoAIAgent] Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isAnalyzing]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setAgent(null);
    agentRef.current = null;
    setIsAnalyzing(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    agent,
    isAnalyzing,
    result,
    error,
    initializeAgent,
    runAnalysis,
    clearError,
    reset,
  };
}

/**
 * Specialized hook for quick agent analysis
 */
export function useQuickAgent(agentName: string) {
  const agentHook = useGeoAIAgent();

  // Auto-initialize the agent
  useState(() => {
    agentHook.initializeAgent(agentName);
  });

  const quickAnalyze = useCallback(
    async (
      polygon: GeoJSON.Feature,
      providerParams: ProviderParams,
      options: {
        objective?: string;
        constraints?: string[];
      } = {}
    ) => {
      await agentHook.runAnalysis(
        {
          polygon,
          objective: options.objective,
          constraints: options.constraints,
        },
        providerParams
      );
    },
    [agentHook]
  );

  return {
    ...agentHook,
    quickAnalyze,
  };
}
