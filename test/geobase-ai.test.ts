import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { GenericSegmentation } from "../src/models/generic_segmentation";

describe("geobase-ai", () => {
  it("should be an object", () => {
    expect(geobaseAi).toBeInstanceOf(Object);
  });

  // it should have a function called tasks
  it("should have a function called tasks", () => {
    expect(geobaseAi.tasks).toBeInstanceOf(Function);
  });

  // add test for models
  it("should have a function called models", () => {
    expect(geobaseAi.models).toBeInstanceOf(Function);
  });

  // calling the models function should return an array of model metadata
  it("calling the models function should return an array of model metadata", () => {
    expect(geobaseAi.models()).toBeInstanceOf(Array);
  });
});

describe("geobaseAi.pipeline", () => {
  it("should accept task name and imagery source as parameters", async () => {
    const result = await geobaseAi.pipeline("mask-generation", "mapbox", {
      apiKey: "1234567890",
      style: "mapbox://styles/mapbox/satellite-v9",
    });

    expect(result).toBeInstanceOf(GenericSegmentation);
    const polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    };
    expect(result.segment(polygon)).toBeInstanceOf(Promise);
  });
});
