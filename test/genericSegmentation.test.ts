import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { GenericSegmentation } from "../src/models/generic_segmentation";
import { mapboxParams, quadrants } from "./constants";
import { maskToGeoJSON } from "../src/utils/utils";

describe("geobaseAi.genericSegmentation", () => {
  it("should initialize a segmentation pipeline", async () => {
    const result = await geobaseAi.pipeline("mask-generation", mapboxParams);
    expect(result.instance).toBeInstanceOf(GenericSegmentation);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    const result2 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for segmentation and generate valid GeoJSON", async () => {
    const { instance } = await geobaseAi.pipeline(
      "mask-generation",
      mapboxParams
    );

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const input_points = [[[122, 190]]];
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

      const geoJsonString = JSON.stringify(maskGeoJson);
      const encodedGeoJson = encodeURIComponent(geoJsonString);
      const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

      console.log(`View GeoJSON here:`);
      console.log(geojsonIoUrl);
    }
  });
});
