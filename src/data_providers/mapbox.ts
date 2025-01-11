import { pointToTile } from "global-mercator";
import { bbox as turfBbox } from "@turf/bbox";
import { center as turfCenter } from "@turf/center";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";

import { pointToTile, tileToBBox } from "global-mercator";

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

export class Mapbox {
  apiKey: string;
  style: string;

  constructor(apiKey: string, style: string) {
    this.apiKey = apiKey;
    this.style = style;
  }

  get_image_uri(polygon: any) {
    const bbox = turfBbox(polygon);
    const bboxGeoJSON = turfBboxPolygon(bbox);
    const center = turfCenter(bboxGeoJSON);
    const zoom = 14;
    const tile = pointToTile(center.geometry.coordinates, zoom);
    //TODO: the style isn't being explicity used here figure out the relation between the style and the tile uri
    const url = `https://api.mapbox.com/v4/mapbox.satellite/${tile[2]}/${tile[0]}/${tile[1]}.png?access_token=${this.apiKey}`;
    return url;
  }
}
