# Usage Examples

## Core Package Import

```javascript
// For vanilla JS or non-React applications
import { geoai } from "@geobase-js/geoai";

const pipeline = await geoai.pipeline(
  [
    {
      task: "object-detection",
      modelId: "geobase/WALDO30_yolov8m_640x640",
    },
  ],
  {
    provider: "mapbox",
    apiKey: "your-key",
  }
);
```

## React Hooks Import

```javascript
// For React applications
import { useGeoAIWorker, useOptimizedGeoAI } from "@geobase-js/geoai/react";

function MyComponent() {
  const { isInitialized, runInference } = useGeoAIWorker();

  // ... component logic
}
```

## Combined Usage in React

```javascript
// You can use both if needed
import { geoai } from "@geobase-js/geoai";
import { useGeoAIWorker } from "@geobase-js/geoai/react";

function App() {
  const worker = useGeoAIWorker();

  // Use core API for validation
  const validChains = geoai.validateChain(["object-detection", "mask-generation"]);

  // Use React hooks for UI interactions
  const handleInference = () => {
    worker.runInference({...});
  };
}
```

## Package.json Dependencies

For core usage only:

```json
{
  "dependencies": {
    "@geobase-js/geoai": "^0.0.1"
  }
}
```

For React usage:

```json
{
  "dependencies": {
    "@geobase-js/geoai": "^0.0.1",
    "react": "^18.0.0"
  }
}
```
