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

const getTileBbox = (lon: number, lat: number, z: number) => {
  z = Math.floor(z);
  const [x, y, _z] = pointToTile([lon, lat], z);
  const bbox = tileToBBox([x, y, z]);
  return {
    minX: bbox[0],
    minY: bbox[1],
    maxX: bbox[2],
    maxY: bbox[3],
  };
};

const getTileUrl = (
  lon: number,
  lat: number,
  z: number,
  accessToken: string
) => {
  z = Math.floor(z);
  const [x, y, _z] = pointToTile([lon, lat], z);
  return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${accessToken}`;
};

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

      featureCollection.features.add(
        JSON.stringify(tiles.bottomleft.tileGeoJson)
      );
      featureCollection.features.add(
        JSON.stringify(tiles.bottomright.tileGeoJson)
      );
      featureCollection.features.add(JSON.stringify(tiles.topleft.tileGeoJson));
      featureCollection.features.add(
        JSON.stringify(tiles.topright.tileGeoJson)
      );
    }
    // convert the features back to json
    let features = Array.from(featureCollection.features).map((feature: any) =>
      JSON.parse(feature)
    );
    const tileUrls = [
      tiles.bottomleft.tileGeoJson.properties.tileUrl,
      tiles.bottomright.tileGeoJson.properties.tileUrl,
      tiles.topright.tileGeoJson.properties.tileUrl,
      tiles.topleft.tileGeoJson.properties.tileUrl,
    ];

    // Add before creating tilesWithMetadata
    console.log("Tile bboxes:");
    console.log("bottomleft:", tiles.bottomleft.tileGeoJson.bbox);
    console.log("bottomright:", tiles.bottomright.tileGeoJson.bbox);
    console.log("topright:", tiles.topright.tileGeoJson.bbox);
    console.log("topleft:", tiles.topleft.tileGeoJson.bbox);

    // Load images and create metadata objects
    const tilesWithMetadata: TileMetadata[] = [
      {
        image: await load_image(tileUrls[0]),
        bbox: tiles.bottomleft.tileGeoJson.bbox,
      },
      {
        image: await load_image(tileUrls[1]),
        bbox: tiles.bottomright.tileGeoJson.bbox,
      },
      {
        image: await load_image(tileUrls[2]),
        bbox: tiles.topright.tileGeoJson.bbox,
      },
      {
        image: await load_image(tileUrls[3]),
        bbox: tiles.topleft.tileGeoJson.bbox,
      },
    ];

    const { image: mergedImage, bounds } =
      this.mergeRawImages(tilesWithMetadata);

    console.log("bounds", bounds);

    // Add after bounds calculation
    console.log("Individual north values:", [
      tiles.bottomleft.tileGeoJson.bbox[3],
      tiles.bottomright.tileGeoJson.bbox[3],
      tiles.topright.tileGeoJson.bbox[3],
      tiles.topleft.tileGeoJson.bbox[3],
    ]);
    console.log("Individual south values:", [
      tiles.bottomleft.tileGeoJson.bbox[1],
      tiles.bottomright.tileGeoJson.bbox[1],
      tiles.topright.tileGeoJson.bbox[1],
      tiles.topleft.tileGeoJson.bbox[1],
    ]);

    // Calculate transform matrix
    const transform = {
      a: (bounds.east - bounds.west) / mergedImage.width,
      b: 0,
      c: bounds.west,
      d: 0,
      e: -(bounds.north - bounds.south) / mergedImage.height,
      f: bounds.north,
    };

    return GeoRawImage.fromRawImage(
      mergedImage,
      bounds,
      transform,
      "EPSG:4326"
    );
  }

  calculateTilesForBbox = (bbox: any, zoom: number) => {
    console.log("Input bbox for tile calculation:", bbox);
    console.log("Zoom level:", zoom);
    console.log("bbox", bbox);
    let _bbox1 = tileToBBox(pointToTile([bbox[0], bbox[1]], zoom));
    console.log("_bbox1", _bbox1);
    let _bbox2 = tileToBBox(pointToTile([bbox[2], bbox[1]], zoom));
    console.log("_bbox2", _bbox2);
    let _bbox3 = tileToBBox(pointToTile([bbox[0], bbox[3]], zoom));
    console.log("_bbox3", _bbox3);
    let _bbox4 = tileToBBox(pointToTile([bbox[2], bbox[3]], zoom));
    console.log("_bbox4", _bbox4);
    return {
      bottomleft: {
        coords: [bbox[0], bbox[1]],
        tile: pointToTile([bbox[0], bbox[1]], zoom),
        tileGeoJson: turfBboxPolygon(
          tileToBBox(pointToTile([bbox[0], bbox[1]], zoom))
        ).chain(feature => {
          feature.properties = {
            tileCoords: pointToTile([bbox[0], bbox[1]], zoom),
            tileUrl: getTileUrlFromTileCoords(
              pointToTile([bbox[0], bbox[1]], zoom),
              this.apiKey
            ),
          };
          return feature;
        }),
      },
      bottomright: {
        coords: [bbox[2], bbox[1]],
        tile: pointToTile([bbox[2], bbox[1]], zoom),
        tileGeoJson: turfBboxPolygon(
          tileToBBox(pointToTile([bbox[2], bbox[1]], zoom))
        ).chain(feature => {
          feature.properties = {
            tileCoords: pointToTile([bbox[2], bbox[1]], zoom),
            tileUrl: getTileUrlFromTileCoords(
              pointToTile([bbox[2], bbox[1]], zoom),
              this.apiKey
            ),
          };
          return feature;
        }),
      },
      topleft: {
        coords: [bbox[0], bbox[3]],
        tile: pointToTile([bbox[0], bbox[3]], zoom),
        tileGeoJson: turfBboxPolygon(
          tileToBBox(pointToTile([bbox[0], bbox[3]], zoom))
        ).chain(feature => {
          feature.properties = {
            tileCoords: pointToTile([bbox[0], bbox[3]], zoom),
            tileUrl: getTileUrlFromTileCoords(
              pointToTile([bbox[0], bbox[3]], zoom),
              this.apiKey
            ),
          };
          return feature;
        }),
      },
      topright: {
        coords: [bbox[2], bbox[3]],
        tile: pointToTile([bbox[2], bbox[3]], zoom),
        tileGeoJson: turfBboxPolygon(
          tileToBBox(pointToTile([bbox[2], bbox[3]], zoom))
        ).chain(feature => {
          feature.properties = {
            tileCoords: pointToTile([bbox[2], bbox[3]], zoom),
            tileUrl: getTileUrlFromTileCoords(
              pointToTile([bbox[2], bbox[3]], zoom),
              this.apiKey
            ),
          };
          return feature;
        }),
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
      north: Math.max(...tiles.map(t => t.bbox[3])),
      south: Math.min(...tiles.map(t => t.bbox[1])),
      east: Math.max(...tiles.map(t => t.bbox[2])),
      west: Math.min(...tiles.map(t => t.bbox[0])),
    };

    return {
      image: new RawImage(finalData, finalWidth, finalHeight, channels),
      bounds,
    };
  }
}
