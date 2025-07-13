# Choosing Map Providers

> Complete guide to selecting and configuring map providers for optimal AI performance

This guide helps you choose the right map provider for your geospatial AI application based on your specific requirements, budget, and performance needs.

## Overview

GeoAI.js supports multiple map providers, each with unique strengths, pricing models, and capabilities. The right choice depends on your application's requirements for image quality, coverage, update frequency, and cost constraints.

## Supported Providers

### 🌍 Geobase (Recommended)

**Best for: AI applications requiring high-resolution, frequently updated imagery**

```typescript
const geobaseConfig = {
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key",
  cogImagery: "https://your-cog-imagery-url.tif",
};
```

**Strengths:**

- ✅ **AI-Optimized**: Specifically designed for machine learning applications
- ✅ **High Resolution**: Up to 30cm/pixel resolution globally
- ✅ **Frequent Updates**: Updated imagery every 2-4 weeks
- ✅ **Cloud-Optimized**: COG (Cloud Optimized GeoTIFF) format for fast access
- ✅ **Global Coverage**: Worldwide coverage with consistent quality
- ✅ **AI-Ready Metadata**: Includes capture dates, cloud coverage, and quality metrics

**Use Cases:**

- Real-time monitoring applications
- Construction progress tracking
- Agricultural monitoring
- Environmental change detection
- Urban planning and development

**Pricing:**

- Pay-per-use model
- Free tier: 1,000 requests/month
- Production: $0.50-2.00 per 1,000 requests (varies by resolution)

### 🗺️ Mapbox

**Best for: Established applications with custom styling needs**

```typescript
const mapboxConfig = {
  provider: "mapbox",
  apiKey: "your-mapbox-token",
  style: "mapbox://styles/mapbox/satellite-v9",
};
```

**Strengths:**

- ✅ **Mature Platform**: Well-established with extensive documentation
- ✅ **Custom Styling**: Advanced map styling and customization options
- ✅ **Vector Tiles**: Efficient vector-based rendering
- ✅ **Global CDN**: Fast worldwide content delivery
- ✅ **Developer Tools**: Excellent SDK and development experience

**Limitations:**

- ❌ **AI Optimization**: Not specifically optimized for ML workflows
- ❌ **Update Frequency**: Less frequent imagery updates
- ❌ **Resolution Limits**: Lower maximum resolution in some areas

**Use Cases:**

- Consumer-facing applications
- Navigation and routing
- Custom map visualizations
- Multi-platform applications

**Pricing:**

- Tile-based pricing
- Free tier: 50,000 requests/month
- Production: $0.50-5.00 per 1,000 requests

### 🛰️ Google Maps

**Best for: Integration with Google ecosystem**

```typescript
const googleConfig = {
  provider: "google",
  apiKey: "your-google-maps-key",
  mapType: "satellite",
};
```

**Strengths:**

- ✅ **High Quality**: Excellent imagery quality in urban areas
- ✅ **Integration**: Seamless Google ecosystem integration
- ✅ **Street View**: Additional Street View data available
- ✅ **Places API**: Rich location and business data

**Limitations:**

- ❌ **Pricing**: Can be expensive for high-volume applications
- ❌ **AI Features**: Limited ML-specific optimizations
- ❌ **Flexibility**: Less customization options

**Pricing:**

- Request-based pricing
- $7.00 per 1,000 requests for satellite imagery

### 🏢 Esri ArcGIS

**Best for: Enterprise GIS applications**

```typescript
const esriConfig = {
  provider: "esri",
  apiKey: "your-esri-token",
  layer: "World_Imagery",
};
```

**Strengths:**

- ✅ **Enterprise Focus**: Built for enterprise GIS workflows
- ✅ **Analysis Tools**: Advanced spatial analysis capabilities
- ✅ **Data Layers**: Rich collection of authoritative data layers
- ✅ **On-Premise**: Option for on-premise deployment

**Limitations:**

- ❌ **Complexity**: Steeper learning curve
- ❌ **Cost**: Higher cost for small-scale applications

## Provider Comparison Matrix

| Feature                  | Geobase    | Mapbox     | Google Maps | Esri ArcGIS |
| ------------------------ | ---------- | ---------- | ----------- | ----------- |
| **AI Optimization**      | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐        | ⭐⭐⭐      |
| **Image Quality**        | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐    |
| **Update Frequency**     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐⭐⭐    | ⭐⭐⭐      |
| **Global Coverage**      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐    |
| **Cost Efficiency**      | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐        | ⭐⭐        |
| **Developer Experience** | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐    | ⭐⭐⭐      |
| **Customization**        | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐      | ⭐⭐⭐⭐    |
| **Enterprise Support**   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐  |

## Decision Framework

### 1. Application Type Assessment

#### Real-Time Monitoring Applications

```
Requirements:
✓ High update frequency
✓ Consistent global quality
✓ AI-optimized imagery
✓ Fast processing

Recommended: Geobase
```

#### Consumer Applications

```
Requirements:
✓ Visual appeal
✓ Custom styling
✓ Cost efficiency
✓ Broad device support

Recommended: Mapbox
```

#### Enterprise GIS

```
Requirements:
✓ Data integration
✓ Advanced analysis
✓ Compliance features
✓ On-premise options

Recommended: Esri ArcGIS
```

#### Research & Academic

```
Requirements:
✓ High accuracy
✓ Temporal consistency
✓ Cost efficiency
✓ Global coverage

Recommended: Geobase
```

### 2. Technical Requirements

#### High-Resolution AI Detection

```typescript
// Optimal configuration for object detection
const aiOptimizedConfig = {
  provider: "geobase",
  projectRef: "your-project",
  apikey: "your-key",
  cogImagery: "your-imagery-url",
  // AI-specific settings
  resolution: "30cm", // Higher resolution for better detection
  bands: ["red", "green", "blue"], // RGB for standard AI models
  format: "cog", // Cloud-optimized for fast access
  cache: true, // Enable caching for repeated analysis
};
```

#### Multi-Temporal Analysis

```typescript
// Configuration for change detection
const temporalConfig = {
  provider: "geobase",
  projectRef: "your-project",
  apikey: "your-key",
  temporalRange: {
    start: "2024-01-01",
    end: "2024-12-31",
    interval: "monthly",
  },
  consistency: "high", // Ensures temporal consistency
};
```

#### Large-Scale Processing

```typescript
// Configuration for batch processing
const batchConfig = {
  provider: "geobase",
  projectRef: "your-project",
  apikey: "your-key",
  optimization: {
    concurrent: 10, // Parallel requests
    cache: true,
    compression: "webp", // Reduce bandwidth
    tileSize: 512, // Optimal for batch processing
  },
};
```

### 3. Cost Optimization

#### Volume-Based Pricing Analysis

```typescript
// Calculate costs for different providers
function calculateCosts(monthlyRequests: number) {
  const providers = {
    geobase: {
      free: 1000,
      cost: 1.0, // per 1,000 requests
    },
    mapbox: {
      free: 50000,
      cost: 2.0,
    },
    google: {
      free: 0,
      cost: 7.0,
    },
  };

  const costs = {};

  for (const [provider, pricing] of Object.entries(providers)) {
    const billableRequests = Math.max(0, monthlyRequests - pricing.free);
    costs[provider] = (billableRequests / 1000) * pricing.cost;
  }

  return costs;
}

// Example: 100,000 requests/month
const monthlyCosts = calculateCosts(100000);
// geobase: $99/month
// mapbox: $100/month
// google: $700/month
```

#### Cost Optimization Strategies

```typescript
// Implement intelligent caching
const costOptimizedConfig = {
  provider: "geobase",
  caching: {
    strategy: "aggressive",
    ttl: 3600000, // 1 hour
    maxSize: "500MB",
    compression: true,
  },
  requestOptimization: {
    batchRequests: true,
    reuseConnections: true,
    compressionLevel: 6,
  },
};
```

## Implementation Examples

### Dynamic Provider Switching

```typescript
import { geoai } from "@geobase-js/geoai";

class DynamicProviderManager {
  private providers: Map<string, any> = new Map();
  private currentProvider: string = "geobase";

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Geobase configuration
    this.providers.set("geobase", {
      provider: "geobase",
      projectRef: process.env.GEOBASE_PROJECT_REF,
      apikey: process.env.GEOBASE_API_KEY,
      strengths: ["ai-optimized", "high-resolution", "frequent-updates"],
      costPerRequest: 1.0,
    });

    // Mapbox configuration
    this.providers.set("mapbox", {
      provider: "mapbox",
      apiKey: process.env.MAPBOX_TOKEN,
      style: "mapbox://styles/mapbox/satellite-v9",
      strengths: ["custom-styling", "vector-tiles", "developer-tools"],
      costPerRequest: 2.0,
    });

    // Google configuration
    this.providers.set("google", {
      provider: "google",
      apiKey: process.env.GOOGLE_MAPS_KEY,
      mapType: "satellite",
      strengths: ["image-quality", "google-integration", "places-api"],
      costPerRequest: 7.0,
    });
  }

  selectOptimalProvider(requirements: {
    aiOptimized?: boolean;
    budget?: number;
    customStyling?: boolean;
    updateFrequency?: "high" | "medium" | "low";
    imageQuality?: "high" | "medium" | "low";
  }): string {
    let scores: { [provider: string]: number } = {};

    for (const [name, config] of this.providers) {
      let score = 0;

      // AI optimization weight
      if (
        requirements.aiOptimized &&
        config.strengths.includes("ai-optimized")
      ) {
        score += 10;
      }

      // Budget considerations
      if (requirements.budget) {
        const costScore = Math.max(0, 10 - config.costPerRequest);
        score += costScore;
      }

      // Custom styling needs
      if (
        requirements.customStyling &&
        config.strengths.includes("custom-styling")
      ) {
        score += 8;
      }

      // Image quality requirements
      if (
        requirements.imageQuality === "high" &&
        config.strengths.includes("high-resolution")
      ) {
        score += 7;
      }

      // Update frequency needs
      if (
        requirements.updateFrequency === "high" &&
        config.strengths.includes("frequent-updates")
      ) {
        score += 6;
      }

      scores[name] = score;
    }

    // Return provider with highest score
    return Object.entries(scores).reduce((a, b) =>
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];
  }

  async switchProvider(newProvider: string) {
    if (!this.providers.has(newProvider)) {
      throw new Error(`Provider '${newProvider}' not supported`);
    }

    this.currentProvider = newProvider;
    const config = this.providers.get(newProvider);

    // Reinitialize pipeline with new provider
    const pipeline = await geoai.pipeline(
      [{ task: "object-detection" }],
      config
    );

    return pipeline;
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  getProviderInfo(provider: string) {
    return this.providers.get(provider);
  }
}

// Usage example
const providerManager = new DynamicProviderManager();

// Select provider based on requirements
const optimalProvider = providerManager.selectOptimalProvider({
  aiOptimized: true,
  budget: 5000, // $5000/month budget
  updateFrequency: "high",
  imageQuality: "high",
});

console.log(`Recommended provider: ${optimalProvider}`);
// Output: "Recommended provider: geobase"
```

### Multi-Provider Fallback System

```typescript
class MultiProviderSystem {
  private providers: string[] = ["geobase", "mapbox", "google"];
  private currentIndex: number = 0;
  private providerManager: DynamicProviderManager;

  constructor() {
    this.providerManager = new DynamicProviderManager();
  }

  async executeWithFallback<T>(
    operation: (pipeline: any) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = this.providers[this.currentIndex];

      try {
        const pipeline = await this.providerManager.switchProvider(provider);
        const result = await operation(pipeline);

        // Reset to primary provider on success
        this.currentIndex = 0;
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider '${provider}' failed:`, error.message);

        // Switch to next provider
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;

        // If we've tried all providers, wait before retrying
        if (this.currentIndex === 0 && attempt < maxRetries - 1) {
          await this.delay(1000 * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example
const multiProvider = new MultiProviderSystem();

const result = await multiProvider.executeWithFallback(async pipeline => {
  return await pipeline.inference({
    inputs: { polygon: myPolygon },
    mapSourceParams: { zoomLevel: 18 },
  });
});
```

### Provider Performance Monitoring

```typescript
class ProviderPerformanceMonitor {
  private metrics: Map<string, ProviderMetrics> = new Map();

  recordRequest(
    provider: string,
    duration: number,
    success: boolean,
    cost: number
  ) {
    if (!this.metrics.has(provider)) {
      this.metrics.set(provider, {
        totalRequests: 0,
        successfulRequests: 0,
        totalDuration: 0,
        totalCost: 0,
        averageResponseTime: 0,
        successRate: 0,
        costPerRequest: 0,
      });
    }

    const metrics = this.metrics.get(provider)!;
    metrics.totalRequests++;
    metrics.totalDuration += duration;
    metrics.totalCost += cost;

    if (success) {
      metrics.successfulRequests++;
    }

    // Update calculated metrics
    metrics.averageResponseTime = metrics.totalDuration / metrics.totalRequests;
    metrics.successRate = metrics.successfulRequests / metrics.totalRequests;
    metrics.costPerRequest = metrics.totalCost / metrics.totalRequests;
  }

  getRecommendation(): { provider: string; reason: string } {
    const providers = Array.from(this.metrics.entries());

    if (providers.length === 0) {
      return {
        provider: "geobase",
        reason: "Default recommendation for AI applications",
      };
    }

    // Score each provider based on multiple factors
    const scored = providers.map(([name, metrics]) => {
      let score = 0;

      // Success rate (40% weight)
      score += metrics.successRate * 40;

      // Response time (30% weight) - lower is better
      const responseTimeScore = Math.max(
        0,
        30 - metrics.averageResponseTime / 1000
      );
      score += responseTimeScore;

      // Cost efficiency (30% weight) - lower cost is better
      const costScore = Math.max(0, 30 - metrics.costPerRequest * 5);
      score += costScore;

      return { name, score, metrics };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    return {
      provider: best.name,
      reason: `Best overall performance: ${best.score.toFixed(1)}/100 score (${(best.metrics.successRate * 100).toFixed(1)}% success rate, ${best.metrics.averageResponseTime.toFixed(0)}ms avg response time, $${best.metrics.costPerRequest.toFixed(2)} per request)`,
    };
  }

  getPerformanceReport(): { [provider: string]: ProviderMetrics } {
    return Object.fromEntries(this.metrics);
  }
}

interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  totalDuration: number;
  totalCost: number;
  averageResponseTime: number;
  successRate: number;
  costPerRequest: number;
}
```

## Best Practices

### 1. Provider Configuration

```typescript
// Environment-based configuration
const getProviderConfig = () => {
  const env = process.env.NODE_ENV;

  switch (env) {
    case "development":
      return {
        provider: "geobase",
        // Use development keys with lower rate limits
        projectRef: process.env.GEOBASE_DEV_PROJECT_REF,
        apikey: process.env.GEOBASE_DEV_API_KEY,
      };

    case "staging":
      return {
        provider: "geobase",
        // Use staging environment
        projectRef: process.env.GEOBASE_STAGING_PROJECT_REF,
        apikey: process.env.GEOBASE_STAGING_API_KEY,
      };

    case "production":
      return {
        provider: "geobase",
        // Use production keys with higher limits
        projectRef: process.env.GEOBASE_PROD_PROJECT_REF,
        apikey: process.env.GEOBASE_PROD_API_KEY,
        // Production optimizations
        cache: true,
        compression: true,
        retry: 3,
      };

    default:
      throw new Error(`Unknown environment: ${env}`);
  }
};
```

### 2. Error Handling

```typescript
// Robust error handling for provider issues
async function handleProviderErrors<T>(
  operation: () => Promise<T>,
  provider: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error.response?.status === 429) {
      // Rate limit exceeded
      throw new Error(
        `Rate limit exceeded for ${provider}. Consider upgrading your plan or implementing request throttling.`
      );
    } else if (error.response?.status === 401) {
      // Authentication error
      throw new Error(
        `Authentication failed for ${provider}. Check your API keys.`
      );
    } else if (error.response?.status === 403) {
      // Permission error
      throw new Error(
        `Permission denied for ${provider}. Verify your account permissions.`
      );
    } else if (error.code === "NETWORK_ERROR") {
      // Network issues
      throw new Error(
        `Network error connecting to ${provider}. Check your internet connection.`
      );
    } else {
      // Generic error
      throw new Error(`Provider error (${provider}): ${error.message}`);
    }
  }
}
```

### 3. Performance Optimization

```typescript
// Optimize requests based on provider capabilities
const optimizeForProvider = (provider: string, config: any) => {
  switch (provider) {
    case "geobase":
      return {
        ...config,
        // Optimize for AI workloads
        tileSize: 512,
        format: "cog",
        compression: "webp",
        concurrent: 8,
      };

    case "mapbox":
      return {
        ...config,
        // Optimize for vector tiles
        tileSize: 256,
        format: "mvt",
        retina: true,
        concurrent: 4,
      };

    case "google":
      return {
        ...config,
        // Optimize for Google's infrastructure
        tileSize: 256,
        format: "jpeg",
        concurrent: 2, // Lower concurrency to avoid rate limits
      };

    default:
      return config;
  }
};
```

## Migration Guide

### From Mapbox to Geobase

```typescript
// Before (Mapbox)
const mapboxConfig = {
  provider: "mapbox",
  apiKey: "pk.ey...",
  style: "mapbox://styles/mapbox/satellite-v9",
};

// After (Geobase)
const geobaseConfig = {
  provider: "geobase",
  projectRef: "your-project-ref",
  apikey: "your-api-key",
  cogImagery: "https://your-imagery-url.tif",
};

// Migration helper
function migrateToGeobase(mapboxConfig: any): any {
  return {
    provider: "geobase",
    projectRef: process.env.GEOBASE_PROJECT_REF,
    apikey: process.env.GEOBASE_API_KEY,
    // Map Mapbox-specific settings
    resolution: getEquivalentResolution(mapboxConfig.style),
    format: "cog", // More efficient than Mapbox tiles for AI
  };
}
```

## Summary

**Choose Geobase when you need:**

- AI-optimized imagery
- High update frequency
- Global consistency
- Cost-effective scaling

**Choose Mapbox when you need:**

- Custom map styling
- Vector tile performance
- Mature developer ecosystem
- Navigation features

**Choose Google Maps when you need:**

- Google ecosystem integration
- Street View data
- Places API integration
- Maximum image quality in urban areas

**Choose Esri when you need:**

- Enterprise GIS features
- Advanced spatial analysis
- On-premise deployment
- Authoritative data layers

The right choice depends on balancing your specific requirements for AI performance, cost, customization, and integration needs.
