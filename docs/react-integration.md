# React Integration

The `@geobase-js/geoai` library provides React hooks for easy integration with React applications.

## Architecture

The library is split into two modules to ensure optimal compatibility:

- **Core Module** (`@geobase-js/geoai`): Pure JavaScript/TypeScript library
- **React Module** (`@geobase-js/geoai/react`): React-specific hooks

This separation ensures:
- ✅ Node.js applications can use the core library without React dependencies
- ✅ Frontend applications can use React hooks for better UX
- ✅ No unnecessary React code in backend bundles
- ✅ Clean separation of concerns

## Installation

```bash
npm install @geobase-js/geoai
```

## Usage

### Basic React Hook

```jsx
import { useGeoAIWorker } from '@geobase-js/geoai/react';

function MyComponent() {
  const { 
    isInitialized, 
    isProcessing, 
    error, 
    lastResult,
    initializeModel, 
    runInference 
  } = useGeoAIWorker();

  useEffect(() => {
    initializeModel({
      provider: 'geobase',
      apikey: 'your-api-key',
      task: 'object-detection'
    });
  }, []);

  const handleInference = () => {
    runInference({
      polygon: geoJsonFeature,
      zoomLevel: 18,
      task: 'object-detection',
      confidenceScore: 0.8
    });
  };

  return (
    <div>
      {isProcessing && <p>Processing...</p>}
      {error && <p>Error: {error}</p>}
      {lastResult && <p>Results: {JSON.stringify(lastResult)}</p>}
    </div>
  );
}
```

### Optimized React Hook

```jsx
import { useOptimizedGeoAI } from '@geobase-js/geoai/react';

function OptimizedComponent() {
  const { runOptimizedInference } = useOptimizedGeoAI('object-detection');

  const handleOptimizedInference = () => {
    // Automatically optimizes parameters based on task and zoom level
    runOptimizedInference(geoJsonFeature, 18);
  };

  return <button onClick={handleOptimizedInference}>Run Optimized Inference</button>;
}
```

## API Reference

### useGeoAIWorker()

Returns a hook that manages the GeoAI worker lifecycle.

**Returns:**
- `isInitialized: boolean` - Whether the model is initialized
- `isProcessing: boolean` - Whether inference is currently running
- `error: string | null` - Current error state
- `lastResult: GeoAIWorkerResult | null` - Last inference result
- `initializeModel: (config: InitConfig) => void` - Initialize the model
- `runInference: (params: InferenceParams) => void` - Run inference
- `clearError: () => void` - Clear error state
- `reset: () => void` - Reset all state

### useOptimizedGeoAI(task: string)

Returns a hook with optimized parameters for the specified task.

**Parameters:**
- `task: string` - The AI task to optimize for

**Returns:**
- All properties from `useGeoAIWorker()`
- `runOptimizedInference: (polygon, zoomLevel, options?) => void` - Run inference with optimized parameters

## Supported Tasks

- `object-detection` - Object detection with confidence tuning
- `building-footprint-segmentation` - Building footprint extraction
- `zero-shot-object-detection` - Zero-shot object detection
- `land-cover-classification` - Land cover classification
- `mask-generation` - Mask generation with limited masks

## Worker Architecture

The React hooks use Web Workers to run AI inference in the background, preventing UI blocking during processing.

### Worker Communication

The hooks communicate with a Web Worker that handles:
- Model initialization
- Inference execution
- Error handling
- Result processing

### File Structure

```
src/
├── react/
│   ├── index.ts          # React module exports
│   ├── useGeoAIWorker.ts # React hooks
│   └── worker.ts         # Web Worker implementation
└── index.ts              # Core module exports
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import type { 
  InitConfig, 
  InferenceParams, 
  GeoAIWorkerResult,
  UseGeoAIWorkerReturn 
} from '@geobase-js/geoai/react';
```

## Examples

See the [examples directory](../examples/) for complete working examples including:
- Next.js integration
- Map integration
- Real-time inference
- Error handling
- Loading states 