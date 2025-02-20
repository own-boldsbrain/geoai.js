import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { GenericSegmentation } from "../src/models/generic_segmentation";
import {
  ObjectDectection,
  ObjectDetectionResults,
  ZeroShotObjectDetection,
} from "../src/models/zero_shot_object_detection";
import { ObjectDetection } from "../src/models/object_detection";
import type { MapboxParams } from "../src/geobase-ai";
import { detectionsToGeoJSON, maskToGeoJSON } from "../src/utils/utils"; // Adjust the import path as necessary
import { GeoRawImage } from "../src/types/images/GeoRawImage";
// before all tests set the polygon
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

const mapboxParams: MapboxParams = {
  provider: "mapbox",
  apiKey:
    "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
  style: "mapbox://styles/mapbox/satellite-v9",
};

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

    const input_points = [[[120, 190]]];

    const result = await instance.segment(polygon, input_points);

    // Check basic properties
    ["geoRawImage", "masks"].forEach(prop => {
      expect(result).toHaveProperty(prop);
    });

    const { geoRawImage, masks } = result;
    const maskGeoJson = maskToGeoJSON(masks, geoRawImage);
    expect(maskGeoJson).toHaveProperty("type", "FeatureCollection");
    expect(maskGeoJson).toHaveProperty("features");
    expect(maskGeoJson.features).toBeInstanceOf(Array);
  });
});

describe("geobaseAi.zeroShotObjectDetection", () => {
  it("should initialize a zero-shot object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );

    expect(result.instance).toBeInstanceOf(ZeroShotObjectDetection);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );
    const result2 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for object detection using onnx-community/grounding-dino-tiny-ONNX", async () => {
    const { instance } = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "onnx-community/grounding-dino-tiny-ONNX"
      // { model_file_name: "model_quantized", cache_dir: "./cache" }
    );

    const text = ["tree."];

    const results: ObjectDetectionResults = await instance.detection(
      polygon,
      text
    );

    let result = results;

    // model can potentially return an array if multiple images are processed
    if (Array.isArray(results)) result = results[0];

    // Check basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("geoRawImage");

    // Check result types
    expect(results.detections).toBeInstanceOf(Array<ObjectDectection>);
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  });

  it("should process a polygon for object detection using Xennova/owlvit-base-patch32", async () => {
    const { instance } = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );

    const text = ["tree", "car", "vehicle", "building", "road", "person"];

    const results: ObjectDetectionResults = await instance.detection(
      polygon,
      text
    );

    let result = results;
    // model can potentially return an array if multiple images are processed
    if (Array.isArray(results)) result = results[0];

    // Check basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("geoRawImage");

    // Check result types
    expect(results.detections).toBeInstanceOf(Array<ObjectDectection>);
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  });
});

describe("geobaseAi.objectDetection", () => {
  it("should initialize a object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "mhassanch/WALDO30_yolov8m_640x640"
    );

    expect(result.instance).toBeInstanceOf(ObjectDetection);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "mhassanch/WALDO30_yolov8m_640x640"
    );
    const result2 = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "mhassanch/WALDO30_yolov8m_640x640"
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for object detection", async () => {
    const { instance } = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams
    );

    const results: ObjectDetectionResults = await instance.detection(polygon);
    const geoJson = detectionsToGeoJSON(
      results.detections,
      results.geoRawImage
    );

    // Check basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("geoRawImage");

    // Check result types
    expect(results.detections).toBeInstanceOf(Array<ObjectDectection>);
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  });
});
