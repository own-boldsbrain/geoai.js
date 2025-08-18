import { GeobaseParams, ProviderParams } from "@geobase.js/geoai";

export const ESRI_CONFIG = {
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

export const MAPBOX_CONFIG = {
  provider: "mapbox" as const,
  apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "test",
  style: "mapbox://styles/mapbox/satellite-v9",
};


export const GITHUB_REPO_URI = "https://github.com/decision-labs/geobase.js";
export const GITHUB_REPO_NAME = "decision-labs/geobase.js";
export const NPM_PACKAGE_NAME = "@geobase.js/geoai";
export const NPM_PACKAGE_URI = "https://www.npmjs.com/package/@geobase.js/geoai";