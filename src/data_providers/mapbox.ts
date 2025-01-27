import { bbox as turfBbox } from "@turf/bbox";
import { center as turfCenter } from "@turf/center";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";
import { booleanWithin as turfBooleanWithin } from "@turf/boolean-within";
import { area as turfArea } from "@turf/area";
import { pointToTile, tileToBBox } from "global-mercator/index";
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

  get_image_uri(polygon: any) {
    const bbox = turfBbox(polygon);
    console.log(bbox);
    let zoom = 20;
    // get tile for each of the 4 corners of the bbox

    let tiles = this.calculateTilesForBbox(bbox, zoom);

    // get number of tiles by each edge of the bbox
    let xTileNum =
      Math.abs(tiles.bottomleft.tile[0] - tiles.bottomright.tile[0]) + 1;
    let yTileNum =
      Math.abs(tiles.bottomleft.tile[1] - tiles.topleft.tile[1]) + 1;
    console.log(xTileNum, yTileNum);
    // while xTileNum < 2 || yTileNum < 2

    let featureCollection: any = {
      type: "FeatureCollection",
      features: new Set(),
    };

    while (xTileNum > 1 || yTileNum > 1) {
      zoom--;
      tiles = this.calculateTilesForBbox(bbox, zoom);
      xTileNum =
        Math.abs(tiles.bottomleft.tile[0] - tiles.bottomright.tile[0]) + 1;
      yTileNum = Math.abs(tiles.bottomleft.tile[1] - tiles.topleft.tile[1]) + 1;
      console.log(zoom, xTileNum, yTileNum);
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
    console.log(xTileNum, yTileNum);
    // convert the features back to json
    let features = Array.from(featureCollection.features).map(feature =>
      JSON.parse(feature)
    );
    console.log(
      JSON.stringify({
        type: "FeatureCollection",
        features: features.reverse(),
      })
    );
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
}
