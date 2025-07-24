# Mapbox Map Provider

> Vector and raster tiles with extensive customization options for geospatial AI applications

Mapbox provides high-quality vector and raster tiles with comprehensive global coverage, making it an excellent choice for AI applications that need detailed geographic context.

## Quick Start

```typescript
import { geoai } from '@geobase-js/geoai';

const mapboxParams = {
  provider: "mapbox",
  apiKey: "your-mapbox-access-token",
  style: "mapbox://styles/mapbox/satellite-v9"
};

// Initialize pipeline with Mapbox
const pipeline = await geoai.pipeline(
  [{ task: "object-detection" }],
  mapboxParams
);

// Run inference on polygon
const results = await pipeline.inference({
  inputs: { polygon: myPolygon },
  mapSourceParams: { zoomLevel: 18 }
});
```

## Key Features

### Satellite Imagery
- **High-resolution satellite imagery**: Global coverage for AI object detection
- **High resolution**: Sufficient detail for most AI tasks
- **Regular updates**: Fresh satellite data with consistent quality
- **Global availability**: Worldwide coverage with reliable access

### AI-Optimized
- **RGB format**: Compatible with standard AI models
- **Consistent quality**: Uniform image quality across regions  
- **Fast delivery**: Optimized tile serving for AI workloads
- **Reliable access**: High uptime and performance for production use

<!-- Todo : need to confirm these authentication step -->
## Authentication

### Access Token Setup

1. **Create Mapbox account** at [mapbox.com](https://account.mapbox.com/)
2. **Generate access token** with appropriate scopes:
   - `styles:tiles` - For raster and vector tiles
   - `styles:read` - For style information
   - `fonts:read` - For text rendering (optional)

3. **Set environment variable**:
   ```bash
   export MAPBOX_ACCESS_TOKEN="pk.your-access-token-here"
   ```

4. **Or pass directly** in configuration:
   ```typescript
   const mapboxParams = {
     provider: "mapbox",
     apiKey: process.env.MAPBOX_ACCESS_TOKEN,
     style: "mapbox://styles/mapbox/satellite-v9"
   };
   ```


## ProviderParams Structure

### Required Parameters
```typescript
type MapboxParams = {
  provider: "mapbox";
  apiKey: string;        // Your Mapbox access token
  style: string;         // Mapbox style URL or ID
};
```

## Supported Map Styles

### Satellite Imagery (Primary)
```typescript
// High-resolution satellite imagery - recommended for AI tasks
style: "mapbox://styles/mapbox/satellite-v9"
```

> **Note**: Only satellite styles are supported for AI tasks. Vector-only styles are not compatible with the AI models.

## Supported AI Tasks

### RGB-Compatible Tasks
- **Object Detection** - General object detection with satellite imagery
- **Car Detection** - Car, truck, and vehicle identification
- **Building Detection** - Building and structure detection
- **Ship Detection** - Maritime vessel detection
- **Oriented Object Detection** - Rotated object detection
- **Solar Panel Detection** - Solar installation detection
- **Oil Storage Tank Detection** - Industrial tank detection
- **Building Footprint Segmentation** - Building boundary extraction
- **Land Cover Classification** - Limited accuracy in low resolution areas


> **Note**: Mapbox provides RGB satellite imagery only. For multispectral analysis (requiring NIR bands), use GeoBase or other available map providers instead.


<!-- Todo : add integeration example for both node js and react -->
<!-- 
## Integration Examples

### React Integration
```typescript
import { useEffect, useState } from 'react';
import { GeoAI } from '@geobase/geoai';

const MapboxAIComponent = () => {
  const [detections, setDetections] = useState([]);
  
  useEffect(() => {
    const geoAI = new GeoAI({
      provider: 'mapbox',
      accessToken: process.env.REACT_APP_MAPBOX_TOKEN
    });
    
    const runDetection = async () => {
      const results = await geoAI.detectVehicles({
        bbox: [-122.4194, 37.7749, -122.4094, 37.7849]
      });
      setDetections(results.features);
    };
    
    runDetection();
  }, []);
  
  return (
    <div>
      <h3>Detected Vehicles: {detections.length}</h3>
      {/* Render detections */}
    </div>
  );
};
```

### Node.js Backend
```typescript
import express from 'express';
import { GeoAI } from '@geobase/geoai';

const app = express();
const geoAI = new GeoAI({
  provider: 'mapbox',
  accessToken: process.env.MAPBOX_ACCESS_TOKEN
});

app.post('/detect-objects', async (req, res) => {
  try {
    const { bbox, task } = req.body;
    
    const results = await geoAI[task]({ bbox });
    
    res.json({
      success: true,
      count: results.features.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
``` -->

## Support

### Documentation
- [Mapbox API Documentation](https://docs.mapbox.com/)
- [Style Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/)

### Community
- [Stack Overflow](https://stackoverflow.com/questions/tagged/mapbox)
- [GitHub Issues](https://github.com/mapbox/mapbox-gl-js/issues)
