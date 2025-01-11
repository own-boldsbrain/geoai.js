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
      apiKey:
        "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
      style: "mapbox://styles/mapbox/satellite-v9",
    });

    expect(result).toBeInstanceOf(GenericSegmentation);
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        coordinates: [
          [
            [12.464671438808836, 41.89626288034978],
            [12.464671438808836, 41.87734089295918],
            [12.492452680977294, 41.87734089295918],
            [12.492452680977294, 41.89626288034978],
            [12.464671438808836, 41.89626288034978],
          ],
        ],
        type: "Polygon",
      },
    };
    expect(result.segment(polygon)).toBeInstanceOf(Promise);
    // has attribute embeddings
    // resolved promise should have a embeddings attribute
    const resolvedPromise = await result.segment(polygon);
    // it should have best_fitting_tile_uri
    expect(resolvedPromise).toHaveProperty("best_fitting_tile_uri");
    // expect(resolvedPromise.embeddings).toBeInstanceOf(Array);
    // // embeddings should have a length of 1
    // expect(resolvedPromise.embeddings.length).toBe(1);
    // // has attribute masks
    // expect(resolvedPromise).toHaveProperty("masks");
    // expect(resolvedPromise.masks).toBeInstanceOf(Array);
    // // masks should have a length of 1
    // expect(resolvedPromise.masks.length).toBe(1);
  });
});
