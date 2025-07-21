# Testing Local Package in Next.js Example

## Quick Start

```bash
# From the root of geobase-ai.js repository
cd examples/next-geobase

# Build main package and install locally
pnpm run build:geobase-ai

# Start development server
pnpm dev

# Or do both in one command
pnpm run build_dev
```

## Test the Import Separation

### Option 1: Visit the Test Page
1. Start the dev server with `pnpm dev`
2. Navigate to http://localhost:3000/test-local-imports
3. Check that both imports show green checkmarks
4. Open browser console to see import details

### Option 2: Manual Testing in Components

Add to any component:
```typescript
import { geoai } from '@geobase-js/geoai';
import { useGeoAIWorker } from '@geobase-js/geoai/react';

export default function TestComponent() {
  const worker = useGeoAIWorker();
  
  useEffect(() => {
    console.log('Available tasks:', geoai.tasks());
    console.log('Worker initialized:', worker.isInitialized);
  }, [worker.isInitialized]);

  return <div>Check console for import test results</div>;
}
```

## What Should Work

✅ **Core Import**: `import { geoai } from "@geobase-js/geoai"`
- Should work in any component
- Provides access to `geoai.pipeline()`, `geoai.tasks()`, `geoai.models()`
- No React dependencies required

✅ **React Import**: `import { useGeoAIWorker } from "@geobase-js/geoai/react"`  
- Should work in React components
- Provides React hooks for Web Worker management
- TypeScript autocomplete should work

## Package Information

The local package is installed from `file:../../build` which means:
- Any changes to the source require rebuilding: `pnpm run build:geobase-ai`
- The package files are symlinked from the build directory
- Hot reloading works for the example, but not the package itself

## Development Workflow

### Making Changes to the Package
```bash
# 1. Make changes to src/ files
# 2. Rebuild the package
pnpm run build:geobase-ai

# 3. Restart Next.js dev server (if needed)
# The imports should reflect your changes
```

### Quick Development Loop
```bash
# Terminal 1: Auto-rebuild on changes (if you set up watch mode)
pnpm build --watch

# Terminal 2: Next.js dev server
cd examples/next-geobase
pnpm dev
```

## Troubleshooting

### "Module not found" Error
```bash
# Check if package is installed
pnpm list @geobase-js/geoai

# Should show: @geobase-js/geoai file:../../build

# If not, reinstall
pnpm install
```

### TypeScript Errors
```bash
# Check if type files exist
ls -la node_modules/@geobase-js/geoai/dist/

# Should see: index.d.ts, react.d.ts

# Clear Next.js cache if needed
rm -rf .next
pnpm dev
```

### Import Path Issues
Make sure you're using:
```typescript
// ✅ Correct
import { geoai } from "@geobase-js/geoai";
import { useGeoAIWorker } from "@geobase-js/geoai/react";

// ❌ Wrong
import { geoai } from "@geobase-js/geoai/dist";
import { useGeoAIWorker } from "../../build/dist";
```

### Build Issues
```bash
# Clean and rebuild everything
cd ../../
rm -rf build examples/next-geobase/node_modules
pnpm build
cd examples/next-geobase
pnpm install
pnpm dev
```

## Verifying the Setup

1. **Check Installation**: `pnpm list @geobase-js/geoai`
2. **Check Files**: `ls -la node_modules/@geobase-js/geoai/dist/`
3. **Test Imports**: Visit `/test-local-imports` page
4. **Check Console**: Should see successful import logs
5. **Check Types**: TypeScript should provide autocomplete

## Scripts Reference

```bash
# Build main package and install locally
pnpm run build:geobase-ai

# Build and start dev server
pnpm run build_dev  

# Just start dev server (if already built)
pnpm dev

# Build for production
pnpm build

# Lint the example code
pnpm lint
```