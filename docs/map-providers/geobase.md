# GeoBase Map Provider

> High-performance COG imagery serving platform for advanced AI analysis

GeoBase provides a high-performance tile server that can serve your Cloud Optimized GeoTIFF (COG) imagery with exceptional speed and reliability, making it ideal for advanced geospatial AI applications.

## Quick Start

```typescript
import { geoai } from '@geobase-js/geoai';

const geobaseParams = {
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key", 
  cogImagery: "your-imagery-url"
};

// Initialize pipeline with GeoBase
const pipeline = await geoai.pipeline(
  [{ task: "building-detection" }],
  geobaseParams
);

// Run inference on polygon
const results = await pipeline.inference({
  inputs: { polygon: myPolygon },
  mapSourceParams: { zoomLevel: 18 }
});
```

## Key Features

### High-Performance COG Serving
- **Your imagery**: Serves your own Cloud Optimized GeoTIFF (COG) files
- **Ultra-fast delivery**: Optimized tile server for rapid image access

### Flexible Image Support
- **Any resolution**: Supports imagery from 10cm to 10m+ resolution
- **Multispectral capable**: RGB, 4-band, or custom band combinations
- **Multiple formats**: COG, GeoTIFF, and other geospatial formats
- **Custom processing**: On-demand image processing and band combinations

### Enterprise-Grade Performance
- **High availability**: 99.9% uptime SLA
- **Fast response times**: Optimized for AI workloads
- **Bulk processing**: Efficient handling of large areas
- **Custom configurations**: Tailored setups for specific requirements

## Authentication

### API Key Setup

1. **Get your project reference and API key** from the [GeoBase](https://geobase.app/) under settings
2. **Set environment variables**:
   ```bash
   export GEOBASE_PROJECT_REF="your-project-ref"
   export GEOBASE_API_KEY="your-api-key"
   ```
3. **Or pass directly** in configuration:
   ```typescript
   const geobaseParams = {
    provider: "geobase",
    projectRef: process.env.GEOBASE_PROJECT_REF,
    apikey: process.env.GEOBASE_API_KEY, 
    cogImagery: "your-imagery-url"
   };
   ```

### Security Best Practices
- Use environment variables or secure key management
- Rotate keys regularly for production applications
- Monitor API usage and set up alerts

## ProviderParams Structure

### Required Parameters
```typescript
type GeobaseParams = {
  provider: "geobase";
  projectRef: string;    // Your GeoBase project reference
  apikey: string;        // Your GeoBase API key  
  cogImagery: string;    // URL to your COG imagery
};
```
## Supported AI Tasks

> **Note**: Task compatibility depends on your COG imagery specifications (resolution, bands, etc.)

### Multispectral Tasks (Requires 4-band COG)
- **Wetland Segmentation** - Requires RGB + NIR bands in your COG

### High-Resolution Tasks (Works best with <1m resolution COG)
- **Building Detection** - High resolution improves accuracy
- **Solar Panel Detection** - Ultra-high resolution reveals panel details
- **Vehicle Detection** - High resolution enables small vehicle detection

### Standard Tasks (Works with any RGB COG)
- **Object Detection** - Compatible with RGB imagery
- **Ship Detection** - Works with any resolution for maritime monitoring
- **Oriented Object Detection** - Precise rotated object identification
- **Building Footprint Segmentation** - Building boundary extraction
- **Land Cover Classification** - Benefits from NIR band for vegetation analysis
  
## Support

### Documentation
- [API Reference](https://docs.geobase.app)

### Contact
- **Technical Support**: support@geobase.app
- **Community**: [Discord](https://discord.com/invite/4susZSj4bd)
- **Availability**: 24/7 for enterprise customers
