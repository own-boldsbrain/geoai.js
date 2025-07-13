# 🚀 Quickstart Guide

> Get up and running with GeoAI.js in under 5 minutes

Build your first AI-powered mapping application that can detect objects in satellite imagery with just a few lines of code.

## What You'll Build

A web app that lets users:

- 🗺️ Draw polygons on an interactive map
- 🤖 Run AI object detection on the selected area
- 📊 Visualize detection results in real-time

[//]: # "TODO: Add demo GIF here"

## Prerequisites

- Basic JavaScript/TypeScript knowledge
- Node.js 16+ installed
- A map provider API key (Geobase or Mapbox)

## Step 1: Installation

Install GeoAI.js and a mapping library:

```bash
npm install @geobase-js/geoai maplibre-gl maplibre-gl-draw
```

<details>
<summary>Using other package managers</summary>

```bash
# Yarn
yarn add @geobase-js/geoai maplibre-gl maplibre-gl-draw

# PNPM
pnpm add @geobase-js/geoai maplibre-gl maplibre-gl-draw
```

</details>

## Step 2: Setup Your Map Provider

Choose your preferred map data provider:

### Option A: Geobase (Recommended)

```javascript
const config = {
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key",
  cogImagery: "your-imagery-url",
};
```

### Option B: Mapbox

```javascript
const config = {
  provider: "mapbox",
  apiKey: "your-mapbox-token",
  style: "mapbox://styles/mapbox/satellite-v9",
};
```

> 📝 **Getting API Keys:** Visit [Geobase](https://geobase.app) or [Mapbox](https://mapbox.com) to get your free API keys.

## Step 3: Create Your First AI Map

Create a new HTML file with this minimal setup:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import { geoai } from "@geobase-js/geoai";

      // Your config from Step 2
      const config = {
          provider: "geobase",
          projectRef: "your-project-ref",
          apikey: "your-api-key"
      };

      // Initialize AI pipeline
      const pipeline = await geoai.pipeline(
          [{ task: "object-detection" }],
          config
      );

      // Example polygon (you'd get this from map interactions)
      const polygon = {
          type: "Feature",
          geometry: {
              type: "Polygon",
              coordinates: [[[lng, lat], [lng, lat], ...]]
          }
      };

      // Run AI detection
      const result = await pipeline.inference({
          inputs: { polygon }
      });

      console.log("Detected objects:", result.detections);
    </script>
  </head>
  <body>
    <h1>🤖 AI Object Detection Results</h1>
    <div id="results"></div>
  </body>
</html>
```

## Step 4: Add Interactive Map (React)

For a complete React application:

```typescript
import { useOptimizedGeoAI } from "@geobase-js/geoai/hooks";

function AIMap() {
    const {
        isInitialized,
        isProcessing,
        runOptimizedInference,
        lastResult
    } = useOptimizedGeoAI("object-detection");

    const handlePolygonDraw = (polygon) => {
        if (isInitialized) {
            runOptimizedInference(polygon, 18, {
                task: "object-detection",
                confidenceScore: 0.8
            });
        }
    };

    return (
        <div>
            {/* Your map component here */}
            {isProcessing && <div>AI is analyzing...</div>}
            {lastResult && (
                <div>Found {lastResult.detections.features.length} objects!</div>
            )}
        </div>
    );
}
```

## ✅ That's It!

You now have a working AI-powered mapping application! The AI will:

- 🔍 Analyze satellite imagery within drawn polygons
- 🎯 Detect objects like buildings, vehicles, infrastructure
- 📊 Return GeoJSON results for easy visualization

## 🎯 Next Steps

Ready to build something more advanced?

- **[Basic Object Detection Tutorial](./tutorials/01-basic-object-detection.md)** - Complete step-by-step guide
- **[React Integration Tutorial](./tutorials/02-react-integration.md)** - Full React + MapLibre setup
- **[Web Worker Optimization](./tutorials/03-web-worker-optimization.md)** - Performance optimization

## 🆘 Need Help?

- 📖 [Full Documentation](./README.md)
- 💬 [Community Discussions](https://github.com/decision-labs/geobase-ai.js/discussions)
- 🐛 [Report Issues](https://github.com/decision-labs/geobase-ai.js/issues)

## 🎉 Share Your Creation

Built something cool? We'd love to see it! Share your projects in our [community discussions](https://github.com/decision-labs/geobase-ai.js/discussions).
