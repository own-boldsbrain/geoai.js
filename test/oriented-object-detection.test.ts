import { RawImage, load_image } from "@huggingface/transformers"; // Replace with actual image library
import * as hub from "@huggingface/hub";
import { describe, expect, it } from "vitest";

import * as ort from "onnxruntime-web";
import { geobaseAi } from "../src/geobase-ai";
import { geobaseParams, mapboxParams, polygon } from "./constants";

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
