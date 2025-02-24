import { ProviderParams } from "../src/geobase-ai";

export const mapboxParams: ProviderParams = {
  provider: "mapbox",
  apiKey:
    "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
  style: "mapbox://styles/mapbox/satellite-v9",
};

export const polygon = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [12.482802629103247, 41.885379230564524],
        [12.481392196198271, 41.885379230564524],
        [12.481392196198271, 41.884332326712524],
        [12.482802629103247, 41.884332326712524],
        [12.482802629103247, 41.885379230564524],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

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
