import { describe, expect, it } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import {
  geobaseParamsSolarPanel,
  mapboxParams,
  polygonSolarPannel,
} from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { SolarPanelDetection } from "../src/models/geoai_models";

describe("test model solar pannel detection", () => {
  it("should initialize a solar panel detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(SolarPanelDetection);
  });

  it("should reuse the same instance for the same model", async () => {
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
  it("should process a polygon for solar pannel detection for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "solar-panel-detection",
      geobaseParamsSolarPanel
    );

    const results: any = await (instance as SolarPanelDetection).inference(
      polygonSolarPannel
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
