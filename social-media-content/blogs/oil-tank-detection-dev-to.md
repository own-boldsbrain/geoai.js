---
title: "Side Quest to GeoAI.js - Detect Oil Tanks in Satellite Imagery with geoai.js and WebGPU"
description: "A year-long journey from a simple side quest to a full-fledged open-source library for geospatial AI in the browser"
author: "sabman"
date: "2025-01-27"
tags: ["geoai", "webgpu", "satellite-imagery", "object-detection", "javascript", "open-source"]
platforms: ["dev.to", "medium"]
status: "published"
dev_to_url: "https://dev.to/sabman/detect-oil-tanks-in-satellite-imagery-with-geoaijs-webgpu-hl"
published_date: "2025-01-27"
---

# Side Quest to GeoAI.js - Detect Oil Tanks in Satellite Imagery with geoai.js and WebGPU

![Oil Storage Tank Detection Demo](https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/oil-storage-tank-detection.gif)

*Watch geoai.js detect oil storage tanks in satellite imagery with green bounding boxes highlighting detected tanks in an industrial facility.*

# My Side Quest to GeoAI.js

A year ago, I started what I thought would be a simple side quest: building a tool to detect objects in satellite imagery using AI. Fast forward to today, and that "simple side quest" has grown into a full-fledged open-source library that's now available for the entire developer community.

What began as a weekend experiment to run computer vision models in the browser has evolved into geoai.js - a comprehensive JavaScript library that brings powerful geospatial AI capabilities directly to your web applications. After a year of consistent development, countless iterations, and learning the ins and outs of WebGPU, TransformersJS, and geospatial processing, we're excited to finally make this project open source.

In this post, I'll show you how to use geoai.js to detect oil tanks in satellite imagery, demonstrating just how far that initial side quest has come.

## What is geoai.js?

[geoai.js](https://github.com/decision-labs/geoai.js) is a lightweight JavaScript library that brings powerful geospatial AI capabilities directly to your browser. It leverages WebGPU and TransformersJS to run state-of-the-art computer vision models on satellite imagery without requiring any server-side processing.

Key features:
- 🚀 **Client-side AI**: Run models directly in the browser using WebGPU
- 🗺️ **Multiple Map Providers**: Support for ESRI, Mapbox, Geobase, and Google Maps
- 🎯 **Pre-trained Models**: Object detection, segmentation, classification, and more
- ⚡ **Web Worker Support**: Run AI models in background threads
- 📦 **Minimal Dependencies**: Lightweight with peer dependencies for AI frameworks

## Oil Storage Tank Detection

One of the most impressive capabilities of geoai.js is its oil storage tank detection model. This specialized AI can identify and locate oil storage tanks in satellite imagery with high accuracy, making it invaluable for:

- Energy infrastructure monitoring
- Environmental impact assessments
- Security and surveillance applications
- Asset management and inventory

## Getting Started

### Installation

First, install the library:

```bash
npm install geoai
```

> **Want the complete step-by-step tutorial?** This post shows a condensed version. For the full tutorial with every single step and all prerequisites, check out the [official documentation at docs.geobase.app/geoai](https://docs.geobase.app/geoai).

### Basic Setup

Here's a simple example to get you started with oil tank detection:

```javascript
import { geoai } from 'geoai';

// Initialize the pipeline with oil storage tank detection
const pipeline = await geoai.pipeline([
  { task: "oil-storage-tank-detection" }
], {
  provider: "esri", // Free ESRI satellite imagery
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery",
  tileSize: 256,
  attribution: "ESRI World Imagery"
});

// Run inference on a polygon area
const result = await pipeline.inference({
  inputs: {
    polygon: geoJsonPolygon // Your area of interest
  },
  mapSourceParams: {
    zoomLevel: 18 // Optimal zoom for tank detection
  },
  postProcessingParams: {
    confidenceThreshold: 0.5,
    nmsThreshold: 0.3
  }
});

console.log(`Found ${result.detections.features.length} oil storage tanks!`);
```

## Building a Complete Application

Let's create a full React application that allows users to draw polygons on a map and detect oil tanks in real-time:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoai, ProviderParams } from 'geoai';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';

const mapProviderConfig = {
  provider: "esri",
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery",
  tileSize: 256,
  attribution: "ESRI World Imagery",
};

function OilTankDetector() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MaplibreDraw | null>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [status, setStatus] = useState({ color: '#9e9e9e', text: 'Initializing...' });

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with satellite imagery
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "ESRI World Imagery",
          },
        },
        layers: [{ id: "satellite", type: "raster", source: "satellite" }],
      },
      center: [54.690310447932006, 24.75763471820723], // Dubai area
      zoom: 15,
    });

    // Add drawing controls
    const draw = new MaplibreDraw({ 
      displayControlsDefault: false, 
      controls: { polygon: true, trash: true } 
    });
    map.current.addControl(draw);
    drawRef.current = draw;

    // Initialize AI pipeline
    (async () => {
      setStatus({ color: '#ffa500', text: 'Loading AI Model...' });
      try {
        const newPipeline = await geoai.pipeline(
          [{ task: "oil-storage-tank-detection" }],
          mapProviderConfig as ProviderParams
        );
        setPipeline(newPipeline);
        setStatus({ color: '#4caf50', text: 'Ready! Draw a polygon to detect oil tanks.' });
        
        // Handle polygon drawing events
        map.current?.on('draw.create', async (e) => {
          setStatus({ color: '#2196f3', text: 'Processing detection...' });
          try {
            const result = await newPipeline.inference({
              inputs: { polygon: e.features[0] },
              mapSourceParams: { zoomLevel: 18 }
            });

            // Display results on map
            if (map.current?.getSource('detections')) {
              map.current.removeLayer('detections');
              map.current.removeSource('detections');
            }

            map.current?.addSource("detections", {
              type: "geojson",
              data: result.detections,
            });
            map.current?.addLayer({
              id: 'detections',
              type: 'fill',
              source: 'detections',
              paint: { 
                'fill-color': '#ff0000', 
                'fill-opacity': 0.5 
              }
            });

            setStatus({
              color: '#4caf50',
              text: `Found ${result.detections.features?.length || 0} oil storage tanks!`,
            });
          } catch (error) {
            console.error('Detection error:', error);
            setStatus({ color: '#f44336', text: 'Error during detection' });
          }
        });
      } catch (error) {
        console.error('Pipeline initialization error:', error);
        setStatus({ color: '#f44336', text: 'Failed to Initialize Model' });
      }
    })();

    return () => map.current?.remove();
  }, []);

  const resetMap = () => {
    drawRef.current?.deleteAll();
    if (map.current?.getSource('detections')) {
      map.current.removeLayer('detections');
      map.current.removeSource('detections');
    }
    setStatus({ color: '#4caf50', text: 'Ready! Draw a polygon to detect oil tanks.' });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '16px', 
        backgroundColor: status.color, 
        color: 'white', 
        fontSize: '20px', 
        textAlign: 'center', 
        fontWeight: 'bold', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ flex: 1 }}>{status.text}</div>
        {status.text.includes('Found') && (
          <button onClick={resetMap} style={{ 
            padding: '8px 16px', 
            backgroundColor: 'rgba(255,255,255,1)', 
            color: 'black', 
            border: '1px solid white', 
            borderRadius: '4px', 
            cursor: 'pointer', 
            fontSize: '14px', 
            marginLeft: '16px' 
          }}>
            Reset
          </button>
        )}
      </div>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

export default OilTankDetector;
```

## How It Works

### 1. Model Architecture

The oil storage tank detection model uses a state-of-the-art object detection architecture optimized for satellite imagery. It's trained on thousands of labeled satellite images containing oil storage tanks of various sizes and orientations.

### 2. WebGPU Acceleration

geoai.js leverages WebGPU for hardware acceleration, allowing the model to run efficiently in the browser. This means:
- No server costs or API calls
- Real-time processing
- Works offline once the model is loaded
- Privacy-preserving (data stays in the browser)

### 3. Geospatial Processing

The library handles the essential geospatial operations:
- Converting GeoJSON polygons to image tiles
- Converting detection results back to geographic coordinates
- Handling different zoom levels

*Note: Currently supports Web Mercator projection tiles only - we're working on expanding to other coordinate systems.*

## Advanced Features

### Confidence Thresholds

You can adjust the sensitivity of the detection:

```javascript
const result = await pipeline.inference({
  inputs: { polygon: geoJsonPolygon },
  mapSourceParams: { zoomLevel: 18 },
  postProcessingParams: {
    confidenceThreshold: 0.7, // Higher threshold = fewer false positives
    nmsThreshold: 0.3 // Non-maximum suppression threshold
  }
});
```

### Multiple Map Providers

geoai.js supports various map providers:

```javascript
// ESRI (free, no API key required)
const esriConfig = {
  provider: "esri",
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery"
};

// Mapbox (requires API key)
const mapboxConfig = {
  provider: "mapbox",
  apiKey: "your-mapbox-token",
  style: "mapbox://styles/mapbox/satellite-v9"
};

// Geobase (for custom imagery)
const geobaseConfig = {
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key",
  cogImagery: "your-imagery-url"
};
```

### Web Worker Support

For better performance, you can run the AI model in a background thread:

```javascript
import { useGeoAIWorker } from 'geoai/react';

function MyComponent() {
  const { inference, isLoading, error } = useGeoAIWorker({
    tasks: ["oil-storage-tank-detection"],
    provider: "esri"
  });

  const handleDetection = async () => {
    const result = await inference({
      inputs: { polygon: geoJsonPolygon },
      mapSourceParams: { zoomLevel: 18 }
    });
    // Handle results...
  };

  return (
    <button onClick={handleDetection} disabled={isLoading}>
      {isLoading ? "Processing..." : "Detect Oil Tanks"}
    </button>
  );
}
```

## Performance Considerations

### Model Loading

The oil storage tank detection model is approximately 50MB and takes a few seconds to load on first use. Subsequent uses are much faster as the model is cached in memory.

### Optimal Zoom Levels

For best results with oil tank detection:
- **Minimum zoom**: 15 (for large tanks)
- **Optimal zoom**: 18-20 (for most tanks)
- **Maximum zoom**: 22 (for small tanks)

### Memory Management

The library automatically manages memory for image processing. For large areas, consider:
- Breaking large polygons into smaller chunks
- Using appropriate zoom levels
- Clearing results when no longer needed

## Real-World Applications

### Energy Infrastructure Monitoring

```javascript
// Monitor oil storage facilities
const monitorFacility = async (facilityPolygon) => {
  const result = await pipeline.inference({
    inputs: { polygon: facilityPolygon },
    mapSourceParams: { zoomLevel: 18 }
  });
  
  // Track tank count over time
  const tankCount = result.detections.features.length;
  console.log(`Facility has ${tankCount} storage tanks`);
  
  return result.detections;
};
```

### Environmental Impact Assessment

```javascript
// Assess environmental impact of oil storage
const assessImpact = async (areaOfInterest) => {
  const result = await pipeline.inference({
    inputs: { polygon: areaOfInterest },
    mapSourceParams: { zoomLevel: 18 }
  });
  
  // Calculate total storage capacity
  const totalArea = result.detections.features.reduce((sum, tank) => {
    return sum + calculateArea(tank.geometry);
  }, 0);
  
  return {
    tankCount: result.detections.features.length,
    totalStorageArea: totalArea,
    environmentalRisk: assessRisk(totalArea)
  };
};
```

## Wrapping Up

Looking back at this journey from a simple side quest to a full-fledged open-source library, it's pretty wild to see how far we've come. What started as "let's see if I can make AI work in the browser" has turned into something that can actually detect oil tanks in satellite imagery - and do it well enough that people might actually want to use it.

The fact that you can now run sophisticated AI models directly in your browser, with no server costs or API calls, feels like a glimpse into the future. WebGPU and TransformersJS have made what seemed impossible a few years ago actually practical today.

If you're interested in geospatial AI, satellite imagery analysis, or just want to play around with some cutting-edge browser technology, I'd love to see what you build with geoai.js. The oil tank detection is just scratching the surface - there's so much more you can do with this foundation.

**Check out the other supported tasks:** building detection, car detection, ship detection, solar panel detection, land cover classification, wetland segmentation, building footprint segmentation, mask generation, zero-shot object detection, and image feature extraction. Each task opens up new possibilities for satellite imagery analysis.

### Where to Go Next

- **Documentation**: [docs.geobase.app/geoai](https://docs.geobase.app/geoai)
- **Live Examples**: [docs.geobase.app/geoai-live](https://docs.geobase.app/geoai-live)
- **GitHub Repository**: [github.com/decision-labs/geoai.js](https://github.com/decision-labs/geoai.js)
- **NPM Package**: [npmjs.com/package/geoai](https://www.npmjs.com/package/geoai)

Give it a shot and let me know what you build! I'm always curious to see what people do with this stuff. Feel free to reach out to me directly if you have questions or want to share what you've built. I'm always happy to hear from people and talk more about my work - you can join our Discord at [https://geobase.app/discord](https://geobase.app/discord) or follow me on social media as [@sabman](https://twitter.com/sabman). 🚀
