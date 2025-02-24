import { describe, expect, it } from "vitest";
import { GeoRawImage } from "../../../src/types/images/GeoRawImage";
import { RawImage } from "@huggingface/transformers";

describe("GeoRawImage", () => {
  // Create a simple test image
  const width = 100;
  const height = 100;
  const channels = 3;
  const data = new Uint8ClampedArray(width * height * channels);

  const bounds = {
    north: 41.885379230564524,
    south: 41.884332326712524,
    east: 12.482802629103247,
    west: 12.481392196198271,
  };

  it("should create from RawImage", () => {
    const rawImage = new RawImage(data, width, height, channels);
    const geoImage = GeoRawImage.fromRawImage(rawImage, bounds);

    expect(geoImage).toBeInstanceOf(GeoRawImage);
    expect(geoImage.width).toBe(width);
    expect(geoImage.height).toBe(height);
    expect(geoImage.channels).toBe(channels);
  });

  it("should have correct bounds", () => {
    const geoImage = new GeoRawImage(data, width, height, channels, bounds);
    const imageBounds = geoImage.getBounds();

    expect(imageBounds).toEqual(bounds);
  });

  it("should correctly convert between pixel and world coordinates", () => {
    const geoImage = new GeoRawImage(data, width, height, channels, bounds);

    // Test center point conversion
    const centerPixel = [width / 2, height / 2];
    const [lon, lat] = geoImage.pixelToWorld(centerPixel[0], centerPixel[1]);
    const [x, y] = geoImage.worldToPixel(lon, lat);

    // Check that converting back and forth gives approximately the same coordinates
    expect(x).toBeCloseTo(centerPixel[0], 0);
    expect(y).toBeCloseTo(centerPixel[1], 0);

    // Test that coordinates are within bounds
    expect(lon).toBeGreaterThan(bounds.west);
    expect(lon).toBeLessThan(bounds.east);
    expect(lat).toBeGreaterThan(bounds.south);
    expect(lat).toBeLessThan(bounds.north);
  });

  it("should have the correct default CRS", () => {
    const geoImage = new GeoRawImage(data, width, height, channels, bounds);
    expect(geoImage.getCRS()).toBe("EPSG:4326");
  });

  it("should maintain georeferencing information when cloned", () => {
    const geoImage = new GeoRawImage(data, width, height, channels, bounds);
    const clonedImage = geoImage.clone();

    // Check that the clone is a GeoRawImage
    expect(clonedImage).toBeInstanceOf(GeoRawImage);

    // Check that bounds match
    expect(clonedImage.getBounds()).toEqual(geoImage.getBounds());

    // Check that CRS matches
    expect(clonedImage.getCRS()).toBe(geoImage.getCRS());

    // Check that coordinate conversion gives same results
    const [lon, lat] = geoImage.pixelToWorld(50, 50);
    const [clonedLon, clonedLat] = clonedImage.pixelToWorld(50, 50);
    expect(clonedLon).toBe(lon);
    expect(clonedLat).toBe(lat);
  });
});
