import { describe, expect, it } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { geobaseParams, mapboxParams, polygon, quadrants } from "./constants";

import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { LandCoverClassification } from "../src/models/land_cover_classification";
import { RawImage } from "@huggingface/transformers";

describe("test model geobase/land-cover-classification", () => {
  it("should process a polygon for land cover classification for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "land-cover-classification",
      geobaseParams
    );

    const results: any = await (instance as LandCoverClassification).inference(
      polygon
    );

    const { detections } = results;
    detections.forEach((detection: GeoJSON.FeatureCollection) => {
      expect(detection.type).toBe("FeatureCollection");
      expect(Array.isArray(detection.features)).toBe(true);
      const geoJsonString = JSON.stringify(detection);
      const encodedGeoJson = encodeURIComponent(geoJsonString);
      const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

      console.log(`View GeoJSON here: ${geojsonIoUrl}`);
    });

    // console.log(`View GeoJSON here: ${geojsonIoUrl}`);

    // Check basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("outputImage");
    expect(results).toHaveProperty("binaryMasks");

    // Check result types
    expect(Array.isArray(results.detections)).toBe(true);
    results.detections.forEach((detection: GeoJSON.FeatureCollection) => {
      expect(detection.type).toBe("FeatureCollection");
    });
    expect(results.outputImage).toBeInstanceOf(GeoRawImage);
    expect(Array.isArray(results.binaryMasks)).toBe(true);
    results.binaryMasks.forEach((mask: any) => {
      expect(mask).toBeInstanceOf(RawImage);
    });
  });
});
