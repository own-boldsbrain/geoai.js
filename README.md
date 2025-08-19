<h1 align="center">
  GeoAI <img src="https://cdn-icons-png.flaticon.com/256/5968/5968292.png" alt="JavaScript logo" height="22" style="vertical-align:middle" />
</h1>

<p align="center" style="margin-top:8px;">A lightweight JavaScript library for running Geo AI models in frontend applications.</p>

<p align="center" style="margin:12px 0;">
  <a href="https://www.npmjs.com/package/geoai"><img alt="npm version" src="https://img.shields.io/npm/v/geoai.svg"></a>
  <a href="https://github.com/decision-labs/geoai.js/actions/workflows/main.yml" style="margin-left:6px"><img alt="main" src="https://github.com/decision-labs/geoai.js/actions/workflows/main.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/geoai" style="margin-left:6px"><img alt="npm downloads" src="https://img.shields.io/npm/dm/geoai.svg"></a>
  <a href="https://docs.geobase.app/geoai" style="margin-left:6px"><img alt="docs" src="https://img.shields.io/badge/docs-online-blue"></a>
</p>

### Quick install

### NPM Package

[![npm version](https://img.shields.io/npm/v/geoai.svg)](https://www.npmjs.com/package/geoai)
[![npm downloads](https://img.shields.io/npm/dm/geoai.svg)](https://www.npmjs.com/package/geoai)

```bash
npm i geoai
```

📦 **Package Links:**
- [npm package](https://www.npmjs.com/package/geoai)
- [jsDelivr CDN](https://www.jsdelivr.com/package/npm/geoai)

### CDN (Browser)

You can also use GeoAI directly in the browser via CDN:

#### Unpkg CDN
```html
<script src="https://unpkg.com/geoai@1.0.0-rc.1/geoai.js"></script>
```

#### jsDelivr CDN
```html
<script src="https://cdn.jsdelivr.net/npm/geoai@1.0.0-rc.1/geoai.min.js"></script>
```

When using CDN, the library is available globally as `geoai`.

## Usage

### Core Library (Node.js and Browser)

#### NPM Installation
```javascript
import { geoai } from "geoai";

// Initialize the pipeline with ESRI provider (no API key required)
const pipeline = await geoai.pipeline([{ task: "object-detection" }], {
  provider: "esri",
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

#### CDN Usage
```javascript
// When using CDN, geoai is available globally
const pipeline = await geoai.pipeline([{ task: "object-detection" }], {
  provider: "esri",
});

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
    provider: "esri", // No API key required for ESRI
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
- **CDN Ready**: Available via npm and popular CDNs (unpkg, jsDelivr)

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
