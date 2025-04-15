import { describe, expect, it } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import {
  geobaseParamsWetLand,
  mapboxParams,
  polygonWetLand,
} from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { WetLandSegmentation } from "../src/models/geoai_models";

describe("test model geobase/wetland-detection", () => {
  it("should initialize a wetland detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "wetland-segmentation",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(WetLandSegmentation);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "wetland-segmentation",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "wetland-segmentation",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });
  it("should process a polygon for wetland detection for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "wetland-segmentation",
      geobaseParamsWetLand
    );

    const results: any = await (instance as WetLandSegmentation).inference(
      polygonWetLand
    );

    const geoJsonString = JSON.stringify(results.detections, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
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
