# useGeoAIWorker Hook

> React hook for managing GeoAI worker lifecycle and operations

The `useGeoAIWorker` hook provides a clean interface for managing AI model initialization, inference operations, and state management in React applications.

## Basic Usage

```typescript
import { useOptimizedGeoAI } from '@geobase-js/geoai/hooks';

function MyComponent() {
  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    runOptimizedInference,
    clearError
  } = useOptimizedGeoAI('object-detection');

  // Initialize model on mount
  useEffect(() => {
    initializeModel({
      task: 'object-detection',
      provider: 'geobase',
      projectRef: 'your-project-ref',
      apikey: 'your-api-key'
    });
  }, [initializeModel]);

  const handleDetection = () => {
    runOptimizedInference(polygon, zoomLevel, {
      task: 'object-detection',
      confidenceScore: 0.8
    });
  };

  return (
    <div>
      {isInitialized ? 'Ready' : 'Loading...'}
      {isProcessing && 'Processing...'}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## API Reference

### Parameters

| Parameter  | Type     | Description                                                               |
| ---------- | -------- | ------------------------------------------------------------------------- |
| `taskName` | `string` | The AI task to initialize (see [Supported Models](./supported-models.md)) |

### Return Value

The hook returns an object with the following properties:

#### State Properties

| Property        | Type                        | Description                                         |
| --------------- | --------------------------- | --------------------------------------------------- |
| `isInitialized` | `boolean`                   | Whether the AI model is ready for inference         |
| `isProcessing`  | `boolean`                   | Whether an inference operation is currently running |
| `error`         | `string \| null`            | Current error message, if any                       |
| `lastResult`    | `GeoAIWorkerResult \| null` | Most recent inference result                        |

#### Action Methods

| Method                  | Signature                                                                                   | Description                                |
| ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `initializeModel`       | `(config: InitConfig) => void`                                                              | Initialize the AI model with configuration |
| `runInference`          | `(params: InferenceParams) => void`                                                         | Run inference with detailed parameters     |
| `runOptimizedInference` | `(polygon: GeoJSON.Feature, zoomLevel: number, options?: Partial<InferenceParams>) => void` | Run inference with optimized parameters    |
| `clearError`            | `() => void`                                                                                | Clear the current error state              |
| `reset`                 | `() => void`                                                                                | Reset the entire worker state              |

## Type Definitions

### InitConfig

```typescript
interface InitConfig {
  task: string;
  provider: "geobase" | "mapbox";
  projectRef?: string;
  apikey?: string;
  apiKey?: string;
  cogImagery?: string;
  style?: string;
  modelId?: string;
  chain_config?: {
    task: string;
    modelId?: string;
    modelParams?: any;
  }[];
}
```

### InferenceParams

```typescript
interface InferenceParams {
  polygon: GeoJSON.Feature;
  classLabel?: string;
  confidenceScore: number;
  zoomLevel: number;
  topk?: number;
  nmsThreshold?: number;
  minArea?: number;
  inputPoint?: any;
  maxMasks?: number;
  task: string;
}
```

### GeoAIWorkerResult

```typescript
interface GeoAIWorkerResult {
  detections?: GeoJSON.FeatureCollection;
  geoRawImage?: any;
  [key: string]: any;
}
```

## Advanced Usage

### Multiple Models

```typescript
function MultiModelComponent() {
  const objectDetection = useOptimizedGeoAI('object-detection');
  const buildingDetection = useOptimizedGeoAI('building-detection');

  // Initialize both models
  useEffect(() => {
    objectDetection.initializeModel({
      task: 'object-detection',
      provider: 'geobase',
      // ... config
    });

    buildingDetection.initializeModel({
      task: 'building-detection',
      provider: 'geobase',
      // ... config
    });
  }, []);

  return (
    <div>
      <button
        onClick={() => objectDetection.runOptimizedInference(polygon, 18)}
        disabled={!objectDetection.isInitialized}
      >
        Detect Objects
      </button>

      <button
        onClick={() => buildingDetection.runOptimizedInference(polygon, 18)}
        disabled={!buildingDetection.isInitialized}
      >
        Detect Buildings
      </button>
    </div>
  );
}
```

### Custom Parameters

```typescript
function CustomDetection() {
  const { runInference, isInitialized } = useOptimizedGeoAI('zero-shot-object-detection');

  const handleCustomDetection = () => {
    runInference({
      polygon: myPolygon,
      zoomLevel: 18,
      task: 'zero-shot-object-detection',
      classLabel: 'solar panels, wind turbines',
      confidenceScore: 0.7,
      topk: 20
    });
  };

  return (
    <button onClick={handleCustomDetection} disabled={!isInitialized}>
      Find Renewable Energy
    </button>
  );
}
```

### Error Handling

```typescript
function ErrorHandlingExample() {
  const { error, clearError, isProcessing } = useOptimizedGeoAI('object-detection');

  useEffect(() => {
    if (error) {
      // Log error to monitoring service
      console.error('GeoAI Error:', error);

      // Show user notification
      showNotification('AI processing failed. Please try again.');

      // Auto-clear error after 5 seconds
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div>
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={clearError}>✕</button>
        </div>
      )}
      {isProcessing && <div className="spinner">Processing...</div>}
    </div>
  );
}
```

## Performance Considerations

### Memory Management

The hook automatically manages worker lifecycle and cleans up resources when the component unmounts. However, for optimal performance:

```typescript
function OptimizedComponent() {
  const worker = useOptimizedGeoAI('object-detection');

  // Clear results periodically to prevent memory leaks
  useEffect(() => {
    const interval = setInterval(() => {
      if (worker.lastResult) {
        // Process or save result, then clear
        processResult(worker.lastResult);
        worker.reset();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [worker]);

  return <div>...</div>;
}
```

### Debouncing

For frequent inference calls, consider debouncing:

```typescript
import { debounce } from 'lodash';

function DebouncedDetection() {
  const { runOptimizedInference } = useOptimizedGeoAI('object-detection');

  const debouncedInference = useMemo(
    () => debounce((polygon, zoom) => {
      runOptimizedInference(polygon, zoom);
    }, 500),
    [runOptimizedInference]
  );

  return <div>...</div>;
}
```

## Troubleshooting

### Common Issues

**Hook returns `isInitialized: false` indefinitely**

- Check your API keys and network connectivity
- Verify the task name is valid
- Check browser console for errors

**Inference fails silently**

- Ensure the model is initialized before calling inference
- Verify the polygon is valid GeoJSON
- Check that required parameters are provided

**Memory usage increases over time**

- Call `reset()` periodically to clear worker state
- Avoid storing large results in component state
- Process results immediately and clear them

### Debug Mode

Enable debug logging:

```typescript
const worker = useOptimizedGeoAI("object-detection");

useEffect(() => {
  // Enable debug mode in development
  if (process.env.NODE_ENV === "development") {
    window.geoaiDebug = true;
  }
}, []);
```

## Related

- [Supported Models](./supported-models.md) - Available AI tasks and models
- [Configuration Options](./configuration.md) - Provider and parameter options
- [Performance Guide](../guides/performance-optimization.md) - Optimization techniques
- [Error Handling Guide](../guides/error-handling.md) - Error handling patterns
