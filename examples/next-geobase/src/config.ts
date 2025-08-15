import { GeobaseParams, ProviderParams } from "@geobase-js/geoai";

export const ESRI_CONFIG: ProviderParams = {
  provider: "esri" as const,
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery",
  tileSize: 256,
  attribution: "ESRI World Imagery",
};

export const GEOBASE_CONFIG : GeobaseParams = {
  provider: "geobase" as const,
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF ?? "",
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY ?? "",
  cogImagery: "",
};

export const MAPBOX_CONFIG: ProviderParams = {
  provider: "mapbox" as const,
  apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "test",
  style: "mapbox://styles/mapbox/satellite-v9",
};

export const TMS_CONFIG: ProviderParams = {
  provider: "tms" as const,
  baseUrl: "https://apps.kontur.io/raster-tiler/oam/mosaic",
  extension: "png",
  attribution: "OpenAerialMap",
  apiKey: process.env.NEXT_PUBLIC_TMS_API_KEY || "",
};