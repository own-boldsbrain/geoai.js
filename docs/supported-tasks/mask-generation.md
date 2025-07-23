# Mask Generation

> **Task ID:** `mask-generation`  
> **Library:** `@huggingface/transformers`  
> **Purpose:** Generate precise pixel-level masks for objects in geospatial imagery using SAM-based models

## Quick Start

```typescript
import { geoai } from "@geobase-js/geoai";

// Initialize the pipeline
const maskGenerationInstance = await geoai.pipeline(
  [
    {
      task: "mask-generation",
      modelId: "Xenova/slimsam-77-uniform", // optional
    },
  ],
  providerParams
);

// Run inference with point input
const pointInput = {
  type: "points",
  coordinates: [longitude, latitude]
};

const result = await maskGenerationInstance.inference({
  inputs: { 
    polygon: myPolygon,
    input: pointInput
  },
  mapSourceParams: { zoomLevel: 18 },
  postProcessingParams: { maxMasks: 3 },
});

console.log(`Generated ${result.masks.features.length} masks`);
```

## Available Models

| Model ID | Description | Best Use Case |
|----------|-------------|---------------|
| [Xenova/slimsam-77-uniform](https://huggingface.co/Xenova/slimsam-77-uniform) | Lightweight SAM model optimized for web deployment | Interactive segmentation, web applications |
| [Xenova/slimsam-77-uniform (boxes revision)](https://huggingface.co/Xenova/slimsam-77-uniform) | SAM model with box prompt support | Bounding box-based segmentation |

## Capabilities

- ✅ **Interactive segmentation** - Generate masks from point or box prompts
- ✅ **High precision** - Pixel-level accuracy for object boundaries
- ✅ **Multiple prompt types** - Support for point clicks and bounding boxes
- ✅ **Pipeline chaining** - Compatible with object detection for automatic segmentation
- ✅ **Geospatial integration** - Native GeoJSON mask output with geographic coordinates
- ✅ **Multiple masks** - Generate multiple mask candidates per prompt
- ✅ **Quality scoring** - IoU scores for mask quality assessment

## Input Parameters

### Required Inputs

| Parameter | Type | Description |
|-----------|------|-------------|
| `polygon` | `GeoJSON.Feature<Polygon>` | Area of interest for mask generation |
| `input` | `SegmentationInput \| ObjectDetectionResults` | Segmentation prompt or chained detection results |

### Segmentation Input Types

#### Point Input
```typescript
const pointInput: SegmentationInput = {
  type: "points",
  coordinates: [longitude, latitude] // Geographic coordinates
};
```

#### Box Input
```typescript
const boxInput: SegmentationInput = {
  type: "boxes",
  coordinates: [x1, y1, x2, y2] // [minLng, minLat, maxLng, maxLat]
};
```

#### Chained Detection Input
```typescript
// Use results from object detection as input
const detectionResults = await objectDetectionInstance.inference({...});
const result = await maskGenerationInstance.inference({
  inputs: { 
    polygon: myPolygon,
    input: detectionResults // Automatically generates masks for all detected objects
  }
});
```

### Post Processing Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxMasks` | `number` | `1` | Maximum number of masks to generate per prompt |

<!-- Todo : update the map source guide link -->
### Map Source Parameters
Follow this guide for mapSourceParameters 

## Output Format

```typescript
interface SegmentationResult {
  masks: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
}
```

### Mask Feature Properties

```typescript
interface MaskProperties {
  score: number;          // IoU quality score (0-1)
}
```

## Input Types Explained

### 🎯 Point Prompts
- **Use case:** Interactive segmentation where user clicks on objects
- **Best for:** Objects with clear boundaries, user-guided segmentation
- **Coordinates:** Geographic coordinates (longitude, latitude)

### 📦 Box Prompts  
- **Use case:** When you have approximate object boundaries
- **Best for:** Large objects, rectangular structures, regions of interest
- **Coordinates:** Bounding box coordinates (minLng, minLat, maxLng, maxLat)

### 🔗 Chained Detection
- **Use case:** Automatic mask generation for all detected objects
- **Best for:** Processing detection results, batch segmentation
- **Input:** ObjectDetectionResults from previous pipeline stage

## Pipeline Chaining Examples

### Object Detection → Mask Generation
```typescript
// Automatic pipeline - detects objects then generates masks
const pipeline = await geoai.pipeline([
  { task: "object-detection" },
  { task: "mask-generation" }
], providerParams);

const result = await pipeline.inference({
  inputs: { polygon: myPolygon },
  mapSourceParams: { zoomLevel: 18 }
});

// Result contains both detections and masks
console.log(`Detected ${result.detections.features.length} objects`);
console.log(`Generated ${result.masks.features.length} masks`);
```

### Zero-Shot Detection → Mask Generation
```typescript
// Find specific objects then generate precise masks
const pipeline = await geoai.pipeline([
  { task: "zero-shot-object-detection" },
  { task: "mask-generation" }
], providerParams);

const result = await pipeline.inference({
  inputs: { 
    polygon: myPolygon,
    classLabel: ["swimming pool."]
  }
});
```

### Batch Processing with Multiple Points
Make sure all the points are within the polygon.
```typescript
// Process multiple points in sequence
const points = [
  [114.8485, -3.4498], // Point 1
  [114.8490, -3.4500], // Point 2
  [114.8495, -3.4502]  // Point 3
];

const results = await Promise.all(
  points.map(([lng, lat]) => 
    maskGenerationInstance.inference({
      inputs: { 
        polygon,
        input: { type: "points", coordinates: [lng, lat] }
      }
    })
  )
);
```

### Model Configuration
```typescript
// Use following model configuration for boxes revision of slimsam
const boxModel = await geoai.pipeline([{
  task: "mask-generation",
  modelId: "Xenova/slimsam-77-uniform",
  modelParams: { 
    revision: "boxes",
  }
}], providerParams);
```
<!-- Todo:  To be updated later -->
## Performance Metrics

### Speed & Resources

- **Inference Time:** 0.8-2s per prompt (typical for 1km² area)
- **Memory Usage:** 150-300MB peak (model dependent)
- **GPU Acceleration:** Optional (WebGL/WebGPU supported)

### Accuracy

- **Boundary Precision:** 95%+ for clear object boundaries
- **IoU Score Range:** 0.6-0.98 (typical quality scores)
- **Multi-object Handling:** Excellent separation of overlapping objects

### Operational Limits

- **Min Resolution:** 50cm/pixel (lower resolution may reduce precision)
- **Max Area:** 3km² (larger areas should be processed in tiles)
- **Optimal Zoom:** 17-20 (for detailed segmentation)

## Best Practices

### 🎯 **Optimal Use Cases**

- Building footprint extraction
- Vegetation boundary mapping
- Infrastructure component segmentation
- Damage assessment boundaries
- Land use parcel delineation

### ⚡ **Performance Tips**

```typescript
// Use appropriate maxMasks setting
postProcessingParams: { maxMasks: 1 } // Single best mask
postProcessingParams: { maxMasks: 3 } // Multiple options for review

// Optimal zoom level for precision
mapSourceParams: { zoomLevel: 19 } // High detail segmentation
mapSourceParams: { zoomLevel: 17 } // Broader area coverage
```


### 📍 **Prompt Selection**

- **Points:** Click center of objects for best results
- **Boxes:** Include small margin around target objects

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Masks too large/small | Poor prompt placement | Adjust point/box placement to object center/boundaries |
| Low quality scores | Ambiguous boundaries | Use higher resolution imagery or better prompts |
| Multiple unwanted masks | Low specificity | Reduce `maxMasks` or improve prompt precision |
| Missing object parts | Prompt outside object | Ensure prompts are within target object boundaries |

## Related Tasks

- [`object-detection`](./object-detection.md) - Detect objects for automatic mask generation
- [`zero-shot-object-detection`](./zero-shot-object-detection.md) - Find custom objects for segmentation
- [`oriented-object-detection`](./oriented-object-detection.md) - Detect rotated objects for masking
- [`building-detection`](./building-detection.md) - Specialized building detection for footprint extraction
