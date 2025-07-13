# Tutorial 2: React Integration Patterns

> Master advanced React patterns for building production-ready geospatial AI applications

This tutorial builds on the [Basic Object Detection Tutorial](./01-basic-object-detection.md) to show you professional React patterns, state management, and component architecture for geospatial AI applications.

[//]: # "TODO: Add demo GIF showing advanced React patterns"

## What You'll Learn

- 🏗️ Component architecture and separation of concerns
- 🔄 Advanced state management with Context API
- 🎣 Custom hooks for AI operations
- 📊 Real-time result visualization and data flow
- ⚡ Performance optimization with React patterns
- 🎯 TypeScript best practices for geospatial data

## Prerequisites

- Completed [Tutorial 1: Basic Object Detection](./01-basic-object-detection.md)
- Solid React and TypeScript knowledge
- Understanding of React hooks and context

## Architecture Overview

We'll build a scalable architecture with:

```
src/
├── components/
│   ├── Map/
│   │   ├── MapComponent.tsx      # Main map display
│   │   ├── DrawingControls.tsx   # Drawing interaction
│   │   └── ResultsOverlay.tsx    # AI results visualization
│   ├── UI/
│   │   ├── StatusPanel.tsx       # Status and controls
│   │   ├── ResultsPanel.tsx      # Detection results display
│   │   └── SettingsPanel.tsx     # Configuration options
├── hooks/
│   ├── useGeoAI.ts              # Main AI operations hook
│   ├── useMapState.ts           # Map state management
│   └── useDrawing.ts            # Drawing interactions
├── context/
│   └── GeoAIContext.tsx         # Global state management
├── types/
│   └── geoai.ts                 # TypeScript definitions
└── utils/
    ├── mapUtils.ts              # Map helper functions
    └── geoUtils.ts              # GeoJSON utilities
```

## Step 1: Define TypeScript Types

Create `src/types/geoai.ts`:

```typescript
export interface DetectionSettings {
  confidenceScore: number;
  zoomLevel: number;
  provider: "geobase" | "mapbox";
  task: string;
}

export interface AIState {
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  currentTask: string;
  supportedTasks: string[];
}

export interface DetectionResult {
  id: string;
  timestamp: number;
  settings: DetectionSettings;
  polygon: GeoJSON.Feature;
  detections: GeoJSON.FeatureCollection;
  processingTime: number;
}

export interface MapState {
  center: [number, number];
  zoom: number;
  currentPolygon: GeoJSON.Feature | null;
  isDrawing: boolean;
  showResults: boolean;
}

export interface GeoAIContextType {
  // AI State
  aiState: AIState;
  settings: DetectionSettings;
  results: DetectionResult[];

  // Map State
  mapState: MapState;

  // Actions
  updateSettings: (settings: Partial<DetectionSettings>) => void;
  runDetection: (polygon: GeoJSON.Feature) => Promise<void>;
  clearResults: () => void;
  updateMapState: (state: Partial<MapState>) => void;
}
```

## Step 2: Create Global Context

Create `src/context/GeoAIContext.tsx`:

```typescript
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useOptimizedGeoAI } from '@geobase-js/geoai/hooks';
import type { GeoAIContextType, DetectionSettings, DetectionResult, MapState } from '../types/geoai';

const GeoAIContext = createContext<GeoAIContextType | null>(null);

interface State {
  settings: DetectionSettings;
  results: DetectionResult[];
  mapState: MapState;
}

type Action =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<DetectionSettings> }
  | { type: 'ADD_RESULT'; payload: DetectionResult }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'UPDATE_MAP_STATE'; payload: Partial<MapState> };

const initialState: State = {
  settings: {
    confidenceScore: 0.8,
    zoomLevel: 18,
    provider: 'geobase',
    task: 'object-detection'
  },
  results: [],
  mapState: {
    center: [-74.006, 40.7128],
    zoom: 16,
    currentPolygon: null,
    isDrawing: false,
    showResults: true
  }
};

function geoaiReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    case 'ADD_RESULT':
      return {
        ...state,
        results: [action.payload, ...state.results.slice(0, 9)] // Keep last 10 results
      };

    case 'CLEAR_RESULTS':
      return {
        ...state,
        results: []
      };

    case 'UPDATE_MAP_STATE':
      return {
        ...state,
        mapState: { ...state.mapState, ...action.payload }
      };

    default:
      return state;
  }
}

export function GeoAIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(geoaiReducer, initialState);

  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    runOptimizedInference,
    clearError
  } = useOptimizedGeoAI(state.settings.task);

  // Initialize AI model when settings change
  React.useEffect(() => {
    const config = {
      task: state.settings.task,
      provider: state.settings.provider,
      ...(state.settings.provider === 'geobase' ? {
        projectRef: process.env.REACT_APP_GEOBASE_PROJECT_REF!,
        apikey: process.env.REACT_APP_GEOBASE_API_KEY!,
      } : {
        apiKey: process.env.REACT_APP_MAPBOX_TOKEN!,
        style: 'mapbox://styles/mapbox/satellite-v9'
      })
    };

    initializeModel(config);
  }, [state.settings.task, state.settings.provider, initializeModel]);

  // Handle AI results
  React.useEffect(() => {
    if (lastResult?.detections && state.mapState.currentPolygon) {
      const result: DetectionResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        settings: state.settings,
        polygon: state.mapState.currentPolygon,
        detections: lastResult.detections,
        processingTime: 0 // TODO: Track actual processing time
      };

      dispatch({ type: 'ADD_RESULT', payload: result });
    }
  }, [lastResult, state.mapState.currentPolygon, state.settings]);

  const updateSettings = useCallback((newSettings: Partial<DetectionSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  }, []);

  const runDetection = useCallback(async (polygon: GeoJSON.Feature) => {
    if (!isInitialized) {
      throw new Error('AI model not initialized');
    }

    dispatch({ type: 'UPDATE_MAP_STATE', payload: { currentPolygon: polygon } });

    runOptimizedInference(polygon, state.settings.zoomLevel, {
      task: state.settings.task,
      confidenceScore: state.settings.confidenceScore
    });
  }, [isInitialized, runOptimizedInference, state.settings]);

  const clearResults = useCallback(() => {
    dispatch({ type: 'CLEAR_RESULTS' });
  }, []);

  const updateMapState = useCallback((newMapState: Partial<MapState>) => {
    dispatch({ type: 'UPDATE_MAP_STATE', payload: newMapState });
  }, []);

  const contextValue: GeoAIContextType = {
    aiState: {
      isInitialized,
      isProcessing,
      error,
      currentTask: state.settings.task,
      supportedTasks: ['object-detection', 'building-detection', 'car-detection'] // From your registry
    },
    settings: state.settings,
    results: state.results,
    mapState: state.mapState,
    updateSettings,
    runDetection,
    clearResults,
    updateMapState
  };

  return (
    <GeoAIContext.Provider value={contextValue}>
      {children}
    </GeoAIContext.Provider>
  );
}

export function useGeoAIContext() {
  const context = useContext(GeoAIContext);
  if (!context) {
    throw new Error('useGeoAIContext must be used within a GeoAIProvider');
  }
  return context;
}
```

## Step 3: Advanced Map Component

Create `src/components/Map/MapComponent.tsx`:

```typescript
import React, { useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import MaplibreDraw from 'maplibre-gl-draw';
import { useGeoAIContext } from '../../context/GeoAIContext';
import { createMapStyle } from '../../utils/mapUtils';

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);

  const {
    mapState,
    settings,
    results,
    updateMapState,
    runDetection
  } = useGeoAIContext();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: createMapStyle(settings.provider),
      center: mapState.center,
      zoom: mapState.zoom
    });

    // Add drawing controls
    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      styles: [
        // Custom drawing styles
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          paint: {
            'fill-color': '#3bb2d0',
            'fill-opacity': 0.2
          }
        },
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          paint: {
            'line-color': '#3bb2d0',
            'line-width': 2
          }
        }
      ]
    });

    map.current.addControl(draw.current);

    // Map event handlers
    map.current.on('moveend', () => {
      if (map.current) {
        updateMapState({
          center: map.current.getCenter().toArray() as [number, number],
          zoom: map.current.getZoom()
        });
      }
    });

    // Drawing event handlers
    map.current.on('draw.create', handlePolygonCreate);
    map.current.on('draw.update', handlePolygonUpdate);
    map.current.on('draw.delete', handlePolygonDelete);

    return () => map.current?.remove();
  }, [settings.provider]);

  const handlePolygonCreate = useCallback((e: any) => {
    const polygon = e.features[0];
    updateMapState({ currentPolygon: polygon, isDrawing: false });

    // Auto-run detection if enabled
    runDetection(polygon).catch(console.error);
  }, [updateMapState, runDetection]);

  const handlePolygonUpdate = useCallback((e: any) => {
    const polygon = e.features[0];
    updateMapState({ currentPolygon: polygon });
  }, [updateMapState]);

  const handlePolygonDelete = useCallback(() => {
    updateMapState({ currentPolygon: null });
  }, [updateMapState]);

  // Display detection results
  useEffect(() => {
    if (!map.current || !mapState.showResults) return;

    // Clear existing results
    if (map.current.getSource('ai-results')) {
      map.current.removeLayer('ai-results-fill');
      map.current.removeLayer('ai-results-line');
      map.current.removeSource('ai-results');
    }

    // Add current results
    const currentResult = results[0]; // Most recent
    if (currentResult?.detections) {
      map.current.addSource('ai-results', {
        type: 'geojson',
        data: currentResult.detections
      });

      map.current.addLayer({
        id: 'ai-results-fill',
        type: 'fill',
        source: 'ai-results',
        paint: {
          'fill-color': [
            'case',
            ['>', ['get', 'confidence'], 0.9], '#00ff00',
            ['>', ['get', 'confidence'], 0.7], '#ffff00',
            '#ff9900'
          ],
          'fill-opacity': 0.6
        }
      });

      map.current.addLayer({
        id: 'ai-results-line',
        type: 'line',
        source: 'ai-results',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2
        }
      });

      // Add click handlers for popups
      map.current.on('click', 'ai-results-fill', (e) => {
        if (e.features?.[0]) {
          const feature = e.features[0];
          const popup = new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(createPopupContent(feature.properties))
            .addTo(map.current!);
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'ai-results-fill', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'ai-results-fill', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    }
  }, [results, mapState.showResults]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}

function createPopupContent(properties: any): string {
  return `
    <div class="p-2">
      <h3 class="font-bold text-lg">Detection Result</h3>
      <div class="mt-2 space-y-1">
        <p><strong>Type:</strong> ${properties.class || 'Object'}</p>
        <p><strong>Confidence:</strong> ${Math.round((properties.confidence || 0) * 100)}%</p>
        <p><strong>Area:</strong> ${properties.area || 'N/A'} m²</p>
      </div>
    </div>
  `;
}
```

## Step 4: Smart Status Panel

Create `src/components/UI/StatusPanel.tsx`:

```typescript
import React from 'react';
import { useGeoAIContext } from '../../context/GeoAIContext';

export function StatusPanel() {
  const { aiState, settings, results, updateSettings, clearResults } = useGeoAIContext();

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <h2 className="text-xl font-bold">AI Detection Control</h2>

      {/* AI Status */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            aiState.isInitialized ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm">
            {aiState.isInitialized ? 'AI Ready' : 'Initializing...'}
          </span>
        </div>

        {aiState.isProcessing && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {aiState.error && (
          <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
            {aiState.error}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <h3 className="font-semibold">Detection Settings</h3>

        <div>
          <label className="block text-sm font-medium mb-1">AI Task</label>
          <select
            value={settings.task}
            onChange={(e) => updateSettings({ task: e.target.value })}
            className="w-full border rounded px-2 py-1"
          >
            {aiState.supportedTasks.map(task => (
              <option key={task} value={task}>
                {task.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Confidence: {Math.round(settings.confidenceScore * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={settings.confidenceScore}
            onChange={(e) => updateSettings({ confidenceScore: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Map Provider</label>
          <select
            value={settings.provider}
            onChange={(e) => updateSettings({ provider: e.target.value as 'geobase' | 'mapbox' })}
            className="w-full border rounded px-2 py-1"
          >
            <option value="geobase">Geobase</option>
            <option value="mapbox">Mapbox</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Recent Results</h3>
            <button
              onClick={clearResults}
              className="text-red-600 text-sm hover:text-red-800"
            >
              Clear All
            </button>
          </div>

          <div className="text-sm text-gray-600">
            {results.length} detection{results.length !== 1 ? 's' : ''} saved
          </div>

          {results[0] && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              Latest: {results[0].detections.features.length} objects found
              <br />
              <span className="text-gray-500">
                {new Date(results[0].timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Step 5: Results Visualization Panel

Create `src/components/UI/ResultsPanel.tsx`:

```typescript
import React, { useState } from 'react';
import { useGeoAIContext } from '../../context/GeoAIContext';

export function ResultsPanel() {
  const { results, mapState, updateMapState } = useGeoAIContext();
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-semibold mb-2">Detection Results</h3>
        <p className="text-gray-500 text-sm">
          No detections yet. Draw a polygon on the map to start.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Detection Results</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={mapState.showResults}
            onChange={(e) => updateMapState({ showResults: e.target.checked })}
          />
          <span className="text-sm">Show on map</span>
        </label>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((result) => (
          <div
            key={result.id}
            className={`p-3 border rounded cursor-pointer transition-colors ${
              selectedResult === result.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedResult(
              selectedResult === result.id ? null : result.id
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">
                  {result.detections.features.length} objects detected
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(result.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">
                  Task: {result.settings.task} •
                  Confidence: {Math.round(result.settings.confidenceScore * 100)}%
                </div>
              </div>
              <div className="text-lg">
                {selectedResult === result.id ? '▼' : '▶'}
              </div>
            </div>

            {selectedResult === result.id && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <h4 className="font-medium">Object Details:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.detections.features.map((feature, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span>{feature.properties?.class || 'Object'}</span>
                        <span className="font-mono">
                          {Math.round((feature.properties?.confidence || 0) * 100)}%
                        </span>
                      </div>
                      {feature.properties?.area && (
                        <div className="text-gray-500">
                          Area: {Math.round(feature.properties.area)} m²
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportResult(result);
                  }}
                  className="w-full mt-2 bg-blue-600 text-white py-1 px-2 rounded text-sm hover:bg-blue-700"
                >
                  Export GeoJSON
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function exportResult(result: DetectionResult) {
  const dataStr = JSON.stringify(result.detections, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const exportFileDefaultName = `detection-${result.timestamp}.geojson`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}
```

## Step 6: Main Application

Update `src/App.tsx`:

```typescript
import React from 'react';
import { GeoAIProvider } from './context/GeoAIContext';
import { MapComponent } from './components/Map/MapComponent';
import { StatusPanel } from './components/UI/StatusPanel';
import { ResultsPanel } from './components/UI/ResultsPanel';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'maplibre-gl-draw/dist/maplibre-gl-draw.css';

function App() {
  return (
    <GeoAIProvider>
      <div className="h-screen flex">
        {/* Sidebar */}
        <div className="w-96 bg-gray-100 p-4 space-y-4 overflow-y-auto">
          <StatusPanel />
          <ResultsPanel />
        </div>

        {/* Main Map */}
        <div className="flex-1">
          <MapComponent />
        </div>
      </div>
    </GeoAIProvider>
  );
}

export default App;
```

## Step 7: Utility Functions

Create `src/utils/mapUtils.ts`:

```typescript
import type { StyleSpecification } from "maplibre-gl";

export function createMapStyle(
  provider: "geobase" | "mapbox"
): StyleSpecification {
  if (provider === "geobase") {
    return {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: [
            `https://${process.env.REACT_APP_GEOBASE_PROJECT_REF}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?apikey=${process.env.REACT_APP_GEOBASE_API_KEY}`,
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "satellite-layer",
          type: "raster",
          source: "satellite",
        },
      ],
    };
  }

  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [
          `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg90?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}`,
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "satellite-layer",
        type: "raster",
        source: "satellite",
      },
    ],
  };
}

export function calculatePolygonArea(polygon: GeoJSON.Feature): number {
  // Simple area calculation - use turf.js for production
  if (polygon.geometry.type !== "Polygon") return 0;

  const coords = polygon.geometry.coordinates[0];
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1];
    area -= coords[i + 1][0] * coords[i][1];
  }

  return Math.abs(area) / 2;
}
```

## 🎉 Congratulations!

You now have a production-ready React application with:

- ✅ **Clean Architecture**: Separated concerns with Context, hooks, and components
- ✅ **Type Safety**: Comprehensive TypeScript definitions
- ✅ **State Management**: Global state with Context API and useReducer
- ✅ **Real-time Updates**: Reactive UI that responds to AI results
- ✅ **Performance**: Optimized rendering and memory management
- ✅ **User Experience**: Professional UI with status indicators and error handling

## 🎯 Key Patterns Learned

1. **Context + Reducer**: Scalable state management for complex applications
2. **Custom Hooks**: Reusable logic for AI operations and map interactions
3. **Component Composition**: Modular architecture with single responsibilities
4. **TypeScript**: Type-safe development with comprehensive interfaces
5. **Performance**: Memoization and optimized re-rendering

## 🚀 Next Steps

Ready for more advanced topics?

- **[Tutorial 3: Web Worker Optimization](./03-web-worker-optimization.md)** - Advanced performance patterns
- **[Tutorial 4: Multiple AI Tasks](./04-multiple-ai-tasks.md)** - Chain multiple AI models
- **[Performance Guide](../guides/performance-optimization.md)** - Production optimization techniques

## 📝 Best Practices Summary

- **Always use TypeScript** for complex geospatial applications
- **Separate AI logic** from UI components with custom hooks
- **Manage global state** with Context API for shared data
- **Optimize re-renders** with proper dependency arrays
- **Handle errors gracefully** with user-friendly messages
- **Export results** in standard formats like GeoJSON

You're now equipped to build enterprise-grade geospatial AI applications with React!
