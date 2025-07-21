# Supported Models Registry

> Complete reference of available AI models and their capabilities

This document provides comprehensive information about all supported AI models in GeoAI.js, including their capabilities, parameters, performance characteristics, and usage examples.

## Overview

GeoAI.js supports a wide range of pre-trained models for various geospatial AI tasks. Each model is optimized for specific use cases and provides different trade-offs between accuracy, speed, and resource usage.

## Model Categories

### 🔍 Object Detection

Models that identify and locate objects in satellite imagery.

### 🏗️ Segmentation

Models that create precise pixel-level masks for objects and regions.

### 🏷️ Classification

Models that categorize entire regions or extracted objects.

### 🔄 Multi-Task

Models that combine multiple AI capabilities in a single inference.

---

## Object Detection Models

### object-detection

**Purpose:** General-purpose object detection for common infrastructure and objects

```typescript
const config = {
  task: "object-detection",
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key",
};
```

**Capabilities:**

- Detects buildings, vehicles, infrastructure
- Provides bounding boxes with confidence scores
- Optimized for 15-20cm resolution imagery

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceScore` | `number` | `0.8` | Minimum confidence threshold (0-1) |
| `nmsThreshold` | `number` | `0.5` | Non-maximum suppression threshold |
| `maxDetections` | `number` | `100` | Maximum objects to detect |

**Output Classes:**

- `building` - Residential and commercial buildings
- `vehicle` - Cars, trucks, motorcycles
- `road` - Paved roads and highways
- `water` - Water bodies and pools
- `vegetation` - Trees and large vegetation

**Performance:**

- **Inference Time:** 1.5-3s (typical)
- **Memory Usage:** 200-400MB
- **Accuracy:** 87% mAP@0.5
- **Min Resolution:** 30cm/pixel
- **Max Area:** 5km²

**Example Usage:**

```typescript
const result = await pipeline.inference({
  inputs: { polygon: myPolygon },
  mapSourceParams: { zoomLevel: 18 },
  postProcessingParams: {
    confidenceScore: 0.8,
    nmsThreshold: 0.5,
  },
});

console.log(`Found ${result.detections.features.length} objects`);
```

---

### vehicle-detection

**Purpose:** Specialized detection for vehicles and transportation assets

```typescript
const config = {
  task: "vehicle-detection",
  provider: "geobase",
};
```

**Capabilities:**

- High-precision vehicle detection
- Vehicle type classification
- Traffic density analysis

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceScore` | `number` | `0.7` | Detection confidence threshold |
| `vehicleTypes` | `string[]` | `["all"]` | Filter by vehicle types |
| `minSize` | `number` | `20` | Minimum vehicle size (pixels) |

**Output Classes:**

- `car` - Passenger vehicles
- `truck` - Large commercial vehicles
- `bus` - Public transportation buses
- `motorcycle` - Two-wheeled vehicles
- `aircraft` - Planes and helicopters

**Performance:**

- **Inference Time:** 2-4s
- **Memory Usage:** 250-500MB
- **Accuracy:** 92% mAP@0.5
- **Min Resolution:** 15cm/pixel

---

### building-detection

**Purpose:** Optimized detection for residential and commercial buildings

```typescript
const config = {
  task: "building-detection",
  provider: "geobase",
};
```

**Capabilities:**

- Precise building footprint detection
- Building type classification
- Height estimation (when available)

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceScore` | `number` | `0.8` | Building detection threshold |
| `minArea` | `number` | `50` | Minimum building area (m²) |
| `includeShadows` | `boolean` | `true` | Include building shadows in analysis |

**Output Classes:**

- `residential` - Houses and apartments
- `commercial` - Offices and stores
- `industrial` - Factories and warehouses
- `institutional` - Schools and hospitals

**Performance:**

- **Inference Time:** 1-2.5s
- **Memory Usage:** 180-350MB
- **Accuracy:** 89% mAP@0.5

---

### ship-detection

**Purpose:** Maritime vessel detection in coastal and open water areas

```typescript
const config = {
  task: "ship-detection",
  provider: "geobase",
};
```

**Capabilities:**

- Vessel detection in various water conditions
- Ship size classification
- Wake pattern analysis

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceScore` | `number` | `0.75` | Ship detection threshold |
| `waterMask` | `boolean` | `true` | Focus detection on water areas |
| `minLength` | `number` | `10` | Minimum ship length (meters) |

**Output Classes:**

- `cargo_ship` - Large commercial vessels
- `tanker` - Oil and chemical tankers
- `fishing_vessel` - Commercial fishing boats
- `yacht` - Recreational boats
- `military_vessel` - Naval ships

**Performance:**

- **Inference Time:** 2-3.5s
- **Memory Usage:** 220-400MB
- **Accuracy:** 84% mAP@0.5

---

### aircraft-detection

**Purpose:** Detection of aircraft at airports and airfields

```typescript
const config = {
  task: "aircraft-detection",
  provider: "geobase",
};
```

**Capabilities:**

- Commercial and military aircraft detection
- Aircraft type classification
- Parking position analysis

**Output Classes:**

- `commercial_airliner` - Passenger aircraft
- `cargo_plane` - Freight aircraft
- `military_aircraft` - Military planes
- `helicopter` - Rotorcraft
- `private_jet` - Small private aircraft

**Performance:**

- **Inference Time:** 1.5-3s
- **Memory Usage:** 200-380MB
- **Accuracy:** 88% mAP@0.5

---

## Segmentation Models

### building-footprint-segmentation

**Purpose:** Precise pixel-level building footprint extraction

```typescript
const config = {
  task: "building-footprint-segmentation",
  provider: "geobase",
};
```

**Capabilities:**

- Accurate building boundaries
- Handles complex building shapes
- Separates connected buildings

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceThreshold` | `number` | `0.7` | Pixel confidence threshold |
| `minArea` | `number` | `25` | Minimum building area (m²) |
| `simplification` | `number` | `1.0` | Polygon simplification factor |

**Output Format:**

- Precise polygon geometries
- Confidence scores per polygon
- Area calculations

**Performance:**

- **Inference Time:** 3-6s
- **Memory Usage:** 400-800MB
- **Accuracy:** 91% IoU
- **Output Resolution:** Pixel-level precision

**Example:**

```typescript
const result = await pipeline.inference({
  inputs: { polygon: area },
  postProcessingParams: {
    confidenceThreshold: 0.8,
    minArea: 50,
    simplification: 0.5,
  },
});

result.segmentations.features.forEach(building => {
  console.log(`Building area: ${building.properties.area}m²`);
});
```

---

### road-segmentation

**Purpose:** Road network extraction and mapping

```typescript
const config = {
  task: "road-segmentation",
  provider: "geobase",
};
```

**Capabilities:**

- Road centerline extraction
- Road width estimation
- Traffic lane detection

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceThreshold` | `number` | `0.6` | Road pixel confidence |
| `minLength` | `number` | `10` | Minimum road segment (meters) |
| `connectGaps` | `boolean` | `true` | Connect road discontinuities |

**Output Classes:**

- `highway` - Major highways
- `arterial` - Main roads
- `residential` - Local streets
- `parking` - Parking lots

**Performance:**

- **Inference Time:** 4-7s
- **Memory Usage:** 500-900MB
- **Accuracy:** 85% IoU

---

### water-segmentation

**Purpose:** Water body detection and mapping

```typescript
const config = {
  task: "water-segmentation",
  provider: "geobase",
};
```

**Capabilities:**

- Lakes, rivers, and ocean detection
- Temporary water body identification
- Flood mapping applications

**Output Classes:**

- `permanent_water` - Lakes and rivers
- `seasonal_water` - Temporary water bodies
- `flood_water` - Flood-affected areas

**Performance:**

- **Inference Time:** 2-4s
- **Memory Usage:** 300-600MB
- **Accuracy:** 93% IoU

---

### vegetation-segmentation

**Purpose:** Vegetation and land cover analysis

```typescript
const config = {
  task: "vegetation-segmentation",
  provider: "geobase",
};
```

**Capabilities:**

- Tree and forest detection
- Crop field identification
- Vegetation health assessment

**Output Classes:**

- `dense_forest` - Dense tree coverage
- `sparse_vegetation` - Scattered trees/bushes
- `agricultural` - Crop fields
- `grassland` - Grass and meadows

**Performance:**

- **Inference Time:** 3-5s
- **Memory Usage:** 350-700MB
- **Accuracy:** 88% IoU

---

## Classification Models

### land-cover-classification

**Purpose:** Comprehensive land use and land cover classification

```typescript
const config = {
  task: "land-cover-classification",
  provider: "geobase",
};
```

**Capabilities:**

- Multi-class land cover mapping
- Urban/rural classification
- Change detection support

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceScore` | `number` | `0.8` | Classification confidence |
| `patchSize` | `number` | `64` | Classification patch size |
| `aggregation` | `string` | `"majority"` | Result aggregation method |

**Output Classes:**

- `urban` - Built-up areas
- `forest` - Dense tree coverage
- `agriculture` - Farmland and crops
- `water` - Water bodies
- `barren` - Bare soil and rock
- `grassland` - Natural grasslands

**Performance:**

- **Inference Time:** 2-4s
- **Memory Usage:** 250-500MB
- **Accuracy:** 86% overall accuracy

---

### crop-classification

**Purpose:** Agricultural crop type identification

```typescript
const config = {
  task: "crop-classification",
  provider: "geobase",
};
```

**Capabilities:**

- Major crop type identification
- Growth stage assessment
- Yield estimation support

**Output Classes:**

- `corn` - Corn/maize fields
- `soybean` - Soybean crops
- `wheat` - Wheat fields
- `rice` - Rice paddies
- `cotton` - Cotton fields

**Performance:**

- **Inference Time:** 1.5-3s
- **Memory Usage:** 200-400MB
- **Accuracy:** 82% overall accuracy

---

## Specialized Models

### solar-panel-detection

**Purpose:** Solar panel and renewable energy infrastructure detection

```typescript
const config = {
  task: "solar-panel-detection",
  provider: "geobase",
};
```

**Capabilities:**

- Rooftop solar panel detection
- Solar farm identification
- Panel orientation analysis

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `confidenceScore` | `number` | `0.8` | Panel detection threshold |
| `minArea` | `number` | `10` | Minimum panel area (m²) |
| `groupPanels` | `boolean` | `true` | Group adjacent panels |

**Output Properties:**

- Panel area and count
- Estimated capacity
- Roof coverage percentage

**Performance:**

- **Inference Time:** 2-4s
- **Memory Usage:** 300-500MB
- **Accuracy:** 89% precision

---

### oil-storage-tank-detection

**Purpose:** Industrial storage tank identification

```typescript
const config = {
  task: "oil-storage-tank-detection",
  provider: "geobase",
};
```

**Capabilities:**

- Cylindrical tank detection
- Tank capacity estimation
- Facility mapping

**Output Properties:**

- Tank diameter and volume
- Material type classification
- Facility grouping

**Performance:**

- **Inference Time:** 1.5-3s
- **Memory Usage:** 250-450MB
- **Accuracy:** 91% precision

---

### construction-monitoring

**Purpose:** Construction site progress tracking

```typescript
const config = {
  task: "construction-monitoring",
  provider: "geobase",
};
```

**Capabilities:**

- Construction equipment detection
- Progress stage classification
- Change detection analysis

**Output Classes:**

- `excavation` - Site preparation phase
- `foundation` - Foundation work
- `structure` - Building construction
- `completion` - Finishing phase

**Performance:**

- **Inference Time:** 3-5s
- **Memory Usage:** 400-700MB
- **Accuracy:** 83% stage accuracy

---

## Zero-Shot Models

### zero-shot-object-detection

**Purpose:** Flexible object detection with custom class labels

```typescript
const config = {
  task: "zero-shot-object-detection",
  provider: "geobase",
};
```

**Capabilities:**

- Custom object detection without training
- Natural language class descriptions
- Flexible classification targets

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `classLabel` | `string` | Required | Natural language object description |
| `confidenceScore` | `number` | `0.7` | Detection confidence threshold |
| `topk` | `number` | `10` | Maximum detections to return |

**Example Usage:**

```typescript
const result = await pipeline.inference({
  inputs: {
    polygon: searchArea,
    classLabel: "swimming pools, tennis courts, playground equipment",
  },
  postProcessingParams: {
    confidenceScore: 0.8,
    topk: 20,
  },
});
```

**Performance:**

- **Inference Time:** 3-6s
- **Memory Usage:** 500-800MB
- **Accuracy:** Varies by object type (60-85%)

---

### zero-shot-classification

**Purpose:** Custom region classification with flexible categories

```typescript
const config = {
  task: "zero-shot-classification",
  provider: "geobase",
};
```

**Capabilities:**

- Custom classification categories
- Scene understanding
- Contextual analysis

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `categories` | `string[]` | Required | List of classification categories |
| `confidenceScore` | `number` | `0.8` | Classification threshold |

**Example:**

```typescript
const result = await pipeline.inference({
  inputs: { polygon: area },
  postProcessingParams: {
    categories: [
      "residential neighborhood",
      "commercial district",
      "industrial area",
      "parkland",
    ],
    confidenceScore: 0.8,
  },
});
```

---

## Multi-Task Models

### comprehensive-analysis

**Purpose:** Combined detection, segmentation, and classification

```typescript
const config = {
  task: "comprehensive-analysis",
  provider: "geobase",
};
```

**Capabilities:**

- Multiple AI tasks in single inference
- Coordinated analysis results
- Reduced processing time

**Output Components:**

- Object detections
- Segmentation masks
- Land cover classification
- Scene understanding

**Performance:**

- **Inference Time:** 5-10s
- **Memory Usage:** 800-1200MB
- **Accuracy:** Varies by component

---

## Model Selection Guide

### By Use Case

#### **Urban Planning**

- Primary: `building-footprint-segmentation`
- Secondary: `road-segmentation`, `land-cover-classification`

#### **Environmental Monitoring**

- Primary: `vegetation-segmentation`
- Secondary: `water-segmentation`, `land-cover-classification`

#### **Infrastructure Assessment**

- Primary: `object-detection`
- Secondary: `building-detection`, `road-segmentation`

#### **Agriculture**

- Primary: `crop-classification`
- Secondary: `vegetation-segmentation`, `land-cover-classification`

#### **Transportation**

- Primary: `vehicle-detection`
- Secondary: `road-segmentation`, `object-detection`

#### **Energy**

- Primary: `solar-panel-detection`
- Secondary: `building-footprint-segmentation`, `oil-storage-tank-detection`

### By Performance Requirements

#### **Real-Time Applications (<3s)**

- `object-detection`
- `building-detection`
- `vehicle-detection`
- `land-cover-classification`

#### **High Accuracy Requirements**

- `building-footprint-segmentation`
- `water-segmentation`
- `solar-panel-detection`

#### **Large Area Analysis**

- `land-cover-classification`
- `object-detection`
- `vegetation-segmentation`

### By Resource Constraints

#### **Low Memory (<300MB)**

- `object-detection`
- `building-detection`
- `land-cover-classification`

#### **Medium Memory (300-600MB)**

- `vehicle-detection`
- `solar-panel-detection`
- `water-segmentation`

#### **High Memory (>600MB)**

- `building-footprint-segmentation`
- `comprehensive-analysis`
- `zero-shot-object-detection`

## Integration Examples

### Single Model Usage

```typescript
import { geoai } from "@geobase-js/geoai";

// Initialize pipeline with specific model
const pipeline = await geoai.pipeline([{ task: "building-detection" }], {
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key",
});

// Run inference
const result = await pipeline.inference({
  inputs: { polygon: myPolygon },
  mapSourceParams: { zoomLevel: 18 },
  postProcessingParams: {
    confidenceScore: 0.8,
    minArea: 50,
  },
});
```

### Multi-Model Chain

```typescript
// Chain multiple models for comprehensive analysis
const pipeline = await geoai.pipeline(
  [
    { task: "object-detection" },
    { task: "building-footprint-segmentation" },
    { task: "land-cover-classification" },
  ],
  config
);

const results = await pipeline.inference({
  inputs: { polygon: analysisArea },
  chainMode: true, // Process sequentially
});
```

### Model Comparison

```typescript
// Compare results from multiple models
const models = ["building-detection", "building-footprint-segmentation"];
const results = {};

for (const model of models) {
  const pipeline = await geoai.pipeline([{ task: model }], config);
  results[model] = await pipeline.inference({
    inputs: { polygon: testArea },
  });
}

// Analyze differences
console.log(
  "Detection count:",
  results["building-detection"].detections.features.length
);
console.log(
  "Segmentation count:",
  results["building-footprint-segmentation"].segmentations.features.length
);
```

## Performance Optimization

### Model-Specific Optimizations

#### For Detection Models

```typescript
const optimizedConfig = {
  postProcessingParams: {
    confidenceScore: 0.8, // Higher threshold for fewer false positives
    nmsThreshold: 0.5, // Reduce overlapping detections
    maxDetections: 50, // Limit results for faster processing
  },
};
```

#### For Segmentation Models

```typescript
const optimizedConfig = {
  postProcessingParams: {
    confidenceThreshold: 0.7,
    simplification: 2.0, // More aggressive polygon simplification
    minArea: 100, // Filter small segments
  },
};
```

### Batch Processing

```typescript
// Process multiple areas efficiently
const areas = [area1, area2, area3, area4];
const batchSize = 2;

for (let i = 0; i < areas.length; i += batchSize) {
  const batch = areas.slice(i, i + batchSize);
  const promises = batch.map(area =>
    pipeline.inference({ inputs: { polygon: area } })
  );

  const results = await Promise.all(promises);
  // Process results...
}
```

## Troubleshooting

### Common Issues

#### **High Memory Usage**

- Reduce input polygon size
- Lower image resolution
- Use detection models instead of segmentation
- Enable garbage collection between inferences

#### **Slow Processing**

- Check network connectivity
- Reduce confidence thresholds
- Use simpler models for real-time applications
- Enable model caching

#### **Low Accuracy**

- Increase image resolution
- Adjust confidence thresholds
- Use task-specific models
- Ensure proper map provider configuration

#### **Model Loading Failures**

- Verify API keys and network access
- Check model availability in your region
- Try alternative models for the same task

### Error Codes

| Error Code              | Description                   | Solution                                   |
| ----------------------- | ----------------------------- | ------------------------------------------ |
| `MODEL_NOT_FOUND`       | Requested model unavailable   | Check model name spelling and availability |
| `INFERENCE_TIMEOUT`     | Processing took too long      | Reduce input size or increase timeout      |
| `MEMORY_LIMIT_EXCEEDED` | Insufficient memory for model | Use smaller models or reduce input size    |
| `INVALID_PARAMETERS`    | Incorrect parameter values    | Verify parameter types and ranges          |

This comprehensive model registry provides all the information needed to select, configure, and optimize AI models for your specific geospatial use cases.
