[![Main](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml/badge.svg)](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml)

# @geobase-js/geoai

A JavaScript library for running Geo AI models in frontend applications.

## Installation

```bash
npm install @geobase-js/geoai
```

## Usage

### Core Library (Node.js and Browser)

```javascript
import { geoai } from '@geobase-js/geoai';

// Initialize the pipeline
const pipeline = await geoai.pipeline(
  [{ task: 'object-detection' }],
  { 
    provider: 'geobase',
    apikey: 'your-api-key'
  }
);

// Run inference
const result = await pipeline.inference({
  inputs: {
    polygon: geoJsonFeature
  },
  mapSourceParams: {
    zoomLevel: 18
  }
});
```

### React Hooks (Browser Only)

```javascript
import { useGeoAIWorker, useOptimizedGeoAI } from '@geobase-js/geoai/react';

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

```javascript
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

## Architecture

The library is split into two modules:

- **Core Module** (`@geobase-js/geoai`): Pure JavaScript/TypeScript library that works in both Node.js and browser environments
- **React Module** (`@geobase-js/geoai/react`): React-specific hooks that depend on the core module

This separation ensures:
- ✅ Node.js applications can use the core library without React dependencies
- ✅ Frontend applications can use React hooks for better UX
- ✅ No unnecessary React code in backend bundles
- ✅ Clean separation of concerns

## API Reference

### Core API

- `geoai.pipeline(tasks, config)` - Initialize a pipeline with tasks
- `pipeline.inference(params)` - Run inference with the pipeline

### React Hooks

- `useGeoAIWorker()` - Basic worker hook for AI operations
- `useOptimizedGeoAI(task)` - Optimized hook with task-specific parameter tuning

## Supported Tasks

- Object Detection
- Building Footprint Segmentation
- Land Cover Classification
- Zero-shot Object Detection
- Oriented Object Detection
- Oil Storage Tank Detection
- Ship Detection
- Solar Panel Detection
- Wetland Segmentation
- Mask Generation

## License

MIT
