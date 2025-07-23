// This is a simple example/test file to demonstrate agent usage
// Remove this file once proper tests are in place

import { createAgent } from "./factory";
import { ProviderParams } from "@/core/types";

// Example usage of the site analysis agent
export async function testSiteAnalysisAgent() {
  console.log("🤖 Testing Site Analysis Agent");

  // Create the agent
  const agent = createAgent("site-analysis");
  console.log(`Agent created: ${agent.name} - ${agent.description}`);

  // Example polygon (small area for testing)
  const testPolygon: GeoJSON.Feature = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-122.4194, 37.7749], // San Francisco coordinates
          [-122.4194, 37.7759],
          [-122.4184, 37.7759],
          [-122.4184, 37.7749],
          [-122.4194, 37.7749],
        ],
      ],
    },
    properties: {},
  };

  // Example provider params (would need real API keys)
  const providerParams: ProviderParams = {
    provider: "geobase",
    apikey: "test-key",
    cogImagery: "test-imagery",
    projectRef: "test-project",
  };

  try {
    // Run the analysis
    console.log("🔍 Starting site analysis...");

    const result = await agent.analyze(
      {
        polygon: testPolygon,
        objective: "Assess site for development potential",
        constraints: ["avoid wetlands", "consider budget constraints"],
      },
      providerParams
    );

    console.log("✅ Analysis complete!");
    console.log("📊 Results:");
    console.log(`- Summary: ${result.summary}`);
    console.log(`- Confidence: ${Math.round(result.confidence * 100)}%`);
    console.log(`- Findings: ${result.findings.length} items`);
    console.log(`- Recommendations: ${result.recommendations.length} items`);
    console.log(`- Execution time: ${result.executionTime}ms`);

    return result;
  } catch (error) {
    console.error("❌ Agent test failed:", error);
    throw error;
  }
}

// Example of listing available agents
export function listAgents() {
  console.log("📋 Available agents:");
  const agents = require("./factory").listAvailableAgents();
  agents.forEach((name: string) => {
    const agent = createAgent(name);
    console.log(`- ${name}: ${agent.description}`);
  });
}
