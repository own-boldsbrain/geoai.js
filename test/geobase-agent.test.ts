import { describe } from "vitest";
import { it, vi, beforeEach, afterEach } from "vitest";
import { queryAgent } from "../src/geobase-agent";
import { mapboxParams } from "./constants";

// Mock the geoai module
vi.mock("../src/index", () => ({
  geoai: {
    models: () => [
      {
        task: "land-cover-classification",
        description: "Classify land cover types",
        examples: ["What are the green areas on this map?"],
        geobase_ai_pipeline: () => ({
          modelId: "geobase/land-cover-classification",
        }),
      },
      {
        task: "building-detection",
        description: "Detect buildings in satellite imagery",
        examples: ["Can you highlight the buildings in this region?"],
        geobase_ai_pipeline: () => ({ modelId: "geobase/building-detection" }),
      },
      {
        task: "mask-generation",
        description: "Generate masks for objects",
        examples: ["Show me the roads in this area."],
        geobase_ai_pipeline: () => ({ modelId: "geobase/mask-generation" }),
      },
      {
        task: "wetland-segmentation",
        description: "Segment wetlands",
        examples: ["Identify the water bodies in this region."],
        geobase_ai_pipeline: () => ({
          modelId: "geobase/wetland-segmentation",
        }),
      },
      {
        task: "zero-shot-object-detection",
        description: "Detect objects without training",
        examples: ["Identify the wind turbines in this region."],
        geobase_ai_pipeline: () => ({
          modelId: "geobase/zero-shot-object-detection",
        }),
      },
      {
        task: "object-detection",
        description: "Detect objects in imagery",
        examples: ["Detect all trucks in this urban area."],
        geobase_ai_pipeline: () => ({ modelId: "geobase/object-detection" }),
      },
      {
        task: "solar-panel-detection",
        description: "Detect solar panels",
        examples: ["Find all solar panels in this industrial area."],
        geobase_ai_pipeline: () => ({
          modelId: "geobase/solar-panel-detection",
        }),
      },
      {
        task: "ship-detection",
        description: "Detect ships",
        examples: ["Detect all ships in this harbor."],
        geobase_ai_pipeline: () => ({ modelId: "geobase/ship-detection" }),
      },
      {
        task: "car-detection",
        description: "Detect cars",
        examples: ["Find all cars in this parking lot."],
        geobase_ai_pipeline: () => ({ modelId: "geobase/car-detection" }),
      },
      {
        task: "oil-storage-tank-detection",
        description: "Detect oil storage tanks",
        examples: ["Find all oil storage tanks in this refinery."],
        geobase_ai_pipeline: () => ({
          modelId: "geobase/oil-storage-tank-detection",
        }),
      },
      {
        task: "building-footprint-segmentation",
        description: "Segment building footprints",
        examples: ["Segment building footprints in this city block."],
        geobase_ai_pipeline: () => ({
          modelId: "geobase/building-footprint-segmentation",
        }),
      },
    ],
    pipeline: vi.fn().mockResolvedValue({
      inference: vi.fn().mockResolvedValue({ detections: { features: [] } }),
    }),
  },
}));

describe("queryAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should select the correct task and return formatted response", async () => {
    const testCases = [
      {
        query: "What are the green areas on this map?",
        expected: "land-cover-classification",
      },
      {
        query: "Can you highlight the buildings in this region?",
        expected: "building-detection",
      },
      {
        query: "Show me the roads in this area.",
        expected: "mask-generation",
      },
      {
        query: "Can you categorize this area by land use?",
        expected: "land-cover-classification",
      },
      {
        query: "Which parts of this map are parks?",
        expected: "mask-generation",
      },
      {
        query: "Can you find the residential areas here?",
        expected: "land-cover-classification",
      },
      {
        query: "Where are the commercial zones in this map?",
        expected: "land-cover-classification",
      },
      {
        query: "Identify the water bodies in this region.",
        expected: "wetland-segmentation",
      },
      {
        query: "Can you show me the industrial areas on this map?",
        expected: "building-detection",
      },
      {
        query: "Identify the wind turbines in this region.",
        expected: "zero-shot-object-detection",
      },
      // object-detection
      {
        query: "Detect all trucks in this urban area.",
        expected: "object-detection",
      },
      {
        query: "Find cars and motorcycles in this highway image.",
        expected: "object-detection",
      },
      {
        query: "Identify buildings in this industrial zone.",
        expected: "building-detection",
      },
      // zero-shot-object-detection
      {
        query: "Find all aircraft in this satellite image.",
        expected: "zero-shot-object-detection",
      },
      {
        query: "Locate wind turbines in this region.",
        expected: "zero-shot-object-detection",
      },
      {
        query: "Identify train stations along this railway.",
        expected: "zero-shot-object-detection",
      },
      // mask-generation
      {
        query: "Segment all forests in this region.",
        expected: "mask-generation",
      },
      {
        query: "Identify all lakes in this satellite image.",
        expected: "mask-generation",
      },
      {
        query: "Find large solar farms in this desert area.",
        expected: "mask-generation",
      },
      // solar-panel-detection
      {
        query: "Find all solar panels in this industrial area.",
        expected: "solar-panel-detection",
      },
      {
        query: "Locate solar farms in this desert region.",
        expected: "solar-panel-detection",
      },
      // ship-detection
      {
        query: "Detect all ships in this harbor.",
        expected: "ship-detection",
      },
      {
        query: "Find boats in this coastal image.",
        expected: "ship-detection",
      },
      // car-detection
      {
        query: "Find all cars in this parking lot.",
        expected: "car-detection",
      },
      {
        query: "Detect vehicles on this highway.",
        expected: "car-detection",
      },
      // wetland-segmentation
      {
        query: "Segment all wetlands in this region.",
        expected: "wetland-segmentation",
      },
      {
        query: "Identify marsh areas in this satellite image.",
        expected: "wetland-segmentation",
      },
      // building-detection
      {
        query: "Detect all buildings in this urban area.",
        expected: "building-detection",
      },
      {
        query: "Find houses in this rural region.",
        expected: "building-detection",
      },
      // oil-storage-tank-detection
      {
        query: "Find all oil storage tanks in this refinery.",
        expected: "oil-storage-tank-detection",
      },
      {
        query: "Detect tanks in this port facility.",
        expected: "oil-storage-tank-detection",
      },
      // building-footprint-segmentation
      {
        query: "Segment building footprints in this city block.",
        expected: "building-footprint-segmentation",
      },
      {
        query: "Identify the outlines of all buildings in this image.",
        expected: "building-footprint-segmentation",
      },
    ];

    for (const { query, expected } of testCases) {
      const result = await queryAgent(query, mapboxParams);
      const returned = result.task;
      // ANSI color codes
      const green = "\x1b[32m";
      const red = "\x1b[31m";
      const yellow = "\x1b[33m";
      const reset = "\x1b[0m";
      const match = returned === expected;
      console.log(
        `${yellow}Query:${reset} ${query}\n` +
          `${green}Expected:${reset} ${expected}\n` +
          `${match ? green : red}Returned:${reset} ${returned}\n` +
          `${match ? green + "✔ Match" : red + "✘ Mismatch"}${reset}\n---`
      );
    }
  });
});
