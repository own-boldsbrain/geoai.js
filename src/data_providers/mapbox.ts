import { bbox as turfBbox } from "@turf/bbox";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";
import { pointToTile, tileToBBox } from "global-mercator/index";
import { load_image, RawImage } from "@huggingface/transformers";
import { GeoRawImage } from "../types/images/GeoRawImage";

const addChain = (receiver: any) =>
  Object.defineProperty(receiver.prototype, "chain", {
    value: function (intercept: any) {
      let val = this.valueOf ? this.valueOf() : this;
      return intercept(val);
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });

[Object, String, Number, Boolean].map(receiver => {
  addChain(receiver);
});

const getTileUrlFromTileCoords = (tileCoords: any, accessToken: string) => {
  const [x, y, z] = tileCoords;
  return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${accessToken}`;
};

interface TileMetadata {
  image: RawImage;
  bbox: [number, number, number, number]; // [west, south, east, north]
}

interface MergedResult {
  image: RawImage;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface TileInfo {
  coords: [number, number];
  tile: [number, number, number];
  tileGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
}

interface TilesForBbox {
  bottomleft: TileInfo;
  bottomright: TileInfo;
  topleft: TileInfo;
  topright: TileInfo;
}

export class Mapbox {
  apiKey: string;
  style: string;

  constructor(apiKey: string, style: string) {
    this.apiKey = apiKey;
    this.style = style;
  }

  async get_image(polygon: any) {
    const bbox = turfBbox(polygon);
    let zoom = 20;
    // get tile for each of the 4 corners of the bbox

    let tiles = this.calculateTilesForBbox(bbox, zoom);

    // get number of tiles by each edge of the bbox
    let xTileNum =
      Math.abs(tiles.bottomleft.tile[0] - tiles.bottomright.tile[0]) + 1;
    let yTileNum =
      Math.abs(tiles.bottomleft.tile[1] - tiles.topleft.tile[1]) + 1;

    let featureCollection: any = {
      type: "FeatureCollection",
      features: new Set(),
    };

    while (xTileNum > 2 && yTileNum > 2) {
      zoom--;
      tiles = this.calculateTilesForBbox(bbox, zoom);
      xTileNum =
        Math.abs(tiles.bottomleft.tile[0] - tiles.bottomright.tile[0]) + 1;
      yTileNum = Math.abs(tiles.bottomleft.tile[1] - tiles.topleft.tile[1]) + 1;

      featureCollection.features.add(tiles.bottomleft.tileGeoJson);
      featureCollection.features.add(tiles.bottomright.tileGeoJson);
      featureCollection.features.add(tiles.topleft.tileGeoJson);
      featureCollection.features.add(tiles.topright.tileGeoJson);
    }
    // convert the features back to json
    const tileUrls = [
      tiles.bottomleft.tileGeoJson?.properties?.tileUrl,
      tiles.bottomright.tileGeoJson?.properties?.tileUrl,
      tiles.topright.tileGeoJson?.properties?.tileUrl,
      tiles.topleft.tileGeoJson?.properties?.tileUrl,
    ];

    // Load images and create metadata objects
    const tilesWithMetadata: TileMetadata[] = [
      {
        image: await load_image(tileUrls[0]),
        bbox: tiles.bottomleft.tileGeoJson.bbox as [
          number,
          number,
          number,
          number,
        ],
      },
      {
        image: await load_image(tileUrls[1]),
        bbox: tiles.bottomright.tileGeoJson.bbox as [
          number,
          number,
          number,
          number,
        ],
      },
      {
        image: await load_image(tileUrls[2]),
        bbox: tiles.topright.tileGeoJson.bbox as [
          number,
          number,
          number,
          number,
        ],
      },
      {
        image: await load_image(tileUrls[3]),
        bbox: tiles.topleft.tileGeoJson.bbox as [
          number,
          number,
          number,
          number,
        ],
      },
    ];

    const { image: mergedImage, bounds } =
      this.mergeRawImages(tilesWithMetadata);

    return GeoRawImage.fromRawImage(mergedImage, bounds, "EPSG:4326");
  }

  calculateTilesForBbox = (bbox: number[], zoom: number): TilesForBbox => {
    const getTileGeoJson = (bbox: any, zoom: number) => {
      const feature = turfBboxPolygon(tileToBBox(pointToTile(bbox, zoom)));
      feature.properties = {
        tileCoords: pointToTile(bbox, zoom),
        tileUrl: getTileUrlFromTileCoords(pointToTile(bbox, zoom), this.apiKey),
      };
      return feature;
    };
    return {
      bottomleft: {
        coords: [bbox[0], bbox[1]],
        tile: pointToTile([bbox[0], bbox[1]], zoom),
        tileGeoJson: getTileGeoJson([bbox[0], bbox[1]], zoom),
      },
      bottomright: {
        coords: [bbox[2], bbox[1]],
        tile: pointToTile([bbox[2], bbox[1]], zoom),
        tileGeoJson: getTileGeoJson([bbox[2], bbox[1]], zoom),
      },
      topleft: {
        coords: [bbox[0], bbox[3]],
        tile: pointToTile([bbox[0], bbox[3]], zoom),
        tileGeoJson: getTileGeoJson([bbox[0], bbox[3]], zoom),
      },
      topright: {
        coords: [bbox[2], bbox[3]],
        tile: pointToTile([bbox[2], bbox[3]], zoom),
        tileGeoJson: getTileGeoJson([bbox[2], bbox[3]], zoom),
      },
    };
  };

  mergeRawImages(tiles: TileMetadata[]): MergedResult {
    // Each image has the same dimensions and number of channels
    const tileWidth = tiles[0].image.width;
    const tileHeight = tiles[0].image.height;
    const channels = tiles[0].image.channels;

    // Final image dimensions (2x2 grid)
    const finalWidth = tileWidth * 2;
    const finalHeight = tileHeight * 2;
    const finalData = new Uint8ClampedArray(
      finalWidth * finalHeight * channels
    );

    // Helper function to copy a single tile into the final image
    function copyTileToFinalImage(
      source: Uint8ClampedArray | Uint8Array,
      dest: Uint8ClampedArray,
      offsetX: number,
      offsetY: number
    ) {
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          const sourceIndex = (y * tileWidth + x) * channels;
          const destIndex =
            ((offsetY + y) * finalWidth + (offsetX + x)) * channels;

          for (let c = 0; c < channels; c++) {
            dest[destIndex + c] = source[sourceIndex + c];
          }
        }
      }
    }

    // Place each tile in the 2x2 grid
    copyTileToFinalImage(tiles[0].image.data, finalData, 0, tileHeight); // Bottom-left
    copyTileToFinalImage(tiles[1].image.data, finalData, tileWidth, tileHeight); // Bottom-right
    copyTileToFinalImage(tiles[2].image.data, finalData, tileWidth, 0); // Top-right
    copyTileToFinalImage(tiles[3].image.data, finalData, 0, 0); // Top-left

    // Calculate combined bounds
    const bounds = {
      north: Math.max(...tiles.map(t => t.bbox[1])),
      south: Math.min(...tiles.map(t => t.bbox[3])),
      east: Math.max(...tiles.map(t => t.bbox[2])),
      west: Math.min(...tiles.map(t => t.bbox[0])),
    };

    return {
      image: new RawImage(finalData, finalWidth, finalHeight, channels),
      bounds,
    };
  }
}
