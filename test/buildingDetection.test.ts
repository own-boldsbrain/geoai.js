import { describe, expect, it } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import {
  geobaseParamsBuilding,
  mapboxParams,
  polygonBuilding,
} from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { BuildingDetection } from "../src/models/geoai_models";

describe("test model building detection", () => {
  it("should initialize a building detection pipeline", async () => {
    const result = await geobaseAi.pipeline("building-detection", mapboxParams);

    expect(result.instance).toBeInstanceOf(BuildingDetection);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "building-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "building-detection",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });
  it("should process a polygon for building detection for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "building-detection",
      geobaseParamsBuilding
    );

    const results: any = await (instance as BuildingDetection).inference(
      polygonBuilding
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
