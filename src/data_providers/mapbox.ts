import { bbox as turfBbox } from "@turf/bbox";
import { GeoRawImage } from "../types/images/GeoRawImage";
import { calculateTilesForBbox, getImageFromTiles } from "./common";

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

export class Mapbox {
  apiKey: string;
  style: string;

  constructor(apiKey: string, style: string) {
    this.apiKey = apiKey;
    this.style = style;
  }

  getTileUrlFromTileCoords = (tileCoords: any, instance: Mapbox) => {
    const [x, y, z] = tileCoords;
    return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${instance.apiKey}`;
  };

  async getImage(polygon: any, zoomLevel?: number): Promise<GeoRawImage> {
    const bbox = turfBbox(polygon);

    let zoom = 20;

    if (zoomLevel) {
      const tilesGrid = calculateTilesForBbox(
        bbox,
        this.getTileUrlFromTileCoords,
        zoomLevel,
        this
      );
      return await getImageFromTiles(tilesGrid);
    }

    let tilesGrid = calculateTilesForBbox(
      bbox,
      this.getTileUrlFromTileCoords,
      zoom,
      this
    );

    let xTileNum = tilesGrid[0].length;
    let yTileNum = tilesGrid.length;

    while (
      (xTileNum > 2 && yTileNum > 2) ||
      (xTileNum === 1 && yTileNum === 1 && zoom > 22) ||
      (xTileNum > 2 && yTileNum > 1) ||
      (xTileNum > 1 && yTileNum > 2)
    ) {
      zoom--;
      tilesGrid = calculateTilesForBbox(
        bbox,
        this.getTileUrlFromTileCoords,
        zoom,
        this
      );
      xTileNum = tilesGrid[0].length;
      yTileNum = tilesGrid.length;
    }

    // tilesGrid = calculateTilesForBbox(
    //   bbox,
    //   this.getTileUrlFromTileCoords,
    //   zoom + 1,
    //   this
    // );
    return await getImageFromTiles(tilesGrid);
  }
}
