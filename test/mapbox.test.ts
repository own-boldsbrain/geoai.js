import { describe, expect, it } from "vitest";
import { Mapbox } from "../src/data_providers/mapbox";
import { GeoRawImage } from "../src/types/images/GeoRawImage";

describe("Mapbox", () => {
  const mapbox = new Mapbox(
    "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
    "mapbox://styles/mapbox/satellite-v9"
  );

  const testPolygon = {
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

  it("should return a GeoRawImage when getting an image", async () => {
    const image = await mapbox.get_image(testPolygon);
    expect(image).toBeInstanceOf(GeoRawImage);
  });

  it("should return image with correct dimensions", async () => {
    const image = await mapbox.get_image(testPolygon);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(image.channels).toBe(3); // RGB image
  });

  it("should return image with bounds matching input polygon", async () => {
    const image = await mapbox.get_image(testPolygon);
    const bounds = image.getBounds();

    // calucated from the combined tiles in the mapbox.ts file
    const expectedBounds = {
      north: 41.885921,
      south: 41.883876,
      east: 12.483216,
      west: 12.480469,
    };
    expect(bounds.west).toBeCloseTo(expectedBounds.west, 6);
    expect(bounds.east).toBeCloseTo(expectedBounds.east, 6);
    expect(bounds.south).toBeCloseTo(expectedBounds.south, 6);
    expect(bounds.north).toBeCloseTo(expectedBounds.north, 6);
  });
});
