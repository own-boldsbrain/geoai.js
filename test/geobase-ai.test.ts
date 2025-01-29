import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { GenericSegmentation } from "../src/models/generic_segmentation";
import {
  ObjectDetectionResults,
  ZeroShotObjectDetection,
} from "../src/models/zero_shot_object_detection";
import type { MapboxParams } from "../src/geobase-ai";
import type { Feature } from "geojson";
import { pipeline } from "@huggingface/transformers";
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

describe.skip("geobaseAi.pipeline", () => {
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
            [12.482802629103247, 41.885379230564524],
            [12.481392196198271, 41.885379230564524],
            [12.481392196198271, 41.884332326712524],
            [12.482802629103247, 41.884332326712524],
            [12.482802629103247, 41.885379230564524],
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

describe("geobaseAi.zeroShotObjectDetection", () => {
  const mapboxParams: MapboxParams = {
    provider: "mapbox",
    apiKey:
      "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
    style: "mapbox://styles/mapbox/satellite-v9",
  };

  it("should initialize a zero-shot object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(ZeroShotObjectDetection);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for object detection", async () => {
    const { instance } = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams
    );

    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        coordinates: [
          [
            [12.482802629103247, 41.885379230564524],
            [12.481392196198271, 41.885379230564524],
            [12.481392196198271, 41.884332326712524],
            [12.482802629103247, 41.884332326712524],
            [12.482802629103247, 41.885379230564524],
          ],
        ],
        type: "Polygon",
      },
    } as GeoJSON.Feature;

    const text = "tree.";

    const results: ObjectDetectionResults = await instance.detection(
      polygon,
      text
    );

    // loop over the results and check if the boxes are within the polygon
    const result = results[0];

    // Check basic properties
    expect(result).toHaveProperty("scores");
    expect(result).toHaveProperty("boxes");
    expect(result).toHaveProperty("labels");

    // Check result types
    expect(result.scores).toBeInstanceOf(Array);
    expect(result.boxes).toBeInstanceOf(Array);
    expect(result.labels).toBeInstanceOf(Array);

    // Check detection properties
    result.scores.forEach(score => {
      expect(typeof score).toBe("number");
    });

    result.boxes.forEach(box => {
      expect(box).toBeInstanceOf(Array);
      box.forEach(coordinate => {
        expect(typeof coordinate).toBe("number");
      });
    });

    result.labels.forEach(label => {
      expect(typeof label).toBe("string");
    });

    console.log(result);
  });
});

describe("geobaseAi.zeroShotObjectDetection with waldo model", () => {
  const mapboxParams: MapboxParams = {
    provider: "mapbox",
    apiKey:
      "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
    style: "mapbox://styles/mapbox/satellite-v9",
  };

  it("should initialize a zero-shot object detection pipeline", async () => {
    const detector = await pipeline("object-detection", "StephanST/WALDO30");

    const image =
      "https://content.satimagingcorp.com/static/galleryimages/high-resolution-satellite-photo-reliant.jpg";
    const output = await detector(image, { threshold: 0.9 });
    console.log(output);
  });
});
