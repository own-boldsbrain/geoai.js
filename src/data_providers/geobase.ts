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

interface GeobaseConfig {
  projectRef: string;
  cogImagery: string;
  apikey: string;
}

export class Geobase {
  projectRef: string;
  cogImagery: string;
  apikey: string;

  constructor(config: GeobaseConfig) {
    this.projectRef = config.projectRef;
    this.cogImagery = config.cogImagery;
    this.apikey = config.apikey;
  }

  private getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Geobase
  ): string {
    const [x, y, z] = tileCoords;
    return `https://${instance.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/${z}/${x}/${y}?url=${instance.cogImagery}&apikey=${instance.apikey}`;
  }

  async getImage(polygon: any, zoomLevel?: number): Promise<GeoRawImage> {
    const bbox = turfBbox(polygon);

    let zoom = 22;

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
      xTileNum > 2 &&
      yTileNum > 2
      // (xTileNum === 1 && yTileNum === 1 && zoom > 22) ||
      // (xTileNum > 2 && yTileNum > 1) ||
      // (xTileNum > 1 && yTileNum > 2)
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

    // if require better quality image then un comment this code but it cause problem the resultant grid's columns and rows might not be equal

    // tilesGrid = calculateTilesForBbox(
    //   bbox,
    //   this.getTileUrlFromTileCoords,
    //   zoom + 1,
    //   this
    // );
    return await getImageFromTiles(tilesGrid);
  }
}
