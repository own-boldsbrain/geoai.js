# Tutorial 1: Basic Object Detection

> Learn to build an interactive mapping app with AI-powered object detection

In this tutorial, you'll create a web application that allows users to draw polygons on a map and automatically detect objects like buildings, vehicles, and infrastructure within the selected area.

[//]: # "TODO: Add demo GIF showing the complete workflow"

## What You'll Learn

- 🗺️ Setting up an interactive map with drawing capabilities
- 🤖 Integrating AI object detection with GeoAI.js
- 📊 Displaying AI results on the map
- ⚡ Using web workers for performance

## Prerequisites

- Basic JavaScript/TypeScript knowledge
- Familiarity with React (helpful but not required)
- Node.js 16+ installed

## What You'll Build

By the end of this tutorial, you'll have a fully functional app that:

1. Displays an interactive satellite map
2. Allows users to draw polygons
3. Runs AI object detection on the selected area
4. Visualizes detected objects on the map
5. Shows detection confidence and properties

## Step 1: Project Setup

Create a new React project and install dependencies:

```bash
npx create-react-app ai-object-detection --template typescript
cd ai-object-detection
npm install @geobase-js/geoai maplibre-gl maplibre-gl-draw
```

> 💡 **Using Vanilla JS?** You can adapt this tutorial for vanilla JavaScript - the core concepts remain the same.

## Step 2: Environment Configuration

Create a `.env` file in your project root:

```bash
# Geobase Configuration (recommended)
REACT_APP_GEOBASE_PROJECT_REF=your-project-ref
REACT_APP_GEOBASE_API_KEY=your-api-key

# Mapbox Configuration (alternative)
REACT_APP_MAPBOX_TOKEN=your-mapbox-token
```

> 🔑 **Getting API Keys:**
>
> - **Geobase**: Sign up at [geobase.app](https://geobase.app) for free satellite imagery access
> - **Mapbox**: Get your token from [mapbox.com](https://mapbox.com)

## Step 3: Create the AI Hook

Create `src/hooks/useGeoAI.ts` to manage AI operations:

```typescript
import { useOptimizedGeoAI } from "@geobase-js/geoai/hooks";

const mapConfig = {
  geobase: {
    provider: "geobase" as const,
    projectRef: process.env.REACT_APP_GEOBASE_PROJECT_REF!,
    apikey: process.env.REACT_APP_GEOBASE_API_KEY!,
    cogImagery: "https://your-imagery-url.tif",
  },
  mapbox: {
    provider: "mapbox" as const,
    apiKey: process.env.REACT_APP_MAPBOX_TOKEN!,
    style: "mapbox://styles/mapbox/satellite-v9",
  },
};

export function useObjectDetection(provider: "geobase" | "mapbox" = "geobase") {
  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    runOptimizedInference,
    clearError,
  } = useOptimizedGeoAI("object-detection");

  // Initialize AI model when hook is used
  React.useEffect(() => {
    initializeModel({
      task: "object-detection",
      ...mapConfig[provider],
    });
  }, [provider, initializeModel]);

  const detectObjects = (
    polygon: GeoJSON.Feature,
    options?: {
      confidenceScore?: number;
      zoomLevel?: number;
    }
  ) => {
    if (!isInitialized) {
      console.warn("AI model not ready yet");
      return;
    }

    runOptimizedInference(polygon, options?.zoomLevel || 18, {
      task: "object-detection",
      confidenceScore: options?.confidenceScore || 0.8,
    });
  };

  return {
    // State
    isInitialized,
    isProcessing,
    error,
    detections: lastResult?.detections,

    // Actions
    detectObjects,
    clearError,
  };
}
```

> 🧠 **Why This Pattern?** The custom hook encapsulates all AI logic, making it reusable and easy to test.

## Step 4: Build the Map Component

Create `src/components/AIMap.tsx`:

```typescript
import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MaplibreDraw from 'maplibre-gl-draw';
import { useObjectDetection } from '../hooks/useGeoAI';

export function AIMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);

  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);

  const {
    isInitialized,
    isProcessing,
    error,
    detections,
    detectObjects,
    clearError
  } = useObjectDetection("geobase");

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["your-tile-url/{z}/{x}/{y}"],
            tileSize: 256
          }
        },
        layers: [{
          id: "satellite-layer",
          type: "raster",
          source: "satellite"
        }]
      },
      center: [-74.006, 40.7128], // NYC
      zoom: 16
    });

    // Add drawing controls
    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    });

    map.current.addControl(draw.current);

    // Handle polygon creation
    map.current.on('draw.create', (e) => {
      const feature = e.features[0];
      setPolygon(feature);
    });

    map.current.on('draw.update', (e) => {
      const feature = e.features[0];
      setPolygon(feature);
    });

    map.current.on('draw.delete', () => {
      setPolygon(null);
    });

    return () => map.current?.remove();
  }, []);

  // Display AI results on map
  useEffect(() => {
    if (!map.current || !detections) return;

    // Remove existing results
    if (map.current.getSource('detections')) {
      map.current.removeLayer('detections-layer');
      map.current.removeSource('detections');
    }

    // Add new detection results
    map.current.addSource('detections', {
      type: 'geojson',
      data: detections
    });

    map.current.addLayer({
      id: 'detections-layer',
      type: 'fill',
      source: 'detections',
      paint: {
        'fill-color': '#ff0000',
        'fill-opacity': 0.6,
        'fill-outline-color': '#ff0000'
      }
    });

    // Add click interactions
    map.current.on('click', 'detections-layer', (e) => {
      const properties = e.features?.[0]?.properties;
      if (properties) {
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div>
              <h3>Detection Result</h3>
              <p><strong>Confidence:</strong> ${properties.confidence}%</p>
              <p><strong>Type:</strong> ${properties.class}</p>
            </div>
          `)
          .addTo(map.current!);
      }
    });
  }, [detections]);

  const handleRunDetection = () => {
    if (polygon && isInitialized) {
      detectObjects(polygon, {
        confidenceScore: 0.8,
        zoomLevel: map.current?.getZoom() || 18
      });
    }
  };

  return (
    <div className="relative w-full h-screen">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Controls Panel */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold mb-4">AI Object Detection</h2>

        {/* Status Messages */}
        {!isInitialized && (
          <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
            Initializing AI model...
          </div>
        )}

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
            Error: {error}
            <button
              onClick={clearError}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {!polygon && isInitialized && (
          <div className="mb-4 p-2 bg-blue-100 text-blue-800 rounded">
            Draw a polygon on the map to start detection
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => draw.current?.changeMode('draw_polygon')}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Draw Area
          </button>

          <button
            onClick={handleRunDetection}
            disabled={!polygon || !isInitialized || isProcessing}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? "Detecting..." : "Run AI Detection"}
          </button>

          <button
            onClick={() => {
              draw.current?.deleteAll();
              setPolygon(null);
            }}
            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Clear All
          </button>
        </div>

        {/* Results Summary */}
        {detections && (
          <div className="mt-4 p-2 bg-green-100 text-green-800 rounded">
            Found {detections.features.length} objects
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 5: Create the Main App

Update `src/App.tsx`:

```typescript
import React from 'react';
import { AIMap } from './components/AIMap';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'maplibre-gl-draw/dist/maplibre-gl-draw.css';

function App() {
  return (
    <div className="App">
      <AIMap />
    </div>
  );
}

export default App;
```

## Step 6: Add Styling

Install Tailwind CSS for styling (optional):

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Or use the included CSS classes in your own stylesheet.

## Step 7: Test Your Application

Start the development server:

```bash
npm start
```

Your app should now:

1. ✅ Display an interactive satellite map
2. ✅ Allow polygon drawing with the "Draw Area" button
3. ✅ Show AI detection status and results
4. ✅ Display detected objects as colored overlays
5. ✅ Show object details on click

## 🎉 Congratulations!

You've built your first AI-powered mapping application! The app can now:

- 🗺️ Display high-resolution satellite imagery
- ✏️ Let users define areas of interest
- 🤖 Run AI object detection in web workers
- 📊 Visualize results with confidence scores

## 🎯 What's Next?

Ready to take your app further?

- **[Tutorial 2: React Integration](./02-react-integration.md)** - Advanced React patterns and state management
- **[Tutorial 3: Web Worker Optimization](./03-web-worker-optimization.md)** - Performance optimization techniques
- **[Multiple AI Tasks Tutorial](./04-multiple-ai-tasks.md)** - Chain multiple AI models together

## 🔧 Troubleshooting

### Common Issues

**"AI model not initialized"**

- Check your API keys in `.env`
- Ensure you have internet connectivity
- Verify your provider configuration

**"No objects detected"**

- Try different confidence scores (0.5-0.9)
- Ensure you're drawing over areas with visible objects
- Check that your imagery has sufficient resolution

**Map not loading**

- Verify your tile server URLs
- Check browser console for network errors
- Ensure your API keys have proper permissions

### Getting Help

- 📖 [Performance Guide](../guides/performance-optimization.md)
- 💬 [Community Discussions](https://github.com/decision-labs/geobase-ai.js/discussions)
- 🐛 [Report Issues](https://github.com/decision-labs/geobase-ai.js/issues)

## 📝 Key Takeaways

- **Web Workers**: Essential for non-blocking AI processing
- **Progressive Enhancement**: Start with basic functionality, add features incrementally
- **Error Handling**: Always provide user feedback for AI operations
- **Performance**: Use optimized inference methods for better user experience

Great job! You're now ready to build more advanced geospatial AI applications.
