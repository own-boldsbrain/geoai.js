# Map Style Migration Guide

This guide explains how to migrate from inline map style definitions to the new reusable `createBaseMapStyle` function.

## Overview

The `createBaseMapStyle` function in `src/utils/mapStyleUtils.ts` eliminates duplication across example pages by providing a centralized way to create map styles with different configurations for various map providers.

## Migration Steps

### 1. Import the function

Add this import to your page:

```typescript
import { createBaseMapStyle } from "../../../utils/mapStyleUtils";
```

### 2. Replace inline map style with function call

**Before:**
```typescript
const mapStyle: StyleSpecification = {
  version: 8 as const,
  sources: {
    "mapbox-base": {
      type: "raster",
      tiles: [
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_CONFIG.apiKey}`,
      ],
      tileSize: 512,
    },
    "geobase-tiles": {
      type: "raster",
              tiles: [
          `/geoai-live/api/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${GEOBASE_CONFIG.cogImagery}&apikey=${GEOBASE_CONFIG.apikey}`,
        ],
      tileSize: 256,
    },
    // ... more sources and layers
  },
  layers: [
    // ... layer definitions
  ],
};
```

**After:**
```typescript
const mapStyle = createBaseMapStyle({
  mapProvider,
  geobaseConfig: GEOBASE_CONFIG,
  mapboxConfig: MAPBOX_CONFIG,
}, {
  includeMapboxBase: true,
  mapboxTileStyle: 'satellite-v9',
  maxZoom: 23
});
```

## Configuration Options

The `createBaseMapStyle` function accepts these options:

### `includeMapboxBase` (boolean, default: false)
- `true`: Includes Mapbox streets-v12 base layer (used for geobase provider)
- `false`: No base layer

### `mapboxTileStyle` ('satellite' | 'satellite-v9', default: 'satellite-v9')
- `'satellite'`: Uses older Mapbox satellite tiles (`mapbox.satellite`)
- `'satellite-v9'`: Uses newer Mapbox satellite tiles (`mapbox/styles/v1/mapbox/satellite-v9`)

### `maxZoom` (number, default: 23)
- Maximum zoom level for all layers

### `includeGlyphs` (boolean, default: false)
- `true`: Includes glyphs configuration for text rendering
- `false`: No glyphs configuration

## Common Patterns

### Pattern 1: With Mapbox Base Layer (most common)
```typescript
const mapStyle = createBaseMapStyle({
  mapProvider,
  geobaseConfig: GEOBASE_CONFIG,
  mapboxConfig: MAPBOX_CONFIG,
}, {
  includeMapboxBase: true,
  mapboxTileStyle: 'satellite-v9',
  maxZoom: 23
});
```

### Pattern 2: Without Mapbox Base Layer
```typescript
const mapStyle = createBaseMapStyle({
  mapProvider,
  geobaseConfig: GEOBASE_CONFIG,
  mapboxConfig: MAPBOX_CONFIG,
}, {
  includeMapboxBase: false,
  mapboxTileStyle: 'satellite',
  maxZoom: 22
});
```

### Pattern 3: With Glyphs Support
```typescript
const mapStyle = createBaseMapStyle({
  mapProvider,
  geobaseConfig: GEOBASE_CONFIG,
  mapboxConfig: MAPBOX_CONFIG,
}, {
  includeMapboxBase: false,
  mapboxTileStyle: 'satellite',
  maxZoom: 22,
  includeGlyphs: true
});
```

## Files Successfully Migrated ✅

All example pages have been successfully migrated to use the new `createBaseMapStyle` function:

- ✅ `src/app/tasks/building-detection/page.tsx`
- ✅ `src/app/tasks/mask-generation/page.tsx`
- ✅ `src/app/tasks/embedding-similarity-search/page.tsx`
- ✅ `src/app/tasks/land-cover-classification/page.tsx`
- ✅ `src/app/tasks/ship-detection/page.tsx`
- ✅ `src/app/tasks/solar-panel-detection/page.tsx`
- ✅ `src/app/tasks/zero-shot-segmentation/page.tsx`
- ✅ `src/app/tasks/building-footprint-segmentation/page.tsx`
- ✅ `src/app/tasks/wetland-segmentation/page.tsx`
- ✅ `src/app/tasks/oriented-object-detection/page.tsx`
- ✅ `src/app/tasks/object-detection/page.tsx`
- ✅ `src/app/tasks/car-detection/page.tsx`
- ✅ `src/app/tasks/zero-shot-object-detection/page.tsx`
- ✅ `src/app/tasks/oil-storage-tank-detection/page.tsx`

## Migration Complete! 🎉

All 14 example pages have been successfully migrated to use the reusable `createBaseMapStyle` function. This eliminates approximately **700 lines of duplicated code** across the codebase.

## Benefits

1. **Reduced Duplication**: Eliminates ~50 lines of duplicated code per page
2. **Consistency**: Ensures all pages use the same base map configuration
3. **Maintainability**: Changes to map providers only need to be made in one place
4. **Flexibility**: Easy to configure different options for different use cases
5. **Type Safety**: Full TypeScript support with proper interfaces
