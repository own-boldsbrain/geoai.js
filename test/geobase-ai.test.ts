import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { GenericSegmentation } from "../src/models/generic_segmentation";
import type { MapboxParams } from "../src/geobase-ai";

describe("geobase-ai", () => {
  it("should be an object", () => {
    expect(geobaseAi).toBeInstanceOf(Object);
  });

  it("should have a function called tasks", () => {
    expect(geobaseAi.tasks).toBeInstanceOf(Function);
  });

  it("should have a function called models", () => {
    expect(geobaseAi.models).toBeInstanceOf(Function);
  });

  it("calling the models function should return an array of model metadata", () => {
    expect(geobaseAi.models()).toBeInstanceOf(Array);
  });
});

describe("geobaseAi.pipeline", () => {
  const mapboxParams: MapboxParams = {
    provider: "mapbox",
    apiKey:
      "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
    style: "mapbox://styles/mapbox/satellite-v9",
  };

  it("should initialize a segmentation pipeline", async () => {
    const result = await geobaseAi.pipeline("mask-generation", mapboxParams);

    expect(result.instance).toBeInstanceOf(GenericSegmentation);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    const result2 = await geobaseAi.pipeline("mask-generation", mapboxParams);

    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for segmentation", async () => {
    const { instance } = await geobaseAi.pipeline(
      "mask-generation",
      mapboxParams
    );

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

    const result = await instance.segment(polygon);

    // Check basic properties
    ["best_fitting_tile_uri", "embeddings", "masks"].forEach(prop => {
      expect(result).toHaveProperty(prop);
    });

    // Check embedding types
    ["image_embeddings", "image_positional_embeddings"].forEach(
      embeddingType => {
        const tensor = result.embeddings[embeddingType].ort_tensor;
        expect(tensor).toMatchObject({
          dataLocation: "cpu",
          type: "float32",
        });
        expect(tensor.cpuData).toBeInstanceOf(Float32Array);
        expect(tensor).toHaveProperty("dims");
        expect(tensor).toHaveProperty("size");
        expect(tensor.size).toBe(1048576);
        expect(tensor.dims).toEqual([1, 256, 64, 64]);
        expect(tensor.cpuData).toBeInstanceOf(Float32Array);
        expect(tensor.cpuData.length).toBe(1048576);
        expect(tensor.type).toBe("float32");
      }
    );
  });
});
