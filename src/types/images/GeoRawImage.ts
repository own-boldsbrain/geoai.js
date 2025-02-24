import { RawImage } from "@huggingface/transformers";

interface Bounds {
  north: number; // max latitude
  south: number; // min latitude
  east: number; // max longitude
  west: number; // min longitude
}

interface Transform {
  // Affine transformation matrix components
  a: number; // x scale
  b: number; // y skew
  c: number; // x offset
  d: number; // x skew
  e: number; // y scale
  f: number; // y offset
}

export class GeoRawImage extends RawImage {
  private bounds: Bounds;
  private transform: Transform;
  private crs: string;

  constructor(
    data: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    channels: 1 | 2 | 3 | 4,
    bounds: Bounds,
    transform: Transform,
    crs: string = "EPSG:4326" // Default to WGS84
  ) {
    super(data, width, height, channels);
    this.bounds = bounds;
    this.transform = transform;
    this.crs = crs;
  }

  /**
   * Convert pixel coordinates to world coordinates
   */
  pixelToWorld(x: number, y: number): [number, number] {
    const worldX =
      this.transform.a * x + this.transform.b * y + this.transform.c;
    const worldY =
      this.transform.d * x + this.transform.e * y + this.transform.f;
    return [worldX, worldY];
  }

  /**
   * Convert world coordinates to pixel coordinates
   */
  worldToPixel(lon: number, lat: number): [number, number] {
    // Inverse transform
    const det =
      this.transform.a * this.transform.e - this.transform.b * this.transform.d;
    const x =
      (this.transform.e * (lon - this.transform.c) -
        this.transform.b * (lat - this.transform.f)) /
      det;
    const y =
      (-this.transform.d * (lon - this.transform.c) +
        this.transform.a * (lat - this.transform.f)) /
      det;
    return [Math.round(x), Math.round(y)];
  }

  /**
   * Get the bounds of the image
   */
  getBounds(): Bounds {
    return { ...this.bounds };
  }

  /**
   * Get the CRS of the image
   */
  getCRS(): string {
    return this.crs;
  }

  /**
   * Create a new GeoRawImage from a RawImage and georeferencing information
   */
  static fromRawImage(
    rawImage: RawImage,
    bounds: Bounds,
    transform: Transform, // TODO: let's calculate this from the rawimage width and height and bounds
    crs: string = "EPSG:4326"
  ): GeoRawImage {
    return new GeoRawImage(
      rawImage.data,
      rawImage.width,
      rawImage.height,
      rawImage.channels as 1 | 2 | 3 | 4,
      bounds,
      transform,
      crs
    );
  }

  /**
   * Override the clone method to include georeferencing information
   */
  override clone(): GeoRawImage {
    return new GeoRawImage(
      this.data.slice(),
      this.width,
      this.height,
      this.channels,
      { ...this.bounds },
      { ...this.transform },
      this.crs
    );
  }
}
