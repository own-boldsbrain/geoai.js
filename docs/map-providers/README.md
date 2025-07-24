# Map Providers Documentation

> Integration guides for different map tile providers with GeoAI.js

This directory contains comprehensive documentation for integrating various map tile providers with GeoAI.js, including setup instructions, authentication, tile formats, and optimization strategies.

## Supported Providers

| Provider | Status | Tile Formats | Authentication | Performance |
|----------|--------|--------------|---------------|-------------|
| [GeoBase](./geobase.md) | ✅ Complete | RGB, Multispectral | API Key | High |
| [Mapbox](./mapbox.md) | ✅ Complete | RGB, Satellite | Access Token | High |
| Google Maps | 🚧 Coming Soon | RGB, Satellite | API Key | High |
| Esri ArcGIS | 🚧 Coming Soon | RGB, Multispectral | Token | Medium |


## Quick Comparison

### Image Quality & Resolution
- **GeoBase**: High resolution, multispectral
- **Mapbox**: High resolution, RGB satellite imagery

### Pricing
- **GeoBase**: Check pricing at [geobase.app/pricing](https://geobase.app/pricing) or consult GeoBase team on [Discord](https://discord.com/invite/4susZSj4bd). See [tile server docs](https://docs.geobase.app/tileserver) for setup.
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

### Tile Caching
- Enable caching for frequently accessed areas
- Use appropriate cache sizes based on your use case
- Consider offline scenarios for mobile applications

### Cost Optimization
- Monitor tile usage and costs
- Use appropriate zoom levels for your models
- Implement smart caching strategies

## Contributing

When adding support for new map providers:

1. Create a new `.md` file following the established template
2. Include authentication setup, tile configuration, and examples
3. Add performance benchmarks and cost considerations
4. Update this README with the new provider entry
5. Ensure compatibility with existing AI tasks

## Support

For provider-specific issues:
- Check the individual provider documentation
- Review authentication and quota settings
- Consult the troubleshooting sections in each guide
