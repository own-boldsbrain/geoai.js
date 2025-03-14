import { RawImage, load_image } from "@huggingface/transformers"; // Replace with actual image library
import * as hub from "@huggingface/hub";
import { describe, expect, it } from "vitest";

import * as ort from "onnxruntime-web";
import { geobaseAi } from "../src/geobase-ai";
import { geobaseParams, mapboxParams, polygon } from "./constants";
import { iouPoly } from "../src/utils/gghl/polyiou"; // Ensure the file exists at this path

describe("test model geobase/gghl-oriented-object-detection", () => {
  it.skip("testing inference", async () => {
    const modelPath = await hub.downloadFile({
      repo: "geobase/gghl-oriented-object-detection",
      path: "onnx/model.onnx",
    });
    console.log({ modelPath });
    const session = await ort.InferenceSession.create(
      "/home/shoaib/scratch/code/GGHL/weights/model.onnx"
    );
    // const session = await ort.InferenceSession.create(modelPath?.url);

    let image = await load_image(
      "/home/shoaib/scratch/code/geobase-ai.js/merged-geobase.png"
    );
    image = await image.resize(800, 800);
    const floatData = Float32Array.from(image.data);
    const inputs = {
      input: new ort.Tensor(floatData, [1, 3, image.height, image.width]),
    };

    const results = await session.run(inputs);

    console.log(results);
  });
  it("should process a polygon for object detection for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams,
      "/home/shoaib/scratch/code/GGHL/weights/model_quant.onnx"
    );

    const results: any = await instance.detection(polygon);

    const geoJsonString = JSON.stringify(results.detections);
    const encodedGeoJson = encodeURIComponent(geoJsonString);
    const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

    console.log(`View GeoJSON here: ${geojsonIoUrl}`);

    // // Check basic properties
    // expect(results).toHaveProperty("detections");
    // expect(results).toHaveProperty("geoRawImage");

    // // Check result types
    // expect(results.detections.type).toBe("FeatureCollection");
    // expect(Array.isArray(results.detections.features)).toBe(true);
    // expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  });
});

describe("iouPoly", () => {
  it("should return correct IoU for two identical squares", () => {
    const p = [0, 0, 1, 0, 1, 1, 0, 1];
    const q = [0, 0, 1, 0, 1, 1, 0, 1];
    const result = iouPoly(p, q);
    console.log({ result });
    expect(result).toBeCloseTo(1.0, 5);
  });

  it("should return correct IoU for two non-overlapping squares", () => {
    const p = [0, 0, 1, 0, 1, 1, 0, 1];
    const q = [2, 2, 3, 2, 3, 3, 2, 3];
    const result = iouPoly(p, q);
    console.log({ result });
    expect(result).toBeCloseTo(0.0, 5);
  });

  it("should return correct IoU for two partially overlapping squares", () => {
    const p = [0, 0, 2, 0, 2, 2, 0, 2];
    const q = [1, 1, 3, 1, 3, 3, 1, 3];
    const result = iouPoly(p, q);
    console.log({ result });
    expect(result).toBeCloseTo(1 / 7, 5);
  });
});
