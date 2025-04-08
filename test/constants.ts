import { ProviderParams } from "../src/geobase-ai";

export const mapboxParams: ProviderParams = {
  provider: "mapbox",
  apiKey:
    "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
  style: "mapbox://styles/mapbox/satellite-v9",
};

export const geobaseParams: ProviderParams = {
  provider: "geobase",
  projectRef: "wmrosdnjsecywfkvxtrw",
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
};

export const geobaseParamsSolarPanel: ProviderParams = {
  provider: "geobase",
  projectRef: "wmrosdnjsecywfkvxtrw",
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/solar_panels_davis_ca.tif",
};

export const geobaseParamsShip: ProviderParams = {
  provider: "geobase",
  projectRef: "wmrosdnjsecywfkvxtrw",
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/ships_dubai.tif",
};

export const polygonShip = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [55.13443273773737, 25.1145182544451],
        [55.13443273773737, 25.112566269789895],
        [55.13567584776939, 25.112566269789895],
        [55.13567584776939, 25.1145182544451],
        [55.13443273773737, 25.1145182544451],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonSolarPannel = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-121.77483138694643, 38.55347243518358],
        [-121.77483138694643, 38.553215934463736],
        [-121.77421502202081, 38.553215934463736],
        [-121.77421502202081, 38.55347243518358],
        [-121.77483138694643, 38.55347243518358],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygon = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [114.84807353432808, -3.449255329675921],
        [114.84807353432808, -3.4502955104658923],
        [114.84870049348092, -3.4502955104658923],
        [114.84870049348092, -3.449255329675921],
        [114.84807353432808, -3.449255329675921],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const input_point = [-102.32207526163147, 19.53570142468871];

export const quadrants = {
  "north-west": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [-119.03578720654966, 47.93559576380332],
          [-119.03578720654966, 47.93440964058456],
          [-119.03381169482759, 47.93440964058456],
          [-119.03381169482759, 47.93559576380332],
          [-119.03578720654966, 47.93559576380332],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
  "north-east": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [12.41687384999824, 47.88679831140425],
          [12.41687384999824, 47.88572867949793],
          [12.418384927707251, 47.88572867949793],
          [12.418384927707251, 47.88679831140425],
          [12.41687384999824, 47.88679831140425],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
  "south-east": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [18.585011366402398, -33.9795153718126],
          [18.585011366402398, -33.981483943297555],
          [18.58780408214392, -33.981483943297555],
          [18.58780408214392, -33.9795153718126],
          [18.585011366402398, -33.9795153718126],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
  "south-west": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [-69.23188740486464, -51.60805476501489],
          [-69.23188740486464, -51.609953735377744],
          [-69.22903380530106, -51.609953735377744],
          [-69.22903380530106, -51.60805476501489],
          [-69.23188740486464, -51.60805476501489],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
};

export const quadrants_points = {
  "north-west": [-119.03412134909516, 47.93472750933009],
  "north-east": [12.417432949881146, 47.886045665409426],
  "south-east": [18.587564882328365, -33.98004626342711],
  "south-west": [-69.2315934241316, -51.60952167421363],
};
