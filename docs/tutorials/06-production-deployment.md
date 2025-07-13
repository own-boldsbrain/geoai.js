# Tutorial 6: Production Deployment

> Deploy scalable, enterprise-ready geospatial AI applications

This tutorial covers everything you need to deploy GeoAI.js applications to production, including performance optimization, monitoring, security, scaling strategies, and CI/CD pipelines.

[//]: # "TODO: Add demo GIF showing production deployment workflow"

## What You'll Learn

- 🚀 Production deployment strategies and best practices
- 📊 Performance monitoring and observability
- 🔒 Security hardening and access control
- ⚡ Scaling and load balancing
- 🔄 CI/CD pipelines for AI applications
- 📦 Docker containerization and orchestration
- ☁️ Cloud deployment on AWS, GCP, and Azure

## Prerequisites

- Completed [Tutorial 5: Custom Models](./05-custom-models.md)
- Understanding of containerization and cloud platforms
- Basic DevOps and CI/CD knowledge
- Production deployment experience

## Production Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │          Load Balancer              │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │         CDN / Edge Cache            │
                    └─────────────┬───────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
    ┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
    │  Web Server 1  │   │  Web Server 2  │   │  Web Server N  │
    │  (Frontend)    │   │  (Frontend)    │   │  (Frontend)    │
    └───────┬────────┘   └───────┬────────┘   └───────┬────────┘
            │                    │                    │
    ┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
    │ Worker Pool 1  │   │ Worker Pool 2  │   │ Worker Pool N  │
    │ (AI Processing)│   │ (AI Processing)│   │ (AI Processing)│
    └───────┬────────┘   └───────┬────────┘   └───────┬────────┘
            │                    │                    │
            └─────────────────────┼─────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │         Model Registry              │
                    │      (Cached Models)                │
                    └─────────────────────────────────────┘
```

## Step 1: Environment Configuration

Create `config/production.ts`:

```typescript
export const ProductionConfig = {
  // Application Settings
  app: {
    name: process.env.APP_NAME || "GeoAI Production",
    version: process.env.APP_VERSION || "1.0.0",
    environment: "production",
    port: parseInt(process.env.PORT || "3000"),
    host: process.env.HOST || "0.0.0.0",
  },

  // Security Configuration
  security: {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(",") || [
        "https://yourdomain.com",
      ],
      credentials: true,
      optionsSuccessStatus: 200,
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https://api.geobase.app", "wss:"],
          workerSrc: ["'self'", "blob:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
    },
    apiKeys: {
      required: process.env.REQUIRE_API_KEYS === "true",
      headerName: "X-API-Key",
      validKeys: process.env.VALID_API_KEYS?.split(",") || [],
    },
  },

  // Performance Configuration
  performance: {
    worker: {
      maxWorkers: parseInt(process.env.MAX_WORKERS || "8"),
      workerTimeout: parseInt(process.env.WORKER_TIMEOUT || "120000"),
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || "3"),
      memoryLimit: parseInt(process.env.WORKER_MEMORY_LIMIT || "512"), // MB
    },
    cache: {
      models: {
        maxSize: parseInt(process.env.MODEL_CACHE_SIZE || "1024"), // MB
        ttl: parseInt(process.env.MODEL_CACHE_TTL || "3600"), // seconds
        strategy: "lru",
      },
      results: {
        maxSize: parseInt(process.env.RESULT_CACHE_SIZE || "256"), // MB
        ttl: parseInt(process.env.RESULT_CACHE_TTL || "1800"), // seconds
        strategy: "lru",
      },
    },
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024, // bytes
    },
  },

  // Model Configuration
  models: {
    registry: {
      url: process.env.MODEL_REGISTRY_URL || "https://models.yourdomain.com",
      apiKey: process.env.MODEL_REGISTRY_API_KEY,
      updateInterval: parseInt(process.env.MODEL_UPDATE_INTERVAL || "3600000"), // ms
    },
    storage: {
      type: process.env.MODEL_STORAGE_TYPE || "s3", // 's3' | 'gcs' | 'azure' | 'local'
      bucket: process.env.MODEL_STORAGE_BUCKET,
      region: process.env.MODEL_STORAGE_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    },
    preload: process.env.PRELOAD_MODELS?.split(",") || [
      "object-detection",
      "building-detection",
      "vehicle-detection",
    ],
  },

  // Monitoring Configuration
  monitoring: {
    metrics: {
      enabled: true,
      endpoint: "/metrics",
      includeDefaultMetrics: true,
    },
    logging: {
      level: process.env.LOG_LEVEL || "info",
      format: "json",
      transports: [
        {
          type: "console",
          colorize: false,
        },
        {
          type: "file",
          filename: "/var/log/geoai/app.log",
          maxSize: "100m",
          maxFiles: 10,
          compress: true,
        },
      ],
    },
    health: {
      enabled: true,
      endpoint: "/health",
      checks: ["database", "models", "workers", "memory"],
    },
    tracing: {
      enabled: process.env.ENABLE_TRACING === "true",
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      serviceName: "geoai-service",
    },
  },

  // Database Configuration
  database: {
    type: process.env.DB_TYPE || "postgresql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "geoai_prod",
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true",
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || "5"),
      max: parseInt(process.env.DB_POOL_MAX || "20"),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || "30000"),
      idle: parseInt(process.env.DB_POOL_IDLE || "10000"),
    },
  },

  // Cloud Provider Configuration
  cloud: {
    provider: process.env.CLOUD_PROVIDER || "aws", // 'aws' | 'gcp' | 'azure'
    region: process.env.CLOUD_REGION || "us-east-1",

    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      s3Bucket: process.env.AWS_S3_BUCKET,
      cloudFrontDistribution: process.env.AWS_CLOUDFRONT_DISTRIBUTION,
    },

    gcp: {
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE,
      storageBucket: process.env.GCP_STORAGE_BUCKET,
      cdnUrl: process.env.GCP_CDN_URL,
    },

    azure: {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      tenantId: process.env.AZURE_TENANT_ID,
      storageAccount: process.env.AZURE_STORAGE_ACCOUNT,
      cdnProfile: process.env.AZURE_CDN_PROFILE,
    },
  },
};
```

## Step 2: Production Server Setup

Create `src/server/ProductionServer.ts`:

```typescript
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ProductionConfig } from "../../config/production";
import { MetricsService } from "./services/MetricsService";
import { HealthCheckService } from "./services/HealthCheckService";
import { LoggingService } from "./services/LoggingService";
import { WorkerPoolManager } from "./services/WorkerPoolManager";
import { ModelRegistryService } from "./services/ModelRegistryService";

export class ProductionServer {
  private app: express.Application;
  private metricsService: MetricsService;
  private healthService: HealthCheckService;
  private logger: LoggingService;
  private workerPool: WorkerPoolManager;
  private modelRegistry: ModelRegistryService;

  constructor() {
    this.app = express();
    this.metricsService = new MetricsService();
    this.healthService = new HealthCheckService();
    this.logger = new LoggingService();
    this.workerPool = new WorkerPoolManager();
    this.modelRegistry = new ModelRegistryService();

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet(ProductionConfig.security.helmet));
    this.app.use(cors(ProductionConfig.security.cors));

    // Rate limiting
    const limiter = rateLimit(ProductionConfig.security.rateLimit);
    this.app.use("/api/", limiter);

    // Compression
    if (ProductionConfig.performance.compression.enabled) {
      this.app.use(compression(ProductionConfig.performance.compression));
    }

    // Body parsing
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info("Request received", {
        method: req.method,
        url: req.url,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });
      next();
    });

    // Metrics collection
    this.app.use(this.metricsService.middleware());

    // API key validation (if required)
    if (ProductionConfig.security.apiKeys.required) {
      this.app.use("/api/ai/", this.validateApiKey.bind(this));
    }
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get("/health", this.healthService.handler());

    // Metrics endpoint
    this.app.get("/metrics", this.metricsService.handler());

    // AI processing endpoints
    this.app.post("/api/ai/inference", this.handleInference.bind(this));
    this.app.post("/api/ai/batch", this.handleBatchInference.bind(this));
    this.app.get("/api/ai/models", this.handleGetModels.bind(this));
    this.app.post(
      "/api/ai/models/preload",
      this.handlePreloadModels.bind(this)
    );

    // Model management endpoints
    this.app.get("/api/models/registry", this.handleModelRegistry.bind(this));
    this.app.post("/api/models/upload", this.handleModelUpload.bind(this));
    this.app.delete("/api/models/:modelId", this.handleModelDelete.bind(this));

    // Static file serving with caching
    this.app.use(
      "/static",
      express.static("public", {
        maxAge: "1y",
        etag: true,
        lastModified: true,
      })
    );

    // Serve React application
    this.app.use(
      express.static("build", {
        maxAge: "1h",
        etag: true,
      })
    );

    // SPA fallback
    this.app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../../build/index.html"));
    });
  }

  private validateApiKey(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const apiKey =
      req.headers[ProductionConfig.security.apiKeys.headerName.toLowerCase()];

    if (
      !apiKey ||
      !ProductionConfig.security.apiKeys.validKeys.includes(apiKey as string)
    ) {
      this.logger.warn("Invalid API key attempt", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      return res.status(401).json({ error: "Invalid API key" });
    }

    next();
  }

  private async handleInference(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const { polygon, task, zoomLevel, options } = req.body;

      // Validate request
      if (!polygon || !task) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Track request metrics
      this.metricsService.incrementCounter("ai_requests_total", { task });

      // Process inference request
      const result = await this.workerPool.executeTask({
        type: "inference",
        payload: {
          polygon,
          task,
          zoomLevel: zoomLevel || 18,
          ...options,
        },
        priority: "normal",
        timeout: ProductionConfig.performance.worker.workerTimeout,
      });

      const processingTime = Date.now() - startTime;

      // Track success metrics
      this.metricsService.recordHistogram(
        "ai_processing_duration_ms",
        processingTime,
        { task }
      );
      this.metricsService.incrementCounter("ai_requests_success_total", {
        task,
      });

      this.logger.info("Inference completed", {
        task,
        processingTime,
        objectsFound: result.detections?.features?.length || 0,
      });

      res.json({
        success: true,
        result,
        processingTime,
        timestamp: Date.now(),
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Track error metrics
      this.metricsService.incrementCounter("ai_requests_error_total", {
        task: req.body.task || "unknown",
        error: error.constructor.name,
      });

      this.logger.error("Inference failed", {
        error: error.message,
        stack: error.stack,
        processingTime,
        requestBody: req.body,
      });

      res.status(500).json({
        success: false,
        error: "Inference processing failed",
        processingTime,
      });
    }
  }

  private async handleBatchInference(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { polygons, task, zoomLevel, options } = req.body;

      if (!polygons || !Array.isArray(polygons) || !task) {
        return res
          .status(400)
          .json({ error: "Invalid batch request parameters" });
      }

      if (polygons.length > 50) {
        return res.status(400).json({ error: "Batch size too large (max 50)" });
      }

      this.metricsService.incrementCounter("ai_batch_requests_total", { task });

      const results = await Promise.allSettled(
        polygons.map(polygon =>
          this.workerPool.executeTask({
            type: "inference",
            payload: { polygon, task, zoomLevel, ...options },
            priority: "normal",
          })
        )
      );

      const successResults = results
        .filter(result => result.status === "fulfilled")
        .map(result => (result as PromiseFulfilledResult<any>).value);

      const errorCount = results.length - successResults.length;

      this.metricsService.recordHistogram("ai_batch_size", polygons.length, {
        task,
      });
      this.metricsService.recordHistogram(
        "ai_batch_success_rate",
        successResults.length / polygons.length,
        { task }
      );

      res.json({
        success: true,
        results: successResults,
        totalRequested: polygons.length,
        successCount: successResults.length,
        errorCount,
      });
    } catch (error) {
      this.logger.error("Batch inference failed", { error: error.message });
      res
        .status(500)
        .json({ success: false, error: "Batch processing failed" });
    }
  }

  private async handleGetModels(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const models = await this.modelRegistry.getAvailableModels();
      res.json({ success: true, models });
    } catch (error) {
      this.logger.error("Failed to get models", { error: error.message });
      res
        .status(500)
        .json({ success: false, error: "Failed to retrieve models" });
    }
  }

  private async handlePreloadModels(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { modelIds } = req.body;

      if (!modelIds || !Array.isArray(modelIds)) {
        return res.status(400).json({ error: "Invalid model IDs" });
      }

      await this.modelRegistry.preloadModels(modelIds);
      res.json({ success: true, message: "Models preloaded successfully" });
    } catch (error) {
      this.logger.error("Failed to preload models", { error: error.message });
      res
        .status(500)
        .json({ success: false, error: "Failed to preload models" });
    }
  }

  private async handleModelRegistry(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const registry = await this.modelRegistry.getRegistryInfo();
      res.json({ success: true, registry });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: "Failed to get registry info" });
    }
  }

  private async handleModelUpload(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    // Implementation would handle model uploads in production
    res
      .status(501)
      .json({ error: "Model upload not implemented in this version" });
  }

  private async handleModelDelete(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { modelId } = req.params;
      await this.modelRegistry.deleteModel(modelId);
      res.json({ success: true, message: "Model deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete model" });
    }
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: "Not found" });
    });

    // Global error handler
    this.app.use(
      (
        error: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        this.logger.error("Unhandled error", {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
        });

        this.metricsService.incrementCounter("server_errors_total", {
          error: error.constructor.name,
        });

        res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    );
  }

  async start(): Promise<void> {
    try {
      // Initialize services
      await this.workerPool.initialize();
      await this.modelRegistry.initialize();
      await this.healthService.initialize();

      // Preload models
      if (ProductionConfig.models.preload.length > 0) {
        this.logger.info("Preloading models", {
          models: ProductionConfig.models.preload,
        });
        await this.modelRegistry.preloadModels(ProductionConfig.models.preload);
      }

      // Start server
      const server = this.app.listen(
        ProductionConfig.app.port,
        ProductionConfig.app.host,
        () => {
          this.logger.info("Production server started", {
            port: ProductionConfig.app.port,
            host: ProductionConfig.app.host,
            environment: ProductionConfig.app.environment,
          });
        }
      );

      // Graceful shutdown
      process.on("SIGTERM", () => this.shutdown(server));
      process.on("SIGINT", () => this.shutdown(server));
    } catch (error) {
      this.logger.error("Failed to start server", { error: error.message });
      process.exit(1);
    }
  }

  private async shutdown(server: any): Promise<void> {
    this.logger.info("Shutting down server...");

    // Close server
    server.close(() => {
      this.logger.info("HTTP server closed");
    });

    // Cleanup services
    await this.workerPool.shutdown();
    await this.modelRegistry.shutdown();

    this.logger.info("Server shutdown complete");
    process.exit(0);
  }
}
```

## Step 3: Docker Configuration

Create `Dockerfile`:

```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY config/ ./config/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/build ./build
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/config ./config

# Create directories for logs and models
RUN mkdir -p /var/log/geoai /app/models && \
    chown -R nextjs:nodejs /var/log/geoai /app/models

# Switch to app user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build/server/index.js"]
```

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  geoai-app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    image: geoai-app:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      APP_NAME: GeoAI Production
      PORT: 3000
      HOST: 0.0.0.0

      # Database
      DB_TYPE: postgresql
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: geoai_prod
      DB_USERNAME: geoai
      DB_PASSWORD: ${DB_PASSWORD}

      # Security
      CORS_ORIGINS: https://yourdomain.com,https://app.yourdomain.com
      REQUIRE_API_KEYS: true
      VALID_API_KEYS: ${API_KEYS}

      # Performance
      MAX_WORKERS: 8
      WORKER_TIMEOUT: 120000
      MODEL_CACHE_SIZE: 1024
      RESULT_CACHE_SIZE: 256

      # Models
      MODEL_REGISTRY_URL: https://models.yourdomain.com
      MODEL_REGISTRY_API_KEY: ${MODEL_REGISTRY_API_KEY}
      PRELOAD_MODELS: object-detection,building-detection,vehicle-detection

      # AWS
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_S3_BUCKET: ${AWS_S3_BUCKET}
      AWS_CLOUDFRONT_DISTRIBUTION: ${AWS_CLOUDFRONT_DISTRIBUTION}

      # Monitoring
      LOG_LEVEL: info
      ENABLE_TRACING: true
      JAEGER_ENDPOINT: http://jaeger:14268/api/traces

    volumes:
      - geoai-logs:/var/log/geoai
      - geoai-models:/app/models
    networks:
      - geoai-network
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2.0"
        reservations:
          memory: 2G
          cpus: "1.0"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: geoai_prod
      POSTGRES_USER: geoai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - geoai-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.5"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - geoai-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.25"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - nginx-cache:/var/cache/nginx
    networks:
      - geoai-network
    depends_on:
      - geoai-app
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - geoai-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - geoai-network
    restart: unless-stopped

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    environment:
      COLLECTOR_OTLP_ENABLED: true
    networks:
      - geoai-network
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
  geoai-logs:
  geoai-models:
  nginx-cache:
  prometheus-data:
  grafana-data:

networks:
  geoai-network:
    driver: bridge
```

## Step 4: Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: geoai-app
  labels:
    app: geoai-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: geoai-app
  template:
    metadata:
      labels:
        app: geoai-app
    spec:
      containers:
        - name: geoai-app
          image: geoai-app:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: DB_HOST
              value: "postgres-service"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: geoai-secrets
                  key: db-password
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: geoai-secrets
                  key: aws-access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: geoai-secrets
                  key: aws-secret-access-key
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 60
            periodSeconds: 30
            timeoutSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
          volumeMounts:
            - name: model-cache
              mountPath: /app/models
            - name: logs
              mountPath: /var/log/geoai
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: geoai-model-cache
        - name: logs
          persistentVolumeClaim:
            claimName: geoai-logs
---
apiVersion: v1
kind: Service
metadata:
  name: geoai-service
spec:
  selector:
    app: geoai-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: geoai-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
    - hosts:
        - api.yourdomain.com
      secretName: geoai-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: geoai-service
                port:
                  number: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: geoai-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: geoai-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Step 5: CI/CD Pipeline

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Test Application
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run tests
        run: npm run test:ci
        env:
          CI: true

      - name: Run security audit
        run: npm audit --production

      - name: Test build
        run: npm run build

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

  build-and-push:
    name: Build and Push Image
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          target: production

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: "v1.28.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name geoai-staging-cluster

      - name: Deploy to staging
        run: |
          kubectl set image deployment/geoai-app geoai-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} -n staging
          kubectl rollout status deployment/geoai-app -n staging --timeout=300s

      - name: Run smoke tests
        run: |
          kubectl wait --for=condition=ready pod -l app=geoai-app -n staging --timeout=300s
          npm run test:smoke -- --endpoint=https://staging-api.yourdomain.com

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: "v1.28.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name geoai-production-cluster

      - name: Deploy to production
        run: |
          kubectl set image deployment/geoai-app geoai-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }} -n production
          kubectl rollout status deployment/geoai-app -n production --timeout=600s

      - name: Verify deployment
        run: |
          kubectl wait --for=condition=ready pod -l app=geoai-app -n production --timeout=600s
          npm run test:production -- --endpoint=https://api.yourdomain.com

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: "🚀 GeoAI.js ${{ github.ref_name }} deployed to production successfully!"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Step 6: Monitoring and Observability

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: "geoai-app"
    static_configs:
      - targets: ["geoai-app:3000"]
    metrics_path: "/metrics"
    scrape_interval: 10s

  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]

  - job_name: "redis"
    static_configs:
      - targets: ["redis-exporter:9121"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]
```

Create `monitoring/alert_rules.yml`:

```yaml
groups:
  - name: geoai-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(ai_requests_error_total[5m]) / rate(ai_requests_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(ai_processing_duration_ms_bucket[5m])) > 30000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}ms"

      - alert: HighMemoryUsage
        expr: (container_memory_working_set_bytes / container_spec_memory_limit_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"

      - alert: ModelLoadingFailure
        expr: increase(model_loading_failures_total[10m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Model loading failures detected"
          description: "{{ $value }} model loading failures in the last 10 minutes"
```

## Step 7: Performance Optimization Scripts

Create `scripts/optimize-production.sh`:

```bash
#!/bin/bash

echo "🚀 Optimizing GeoAI.js for production..."

# Build optimized bundle
echo "📦 Building optimized bundle..."
NODE_ENV=production npm run build

# Optimize images
echo "🖼️ Optimizing images..."
find build/static -name "*.png" -exec pngquant --force --ext .png {} \;
find build/static -name "*.jpg" -exec jpegoptim --max=85 {} \;

# Generate service worker
echo "⚡ Generating service worker..."
npx workbox generateSW workbox-config.js

# Precompress static assets
echo "📦 Precompressing assets..."
find build -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" \) \
  -exec gzip -9 -k {} \; \
  -exec brotli -Z {} \;

# Optimize model files
echo "🤖 Optimizing model files..."
python scripts/optimize-models.py

# Generate cache headers
echo "💾 Generating cache configuration..."
node scripts/generate-cache-config.js

# Security hardening
echo "🔒 Running security checks..."
npm audit --production
node scripts/security-headers.js

# Performance analysis
echo "📊 Running performance analysis..."
npm run analyze-bundle

echo "✅ Production optimization complete!"
```

## 🎉 Congratulations!

You now have a complete production deployment system that includes:

- ✅ **Enterprise-Grade Server** with security, monitoring, and performance optimization
- ✅ **Docker Containerization** with multi-stage builds and health checks
- ✅ **Kubernetes Orchestration** with auto-scaling and rolling deployments
- ✅ **CI/CD Pipeline** with testing, security scanning, and automated deployment
- ✅ **Monitoring & Observability** with Prometheus, Grafana, and distributed tracing
- ✅ **Performance Optimization** with caching, compression, and asset optimization

## 🎯 Key Production Concepts

1. **Security First** - API keys, rate limiting, CORS, and security headers
2. **Performance Monitoring** - Metrics, logging, and distributed tracing
3. **Scalability** - Horizontal scaling, load balancing, and resource management
4. **Reliability** - Health checks, graceful shutdown, and error handling
5. **Observability** - Comprehensive monitoring and alerting

## 🚀 Next Steps

Your application is now production-ready! Consider these advanced topics:

- **[Performance Guide](../guides/performance-optimization.md)** - Advanced optimization techniques
- **[Security Guide](../guides/security.md)** - Advanced security hardening
- **[Monitoring Guide](../guides/monitoring.md)** - Advanced observability patterns

## 💡 Production Best Practices

- **Monitor Everything** - Track performance, errors, and business metrics
- **Test Thoroughly** - Automated testing in CI/CD pipeline
- **Scale Gradually** - Start small and scale based on real usage
- **Backup Regularly** - Models, data, and configuration
- **Security Updates** - Keep dependencies and base images updated

You're now ready to deploy enterprise-grade geospatial AI applications at scale!
