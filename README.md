[![Main](https://github.com/decision-labs/geoai.js/actions/workflows/main.yml/badge.svg)](https://github.com/decision-labs/geoai.js/actions/workflows/main.yml)

# GeoAI

A JavaScript library for running Geo AI models in frontend applications.

## Installation

```bash
npm install geoai
```

## Usage

### Core Library (Node.js and Browser)

```javascript
import { geoai } from "geoai";

// Initialize the pipeline
const pipeline = await geoai.pipeline([{ task: "object-detection" }], {
  provider: "geobase",
  apikey: "your-api-key",
});

// Run inference
const result = await pipeline.inference({
  inputs: {
    polygon: geoJsonFeature,
  },
  mapSourceParams: {
    zoomLevel: 18,
  },
});
```

### React Hooks

```javascript
import { useGeoAIWorker } from "geoai/react";

function MyComponent() {
  const { inference, isLoading, error } = useGeoAIWorker({
    tasks: ["object-detection"],
    provider: "geobase",
    apikey: "your-api-key",
  });

  const handleInference = async () => {
    const result = await inference({
      inputs: { polygon: geoJsonFeature },
      mapSourceParams: { zoomLevel: 18 },
    });
  };

  return (
    <div>
      <button onClick={handleInference} disabled={isLoading}>
        {isLoading ? "Processing..." : "Run Detection"}
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

## Features

- **Multiple AI Tasks**: Object detection, segmentation, classification, and more
- **Map Provider Support**: Geobase, Mapbox, ESRI, and Google Maps
- **React Integration**: Hooks for easy React integration
- **TypeScript Support**: Full TypeScript definitions
- **Web Worker Support**: Run AI models in background threads
- **Optimized Performance**: Efficient model loading and inference

## Supported Tasks

- Object Detection
- Building Detection
- Car Detection
- Ship Detection
- Solar Panel Detection
- Oil Storage Tank Detection
- Land Cover Classification
- Wetland Segmentation
- Building Footprint Segmentation
- Mask Generation
- Zero-shot Object Detection
- Zero-shot Segmentation
- Image Feature Extraction

For more see the [supported tasks](https://docs.geobase.app/geoai/supported-tasks)

## Documentation

Visit [docs.geobase.app/geoai](https://docs.geobase.app/geoai) for comprehensive documentation, examples, and API reference.

## Contributing

We welcome contributions! Please see our [contributing guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.

[//]: <> (Toggle CI on)
