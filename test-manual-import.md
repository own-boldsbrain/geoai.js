# Manual Import Testing Guide

This guide shows how to manually test that the React import separation works correctly.

## Quick Test Commands

Run these commands to verify your build:

```bash
# 1. Build the packages
pnpm build

# 2. Run automated tests
pnpm test test/react-import.test.ts
pnpm test test/react-build.test.ts

# 3. Check files exist
ls -la build/dist/
```

## Testing in a Real Project

### 1. Create a Test React Project

```bash
# Create a new React app for testing
npx create-react-app test-geoai-import --template typescript
cd test-geoai-import
```

### 2. Install Your Built Package

```bash
# Install your built package (simulate publishing)
npm install ../path/to/your/geobase-ai.js/build
```

Or using a local file reference in package.json:
```json
{
  "dependencies": {
    "@geobase-js/geoai": "file:../geobase-ai.js/build"
  }
}
```

### 3. Test Core Import

Create `src/test-core.ts`:
```typescript
import { geoai } from "@geobase-js/geoai";

console.log("Core API:", geoai);
console.log("Available tasks:", geoai.tasks());
console.log("Available models:", geoai.models().length);

export const testCore = () => {
  try {
    const tasks = geoai.tasks();
    const models = geoai.models();
    
    console.log("✅ Core import successful");
    console.log(`Found ${tasks.length} tasks and ${models.length} models`);
    
    return true;
  } catch (error) {
    console.error("❌ Core import failed:", error);
    return false;
  }
};
```

### 4. Test React Import

Create `src/test-react.tsx`:
```typescript
import React from "react";
import { useGeoAIWorker, useOptimizedGeoAI } from "@geobase-js/geoai/react";

export const TestReactHooks: React.FC = () => {
  const { isInitialized, initializeModel, error } = useGeoAIWorker();
  const optimizedHook = useOptimizedGeoAI("object-detection");

  React.useEffect(() => {
    console.log("✅ React hooks imported successfully");
    console.log("useGeoAIWorker:", { isInitialized, error });
    console.log("useOptimizedGeoAI:", !!optimizedHook);
  }, [isInitialized, error, optimizedHook]);

  return (
    <div>
      <h2>React Hook Import Test</h2>
      <p>Initialized: {isInitialized ? "Yes" : "No"}</p>
      <p>Error: {error || "None"}</p>
      <p>Optimized Hook: {optimizedHook ? "Loaded" : "Not loaded"}</p>
      
      <button 
        onClick={() => {
          initializeModel({
            provider: "mapbox",
            apiKey: "test-key",
            task: "object-detection"
          });
        }}
      >
        Test Initialize (will fail without real API key)
      </button>
    </div>
  );
};
```

### 5. Test in App.tsx

Update `src/App.tsx`:
```typescript
import React from 'react';
import { testCore } from './test-core';
import { TestReactHooks } from './test-react';
import './App.css';

function App() {
  React.useEffect(() => {
    // Test core import
    const coreSuccess = testCore();
    
    if (coreSuccess) {
      console.log("🎉 All imports working!");
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>GeoAI Import Test</h1>
        <TestReactHooks />
      </header>
    </div>
  );
}

export default App;
```

## What Should Work

✅ **Core Import**: `import { geoai } from "@geobase-js/geoai"`
- Should work in any JavaScript/TypeScript project
- No React dependency required
- Provides `geoai.pipeline()`, `geoai.tasks()`, `geoai.models()`

✅ **React Import**: `import { useGeoAIWorker } from "@geobase-js/geoai/react"`  
- Should work in React projects only
- Requires React as peer dependency
- Provides React hooks for Web Worker management

✅ **TypeScript Support**:
- Core types available from main import
- React-specific types available from React import
- IDE autocomplete should work for both

## What Should Fail

❌ **Using React hooks in non-React project**: Should give clear error about missing React
❌ **Importing non-existent paths**: Should give module not found errors
❌ **Missing peer dependencies**: Should warn about missing dependencies

## Troubleshooting

If imports fail:

1. **Check build output**: `ls -la build/dist/`
2. **Verify package.json exports**: Check the exports field
3. **Check TypeScript declarations**: Verify `.d.ts` files exist
4. **Test with Node.js**: Try importing in a simple Node script
5. **Check peer dependencies**: Ensure React is installed for React tests

## Development Commands

```bash
# Rebuild packages
pnpm build

# Run all tests
pnpm test

# Test specific import functionality
pnpm test test/react-import.test.ts
pnpm test test/react-build.test.ts

# Check build output
pnpm build && ls -la build/dist/
```