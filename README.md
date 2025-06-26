[![Main](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml/badge.svg)](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml)

# @geobase-js/geoai

A JavaScript library for running Geo AI models in frontend applications.

## Features

- **Multiple AI Models**: Support for various geospatial AI tasks including object detection, segmentation, and classification
- **Easy Integration**: Simple API for integrating AI models into web applications
- **TypeScript Support**: Full TypeScript definitions included
- **CDN Ready**: Available via npm, unpkg, and jsDelivr
- **Framework Agnostic**: Works with any JavaScript framework or vanilla JS

## Installation

### NPM
```bash
npm install @geobase-js/geoai
```

### Yarn
```bash
yarn add @geobase-js/geoai
```

### PNPM
```bash
pnpm add @geobase-js/geoai
```

### CDN
```html
<!-- Unpkg -->
<script src="https://unpkg.com/@geobase-js/geoai@0.0.1/dist/@geobase-js/geoai.js"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@geobase-js/geoai@0.0.1/dist/@geobase-js/geoai.js"></script>
```

## Quick Start

```javascript
import { GeoAI } from '@geobase-js/geoai';

// Initialize the library
const geoai = new GeoAI();

// Run object detection on satellite imagery
const result = await geoai.detectObjects({
  image: satelliteImage,
  model: 'object-detection'
});

console.log(result);
```

## Supported Models

- **Object Detection**: Detect objects in satellite imagery
- **Building Footprint Segmentation**: Extract building footprints
- **Land Cover Classification**: Classify land cover types
- **Zero-shot Object Detection**: Detect objects without pre-training
- **Oriented Object Detection**: Detect objects with orientation
- **Oil Storage Tank Detection**: Specialized tank detection
- **Solar Panel Detection**: Solar panel identification
- **Ship Detection**: Maritime vessel detection
- **Car Detection**: Vehicle detection in aerial imagery
- **Wetland Segmentation**: Wetland area identification

## API Reference

### Core Classes

#### GeoAI
Main class for interacting with Geo AI models.

```javascript
const geoai = new GeoAI(options);
```

#### GeoRawImage
Class for handling raw image data.

```javascript
import { GeoRawImage } from '@geobase-js/geoai';

const image = new GeoRawImage(imageData);
```

### Methods

#### detectObjects()
Detect objects in satellite imagery.

```javascript
const result = await geoai.detectObjects({
  image: imageData,
  model: 'object-detection',
  confidence: 0.5
});
```

#### segmentBuildings()
Extract building footprints.

```javascript
const result = await geoai.segmentBuildings({
  image: imageData,
  threshold: 0.3
});
```

#### classifyLandCover()
Classify land cover types.

```javascript
const result = await geoai.classifyLandCover({
  image: imageData,
  classes: ['water', 'forest', 'urban', 'agriculture']
});
```

## Examples

See the [examples directory](./examples/) for complete working examples.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

- 📖 [Documentation](https://docs.geobase.app/geoaijs)
- 🐛 [Report Issues](https://github.com/decision-labs/geobase-ai.js/issues)
- 💬 [Discussions](https://github.com/decision-labs/geobase-ai.js/discussions)
