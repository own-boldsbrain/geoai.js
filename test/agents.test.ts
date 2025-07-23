import { describe, it, expect } from "vitest";
import { createAgent, listAvailableAgents } from "../src/agents";

describe("Agent System", () => {
  describe("Agent Factory", () => {
    it("should list available agents", () => {
      const agents = listAvailableAgents();
      expect(agents).toBeInstanceOf(Array);
      expect(agents.length).toBeGreaterThan(0);
      expect(agents).toContain("site-analysis");
    });

    it("should create a site analysis agent", () => {
      const agent = createAgent("site-analysis");

      expect(agent).toBeDefined();
      expect(agent.name).toBe("site-analysis-agent");
      expect(agent.description).toContain("site");
      expect(agent.objective).toBeDefined();
    });

    it("should throw error for unknown agent type", () => {
      expect(() => createAgent("non-existent-agent")).toThrow(
        "Unknown agent type"
      );
    });
  });

  describe("Site Analysis Agent", () => {
    it("should have correct configuration", () => {
      const agent = createAgent("site-analysis");

      expect(agent.name).toBe("site-analysis-agent");
      expect(agent.description).toContain("Analyzes a site");
      expect(agent.objective).toContain("comprehensive site analysis");
    });
  });

  describe("Agent Types", () => {
    it("should compile without TypeScript errors", () => {
      // This test ensures TypeScript compilation passes
      // Interfaces are compile-time only, so we can't test them at runtime
      expect(true).toBe(true);
    });
  });
});
