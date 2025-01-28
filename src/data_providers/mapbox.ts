import { bbox as turfBbox } from "@turf/bbox";
import { center as turfCenter } from "@turf/center";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";
import { booleanWithin as turfBooleanWithin } from "@turf/boolean-within";
import { area as turfArea } from "@turf/area";
import { pointToTile, tileToBBox } from "global-mercator/index";
import { load_image, RawImage } from "@huggingface/transformers";
const addChain = receiver =>
  Object.defineProperty(receiver.prototype, "chain", {
    value: function (intercept) {
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

    while (xTileNum > 2 || yTileNum > 2) {
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
    let features = Array.from(featureCollection.features).map(feature =>
      JSON.parse(feature)
    );
    const tileUrls = [
      tiles.bottomleft.tileGeoJson.properties.tileUrl,
      tiles.bottomright.tileGeoJson.properties.tileUrl,
      tiles.topright.tileGeoJson.properties.tileUrl,
      tiles.topleft.tileGeoJson.properties.tileUrl,
    ];

    // load the images from the tile urls and merge them in the correct order
    const images = await Promise.all(
      tileUrls.map(tileUrl => load_image(tileUrl))
    );
    const mergedImage = await this.mergeRawImages(images);
    return mergedImage;
  }

  calculateTilesForBbox = (bbox: any, zoom: number) => {
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

  // Function to merge images into one large image
  mergeRawImages(rawImages: RawImage[]) {
    // Each image has the same dimensions and number of channels
    const tileWidth = rawImages[0].width;
    const tileHeight = rawImages[0].height;
    const channels = rawImages[0].channels;

    // Final image dimensions (2x2 grid)
    const finalWidth = tileWidth * 2; // 2 tiles wide
    const finalHeight = tileHeight * 2; // 2 tiles tall
    const finalData = new Uint8ClampedArray(
      finalWidth * finalHeight * channels
    );

    // Helper function to copy a single tile into the final image
    function copyTileToFinalImage(source, dest, offsetX, offsetY) {
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          const sourceIndex = (y * tileWidth + x) * channels;
          const destIndex =
            ((offsetY + y) * finalWidth + (offsetX + x)) * channels;

          // Copy each channel (R, G, B) from source to destination
          for (let c = 0; c < channels; c++) {
            dest[destIndex + c] = source[sourceIndex + c];
          }
        }
      }
    }

    // Place each tile in the 2x2 grid
    copyTileToFinalImage(rawImages[0].data, finalData, 0, tileHeight); // Bottom-left
    copyTileToFinalImage(rawImages[1].data, finalData, tileWidth, tileHeight); // Bottom-right
    copyTileToFinalImage(rawImages[2].data, finalData, tileWidth, 0); // Top-right
    copyTileToFinalImage(rawImages[3].data, finalData, 0, 0); // Top-left

    // Return the merged image as a new RawImage
    return new RawImage(finalData, finalWidth, finalHeight, channels);
  }
}
