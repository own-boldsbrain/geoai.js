import { describe, expect, it } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { geobaseParamsShip, mapboxParams, polygonShip } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { ShipDetection } from "../src/models/geoai_models";

describe("test model geobase/ship-detection", () => {
  it.skip("should initialize a solar panel detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(ShipDetection);
  });

  it.skip("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });
  it("should process a polygon for ship detection for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "solar-panel-detection",
      geobaseParamsShip
    );

    const results: any = await (instance as ShipDetection).inference(
      polygonShip
    );

    const geoJsonString = JSON.stringify(results.detections);
    const encodedGeoJson = encodeURIComponent(geoJsonString);
    const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

    console.log(`View GeoJSON here: ${geojsonIoUrl}`);

    // Check basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("geoRawImage");

    // Check result types
    expect(results.detections.type).toBe("FeatureCollection");
    expect(Array.isArray(results.detections.features)).toBe(true);
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  });
});
