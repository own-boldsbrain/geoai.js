# Map Providers Documentation

> Integration guides for different map tile providers with GeoAI.js

This directory contains comprehensive documentation for integrating various map tile providers with GeoAI.js, including setup instructions, authentication, tile formats, and optimization strategies.

## Supported Providers

| Provider | Status | Tile Formats | Authentication |
|----------|--------|--------------|---------------|
| [GeoBase](./geobase.md) | ✅ Complete | RGB, Multispectral | API Key |
| [Mapbox](./mapbox.md) | ✅ Complete | RGB, Satellite | Access Token |
| Google Maps | 🚧 Coming Soon | RGB, Satellite | API Key |
| Esri ArcGIS | 🚧 Coming Soon | RGB, Multispectral | Token |


## Quick Comparison

### Image Quality & Resolution
- **GeoBase**: Any CoG imagery including multi-spectral
- **Mapbox**: High resolution, RGB satellite imagery

### Pricing
- **GeoBase**: Check pricing at [geobase.app/pricing](https://geobase.app/pricing) or consult GeoBase team on [Discord](https://geobase.app/discord). 
- **Mapbox**: Check pricing at [mapbox.com/pricing](https://www.mapbox.com/pricing)

### AI Model Compatibility
- **GeoBase**: Optimized for all AI tasks, especially multispectral models
- **Mapbox**: Compatible with RGB-based AI models

## Getting Started

1. **Choose Your Provider**: Review the comparison table above
2. **Setup Authentication**: Follow provider-specific setup guides
3. **Configure GeoAI**: Initialize with your chosen provider
4. **Run AI Tasks**: Execute detection and analysis workflows

## Common Integration Patterns

### Basic Provider Setup
```typescript
import { geoai } from '@geobase-js/geoai';

// GeoBase providerParams
const geobaseParams = {
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key",
  cogImagery: "your-imagery-url"
};

// Mapbox providerParams  
const mapboxParams = {
  provider: "mapbox",
  apiKey: "your-mapbox-token",
  style: "mapbox://styles/mapbox/satellite-v9"
};

// Initialize pipeline with providerParams
const pipeline = await geoai.pipeline(
  [{ task: "object-detection" }],
  geobaseParams // Pass providerParams as second argument
);
```

## Performance Considerations

## Contributing

When adding support for new map providers:

1. Create a new `.md` file following the established template
2. Include authentication setup, tile configuration, and examples
3. Update this README with the new provider entry
5. Ensure compatibility with existing AI tasks

## Support

For provider-specific issues:
- Check the individual provider documentation
