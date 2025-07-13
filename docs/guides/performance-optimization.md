# Performance Optimization Guide

> Advanced techniques for maximizing GeoAI.js performance in production environments

This comprehensive guide covers performance optimization strategies, profiling techniques, and best practices for building high-performance geospatial AI applications.

## Overview

Performance optimization in geospatial AI applications involves multiple layers: frontend rendering, web worker management, model inference, memory usage, and network optimization. This guide provides actionable strategies for each layer.

## Performance Fundamentals

### Key Performance Metrics

```typescript
interface PerformanceMetrics {
  // Core AI Metrics
  inferenceTime: number; // Model processing time (ms)
  modelLoadTime: number; // Initial model loading (ms)
  workerInitTime: number; // Worker startup time (ms)

  // User Experience Metrics
  firstContentfulPaint: number; // Time to first render (ms)
  timeToInteractive: number; // Time until interactive (ms)
  totalBlockingTime: number; // Main thread blocking time (ms)

  // Resource Metrics
  memoryUsage: number; // Current memory usage (MB)
  peakMemoryUsage: number; // Peak memory usage (MB)
  networkBandwidth: number; // Data transfer rate (MB/s)

  // Efficiency Metrics
  cacheHitRate: number; // Cache effectiveness (0-1)
  errorRate: number; // Request failure rate (0-1)
  throughput: number; // Requests per second
}
```

### Performance Targets

| Metric              | Target | Acceptable | Poor |
| ------------------- | ------ | ---------- | ---- |
| **Inference Time**  | <2s    | 2-5s       | >5s  |
| **Model Load Time** | <10s   | 10-30s     | >30s |
| **Memory Usage**    | <500MB | 500MB-1GB  | >1GB |
| **Cache Hit Rate**  | >80%   | 60-80%     | <60% |
| **Error Rate**      | <1%    | 1-5%       | >5%  |
| **First Paint**     | <1s    | 1-3s       | >3s  |

## 1. Model Optimization

### Model Loading Optimization

```typescript
class OptimizedModelLoader {
  private modelCache: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private preloadQueue: string[] = [];

  constructor() {
    this.initializePreloading();
  }

  // Preload models based on usage patterns
  async preloadModels(
    models: string[],
    priority: "high" | "low" = "low"
  ): Promise<void> {
    const loadPromises = models.map(async modelId => {
      if (!this.modelCache.has(modelId) && !this.loadingPromises.has(modelId)) {
        const loadPromise = this.loadModelOptimized(modelId);
        this.loadingPromises.set(modelId, loadPromise);

        try {
          const model = await loadPromise;
          this.modelCache.set(modelId, model);
          this.loadingPromises.delete(modelId);
        } catch (error) {
          this.loadingPromises.delete(modelId);
          console.warn(`Failed to preload model ${modelId}:`, error);
        }
      }
    });

    if (priority === "high") {
      await Promise.all(loadPromises);
    } else {
      // Low priority: load in background without blocking
      Promise.all(loadPromises).catch(() => {});
    }
  }

  private async loadModelOptimized(modelId: string): Promise<any> {
    const startTime = performance.now();

    try {
      // Use compressed model format when available
      const modelPath = this.getOptimizedModelPath(modelId);

      // Load model with streaming for large models
      const model = await this.streamLoadModel(modelPath);

      // Warm up model with dummy inference
      await this.warmUpModel(model);

      const loadTime = performance.now() - startTime;
      this.recordMetric("modelLoadTime", loadTime, { modelId });

      return model;
    } catch (error) {
      const loadTime = performance.now() - startTime;
      this.recordMetric("modelLoadError", loadTime, {
        modelId,
        error: error.message,
      });
      throw error;
    }
  }

  private getOptimizedModelPath(modelId: string): string {
    // Choose optimal model format based on capabilities
    const formats = ["onnx-optimized", "onnx", "tfjs-optimized", "tfjs"];
    const supportedFormats = this.getSupportedFormats();

    for (const format of formats) {
      if (supportedFormats.includes(format)) {
        return `/models/${modelId}.${format}`;
      }
    }

    throw new Error(`No supported format found for model ${modelId}`);
  }

  private async streamLoadModel(modelPath: string): Promise<any> {
    // Implement streaming loading for large models
    const response = await fetch(modelPath);
    const contentLength = response.headers.get("content-length");

    if (!contentLength) {
      // Fallback to regular loading
      return await geoai.loadModel(modelPath);
    }

    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      // Report progress
      this.reportLoadProgress(modelPath, loaded / total);
    }

    // Combine chunks and load model
    const modelData = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      modelData.set(chunk, offset);
      offset += chunk.length;
    }

    return await geoai.loadModelFromBuffer(modelData);
  }

  private async warmUpModel(model: any): Promise<void> {
    // Perform dummy inference to warm up GPU/compute
    const dummyInput = this.createDummyInput(model.inputShape);

    try {
      await model.predict(dummyInput);
    } catch (error) {
      console.warn("Model warmup failed:", error);
    } finally {
      // Clean up dummy input
      if (dummyInput.dispose) {
        dummyInput.dispose();
      }
    }
  }

  private getSupportedFormats(): string[] {
    const formats: string[] = [];

    // Check WebGL support
    if (this.isWebGLSupported()) {
      formats.push("onnx-optimized", "tfjs-optimized");
    }

    // Check WebAssembly support
    if (this.isWebAssemblySupported()) {
      formats.push("onnx", "tfjs");
    }

    return formats;
  }

  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );
    } catch {
      return false;
    }
  }

  private isWebAssemblySupported(): boolean {
    return typeof WebAssembly === "object";
  }
}
```

### Model Quantization and Compression

```typescript
class ModelOptimizer {
  // Quantize models for better performance
  static async quantizeModel(
    modelPath: string,
    precision: "8bit" | "16bit" = "8bit"
  ): Promise<string> {
    // This would typically be done during build time
    const optimizedPath = `${modelPath}.${precision}`;

    // Check if optimized version exists
    try {
      const response = await fetch(optimizedPath, { method: "HEAD" });
      if (response.ok) {
        return optimizedPath;
      }
    } catch {
      // Fall back to original model
    }

    return modelPath;
  }

  // Compress model data
  static async compressModel(modelData: ArrayBuffer): Promise<ArrayBuffer> {
    // Use compression algorithms like Brotli or GZIP
    const compressionStream = new CompressionStream("gzip");
    const compressedStream = new Response(modelData).body!.pipeThrough(
      compressionStream
    );

    return await new Response(compressedStream).arrayBuffer();
  }

  // Model pruning for smaller size
  static async pruneModel(
    model: any,
    pruningRatio: number = 0.1
  ): Promise<any> {
    // Remove least important weights/connections
    // This is typically done during training, but can be approximated
    console.log(`Pruning model with ratio ${pruningRatio}`);
    return model; // Simplified - actual implementation would modify weights
  }
}
```

## 2. Memory Management

### Advanced Memory Optimization

```typescript
class MemoryManager {
  private memoryThreshold: number = 800 * 1024 * 1024; // 800MB
  private gcInterval: number = 30000; // 30 seconds
  private memoryStats: MemoryStats[] = [];

  constructor() {
    this.startMemoryMonitoring();
    this.setupMemoryPressureHandling();
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();
      this.memoryStats.push(stats);

      // Keep only last 100 measurements
      if (this.memoryStats.length > 100) {
        this.memoryStats.shift();
      }

      // Check for memory pressure
      if (stats.usedJSHeapSize > this.memoryThreshold) {
        this.handleMemoryPressure();
      }
    }, 5000);
  }

  private getMemoryStats(): MemoryStats {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
    }

    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      timestamp: Date.now(),
    };
  }

  private async handleMemoryPressure(): Promise<void> {
    console.warn("Memory pressure detected, initiating cleanup...");

    // Clear caches
    this.clearCaches();

    // Dispose unused tensors
    await this.cleanupTensors();

    // Trigger garbage collection if available
    this.forceGarbageCollection();

    // Reduce worker pool size temporarily
    this.reduceWorkerPool();
  }

  private clearCaches(): void {
    // Clear result caches
    if (window.resultCache) {
      window.resultCache.clear();
    }

    // Clear image caches
    if (window.imageCache) {
      window.imageCache.clear();
    }

    // Clear browser caches programmatically
    if ("caches" in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes("geoai-temp")) {
            caches.delete(name);
          }
        });
      });
    }
  }

  private async cleanupTensors(): Promise<void> {
    // Clean up TensorFlow.js tensors
    if (typeof tf !== "undefined") {
      const numTensorsBefore = tf.memory().numTensors;
      tf.disposeVariables();
      tf.engine().endScope();

      const numTensorsAfter = tf.memory().numTensors;
      console.log(`Cleaned up ${numTensorsBefore - numTensorsAfter} tensors`);
    }
  }

  private forceGarbageCollection(): void {
    // Force GC if available (Chrome dev tools)
    if ("gc" in window) {
      (window as any).gc();
    }

    // Alternative: create memory pressure to trigger GC
    const createPressure = () => {
      const arrays = [];
      for (let i = 0; i < 1000; i++) {
        arrays.push(new Array(1000).fill(0));
      }
      return arrays;
    };

    const pressure = createPressure();
    setTimeout(() => {
      pressure.length = 0; // Release reference
    }, 100);
  }

  private setupMemoryPressureHandling(): void {
    // Listen for memory pressure events (experimental)
    if ("onmemorywarning" in window) {
      window.addEventListener("memorywarning", () => {
        this.handleMemoryPressure();
      });
    }

    // Monitor heap size growth rate
    setInterval(() => {
      const recentStats = this.memoryStats.slice(-10);
      if (recentStats.length >= 10) {
        const growthRate = this.calculateMemoryGrowthRate(recentStats);
        if (growthRate > 0.1) {
          // 10% growth per minute
          console.warn("High memory growth rate detected:", growthRate);
          this.handleMemoryPressure();
        }
      }
    }, 60000);
  }

  private calculateMemoryGrowthRate(stats: MemoryStats[]): number {
    if (stats.length < 2) return 0;

    const first = stats[0];
    const last = stats[stats.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const memoryDiff = last.usedJSHeapSize - first.usedJSHeapSize;

    return memoryDiff / first.usedJSHeapSize / (timeDiff / 60); // per minute
  }
}

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}
```

### Efficient Tensor Management

```typescript
class TensorManager {
  private tensorPool: Map<string, tf.Tensor[]> = new Map();
  private maxPoolSize: number = 10;

  // Reuse tensors to avoid allocation overhead
  getTensor(
    shape: number[],
    dtype: "float32" | "int32" = "float32"
  ): tf.Tensor {
    const key = `${shape.join("x")}_${dtype}`;
    const pool = this.tensorPool.get(key) || [];

    if (pool.length > 0) {
      return pool.pop()!;
    }

    return tf.zeros(shape, dtype);
  }

  returnTensor(tensor: tf.Tensor): void {
    const shape = tensor.shape;
    const dtype = tensor.dtype;
    const key = `${shape.join("x")}_${dtype}`;

    let pool = this.tensorPool.get(key);
    if (!pool) {
      pool = [];
      this.tensorPool.set(key, pool);
    }

    if (pool.length < this.maxPoolSize) {
      // Reset tensor data
      tensor.fill(0);
      pool.push(tensor);
    } else {
      tensor.dispose();
    }
  }

  // Clean up tensor pools
  cleanup(): void {
    for (const [key, pool] of this.tensorPool) {
      pool.forEach(tensor => tensor.dispose());
      pool.length = 0;
    }
    this.tensorPool.clear();
  }

  // Monitor tensor memory usage
  getMemoryInfo(): { numTensors: number; numBytes: number } {
    if (typeof tf !== "undefined") {
      return tf.memory();
    }
    return { numTensors: 0, numBytes: 0 };
  }
}
```

## 3. Network Optimization

### Intelligent Caching Strategy

```typescript
class IntelligentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100 * 1024 * 1024; // 100MB
  private currentSize: number = 0;
  private accessCounts: Map<string, number> = new Map();

  constructor() {
    this.setupCacheEviction();
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600000
  ): Promise<T> {
    const entry = this.cache.get(key);

    if (entry && Date.now() - entry.timestamp < ttl) {
      // Cache hit
      this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
      return entry.data as T;
    }

    // Cache miss - fetch data
    const data = await fetcher();
    const size = this.estimateSize(data);

    // Ensure we have space
    this.ensureSpace(size);

    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
      accessCount: 1,
    });

    this.currentSize += size;
    this.accessCounts.set(key, 1);

    return data;
  }

  private ensureSpace(requiredSize: number): void {
    while (
      this.currentSize + requiredSize > this.maxSize &&
      this.cache.size > 0
    ) {
      // Evict least frequently used items
      const leastUsedKey = this.findLeastUsedKey();
      if (leastUsedKey) {
        const entry = this.cache.get(leastUsedKey)!;
        this.currentSize -= entry.size;
        this.cache.delete(leastUsedKey);
        this.accessCounts.delete(leastUsedKey);
      }
    }
  }

  private findLeastUsedKey(): string | null {
    let minAccess = Infinity;
    let leastUsedKey: string | null = null;

    for (const [key, count] of this.accessCounts) {
      if (count < minAccess) {
        minAccess = count;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  private estimateSize(data: any): number {
    // Rough size estimation
    try {
      return JSON.stringify(data).length * 2; // UTF-16 approximation
    } catch {
      return 1000; // Default estimate
    }
  }

  private setupCacheEviction(): void {
    // Periodic cleanup of expired entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (now - entry.timestamp > 3600000) {
          // 1 hour
          this.currentSize -= entry.size;
          this.cache.delete(key);
          this.accessCounts.delete(key);
        }
      }
    }, 300000); // Check every 5 minutes
  }

  // Preload frequently used data
  async preload(
    keys: string[],
    fetchers: Map<string, () => Promise<any>>
  ): Promise<void> {
    const loadPromises = keys.map(async key => {
      const fetcher = fetchers.get(key);
      if (fetcher && !this.cache.has(key)) {
        try {
          await this.get(key, fetcher);
        } catch (error) {
          console.warn(`Failed to preload ${key}:`, error);
        }
      }
    });

    await Promise.allSettled(loadPromises);
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalAccess = Array.from(this.accessCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const hitRate = totalAccess > 0 ? this.cache.size / totalAccess : 0;

    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      entryCount: this.cache.size,
      hitRate,
      utilizationRate: this.currentSize / this.maxSize,
    };
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  size: number;
  accessCount: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  entryCount: number;
  hitRate: number;
  utilizationRate: number;
}
```

### Request Optimization

```typescript
class RequestOptimizer {
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestQueue: PendingRequest[] = [];
  private concurrentLimit: number = 6;
  private activeRequests: number = 0;

  // Deduplicate identical requests
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const key = this.generateRequestKey(url, options);

    // Check if request is already in progress
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create and queue request
    const promise = this.executeRequest<T>(url, options);
    this.pendingRequests.set(key, promise);

    // Clean up when done
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }

  private async executeRequest<T>(
    url: string,
    options: RequestOptions
  ): Promise<T> {
    // Add to queue if at concurrent limit
    if (this.activeRequests >= this.concurrentLimit) {
      await this.queueRequest(url, options);
    }

    this.activeRequests++;

    try {
      // Add optimizations
      const optimizedOptions = this.optimizeRequest(options);

      // Execute request with retry logic
      const response = await this.retryRequest(url, optimizedOptions);

      return await this.processResponse<T>(response);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private optimizeRequest(options: RequestOptions): RequestInit {
    return {
      ...options,
      // Enable compression
      headers: {
        "Accept-Encoding": "gzip, deflate, br",
        Accept: "application/json, image/webp, */*",
        ...options.headers,
      },
      // Use HTTP/2 server push hints
      cache: options.cache || "force-cache",
      // Enable keep-alive
      keepalive: true,
    };
  }

  private async retryRequest(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.ok) {
          return response;
        }

        if (response.status >= 400 && response.status < 500) {
          // Client error - don't retry
          throw new Error(
            `Client error: ${response.status} ${response.statusText}`
          );
        }

        // Server error - retry with backoff
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && this.isRetryableError(error as Error)) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  private isRetryableError(error: Error): boolean {
    return (
      error.name === "NetworkError" ||
      error.message.includes("fetch") ||
      error.message.includes("timeout")
    );
  }

  private async processResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await response.json();
    } else if (contentType.includes("image/")) {
      return (await response.blob()) as unknown as T;
    } else {
      return (await response.text()) as unknown as T;
    }
  }

  private generateRequestKey(url: string, options: RequestOptions): string {
    return `${options.method || "GET"}:${url}:${JSON.stringify(options.body || {})}`;
  }

  private async queueRequest(
    url: string,
    options: RequestOptions
  ): Promise<void> {
    return new Promise(resolve => {
      this.requestQueue.push({
        url,
        options,
        resolve,
      });
    });
  }

  private processQueue(): void {
    if (
      this.requestQueue.length > 0 &&
      this.activeRequests < this.concurrentLimit
    ) {
      const request = this.requestQueue.shift()!;
      request.resolve();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

interface PendingRequest {
  url: string;
  options: RequestOptions;
  resolve: () => void;
}
```

## 4. Worker Pool Optimization

### Advanced Worker Management

```typescript
class AdvancedWorkerPool {
  private workers: Worker[] = [];
  private workerStates: WorkerState[] = [];
  private taskQueue: PoolTask[] = [];
  private workerAffinity: Map<string, number> = new Map();
  private performanceMetrics: Map<number, WorkerMetrics> = new Map();

  constructor(private maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.initializePool();
    this.startPerformanceMonitoring();
  }

  private initializePool(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker(i);
    }
  }

  private createWorker(index: number): void {
    const worker = new Worker(
      new URL("../workers/optimized-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = e => this.handleWorkerMessage(index, e);
    worker.onerror = e => this.handleWorkerError(index, e);

    this.workers[index] = worker;
    this.workerStates[index] = {
      busy: false,
      currentTask: null,
      totalTasks: 0,
      successfulTasks: 0,
      averageTime: 0,
      memoryUsage: 0,
      specializations: new Set(),
    };

    this.performanceMetrics.set(index, {
      taskTimes: [],
      errorCount: 0,
      memoryPeaks: [],
      specializationScore: new Map(),
    });

    // Initialize worker with optimizations
    worker.postMessage({
      type: "init",
      config: {
        enableOptimizations: true,
        memoryLimit: 256 * 1024 * 1024, // 256MB per worker
        gcThreshold: 0.8,
      },
    });
  }

  async executeTask(task: PoolTask): Promise<any> {
    return new Promise((resolve, reject) => {
      const enhancedTask = {
        ...task,
        id: this.generateTaskId(),
        resolve,
        reject,
        submitTime: performance.now(),
      };

      // Try to assign to specialized worker first
      const specializedWorker = this.findSpecializedWorker(task.type);
      if (specializedWorker !== -1) {
        this.assignTask(specializedWorker, enhancedTask);
        return;
      }

      // Find best available worker
      const availableWorker = this.findBestWorker();
      if (availableWorker !== -1) {
        this.assignTask(availableWorker, enhancedTask);
        return;
      }

      // Queue task if no workers available
      this.taskQueue.push(enhancedTask);
      this.optimizeQueue();
    });
  }

  private findSpecializedWorker(taskType: string): number {
    // Find worker with highest specialization score for this task type
    let bestWorker = -1;
    let bestScore = 0;

    for (let i = 0; i < this.workers.length; i++) {
      const state = this.workerStates[i];
      const metrics = this.performanceMetrics.get(i)!;

      if (!state.busy && state.specializations.has(taskType)) {
        const score = metrics.specializationScore.get(taskType) || 0;
        if (score > bestScore) {
          bestScore = score;
          bestWorker = i;
        }
      }
    }

    return bestWorker;
  }

  private findBestWorker(): number {
    // Find worker with best performance characteristics
    let bestWorker = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < this.workers.length; i++) {
      const state = this.workerStates[i];

      if (!state.busy) {
        // Calculate worker score based on performance
        const metrics = this.performanceMetrics.get(i)!;
        const errorRate = metrics.errorCount / (state.totalTasks || 1);
        const memoryEfficiency = 1 - state.memoryUsage / (256 * 1024 * 1024);
        const speedScore = state.averageTime > 0 ? 1 / state.averageTime : 1;

        const score =
          speedScore * 0.4 + memoryEfficiency * 0.3 + (1 - errorRate) * 0.3;

        if (score > bestScore) {
          bestScore = score;
          bestWorker = i;
        }
      }
    }

    return bestWorker;
  }

  private assignTask(workerIndex: number, task: EnhancedPoolTask): void {
    const state = this.workerStates[workerIndex];
    state.busy = true;
    state.currentTask = task;

    // Send task to worker
    this.workers[workerIndex].postMessage({
      type: "task",
      taskId: task.id,
      payload: task.payload,
      taskType: task.type,
    });

    // Set up timeout
    setTimeout(() => {
      if (state.currentTask?.id === task.id) {
        this.handleTaskTimeout(workerIndex, task);
      }
    }, task.timeout || 30000);
  }

  private handleWorkerMessage(workerIndex: number, event: MessageEvent): void {
    const { type, taskId, result, error, memoryUsage, taskType } = event.data;
    const state = this.workerStates[workerIndex];
    const metrics = this.performanceMetrics.get(workerIndex)!;

    if (type === "taskComplete" && state.currentTask?.id === taskId) {
      const task = state.currentTask;
      const executionTime = performance.now() - task.submitTime;

      // Update performance metrics
      this.updatePerformanceMetrics(
        workerIndex,
        executionTime,
        !error,
        taskType,
        memoryUsage
      );

      // Complete task
      if (error) {
        task.reject(new Error(error));
      } else {
        task.resolve(result);
      }

      // Mark worker as available
      state.busy = false;
      state.currentTask = null;

      // Process next task in queue
      this.processQueue();
    }
  }

  private updatePerformanceMetrics(
    workerIndex: number,
    executionTime: number,
    success: boolean,
    taskType: string,
    memoryUsage: number
  ): void {
    const state = this.workerStates[workerIndex];
    const metrics = this.performanceMetrics.get(workerIndex)!;

    // Update basic stats
    state.totalTasks++;
    if (success) {
      state.successfulTasks++;
    } else {
      metrics.errorCount++;
    }

    // Update average execution time
    metrics.taskTimes.push(executionTime);
    if (metrics.taskTimes.length > 100) {
      metrics.taskTimes.shift(); // Keep only recent times
    }
    state.averageTime =
      metrics.taskTimes.reduce((sum, time) => sum + time, 0) /
      metrics.taskTimes.length;

    // Update memory usage
    state.memoryUsage = memoryUsage;
    metrics.memoryPeaks.push(memoryUsage);
    if (metrics.memoryPeaks.length > 50) {
      metrics.memoryPeaks.shift();
    }

    // Update specialization score
    if (success) {
      state.specializations.add(taskType);
      const currentScore = metrics.specializationScore.get(taskType) || 0;
      metrics.specializationScore.set(taskType, currentScore + 1);
    }
  }

  private optimizeQueue(): void {
    // Sort queue by priority and task affinity
    this.taskQueue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return (
          this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)
        );
      }

      // Group similar tasks together for better caching
      if (a.type === b.type) {
        return a.submitTime - b.submitTime; // FIFO for same type
      }

      return 0;
    });
  }

  private getPriorityValue(priority: string): number {
    const values = { high: 3, normal: 2, low: 1 };
    return values[priority as keyof typeof values] || 2;
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.findBestWorker();
    if (availableWorker !== -1) {
      const task = this.taskQueue.shift()!;
      this.assignTask(availableWorker, task);
    }
  }

  private handleTaskTimeout(workerIndex: number, task: EnhancedPoolTask): void {
    console.warn(`Task ${task.id} timed out on worker ${workerIndex}`);

    // Terminate and recreate worker
    this.workers[workerIndex].terminate();
    this.createWorker(workerIndex);

    // Reject the task
    task.reject(new Error("Task timeout"));

    // Requeue if retryable
    if (task.retries && task.retries > 0) {
      const retryTask = { ...task, retries: task.retries - 1 };
      this.taskQueue.unshift(retryTask);
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.balanceWorkload();
      this.optimizeWorkerCount();
    }, 30000); // Every 30 seconds
  }

  private balanceWorkload(): void {
    // Redistribute specialized workers if needed
    const taskTypes = new Set(this.taskQueue.map(task => task.type));

    for (const taskType of taskTypes) {
      const queuedCount = this.taskQueue.filter(
        task => task.type === taskType
      ).length;
      const specializedCount = this.workerStates.filter(state =>
        state.specializations.has(taskType)
      ).length;

      // If we have many queued tasks of one type but few specialized workers,
      // consider retraining workers
      if (queuedCount > 5 && specializedCount < 2) {
        this.retainWorkerForTask(taskType);
      }
    }
  }

  private retainWorkerForTask(taskType: string): void {
    // Find worker with lowest specialization diversity
    let candidateWorker = -1;
    let lowestDiversity = Infinity;

    for (let i = 0; i < this.workers.length; i++) {
      const state = this.workerStates[i];
      if (!state.busy && state.specializations.size < lowestDiversity) {
        lowestDiversity = state.specializations.size;
        candidateWorker = i;
      }
    }

    if (candidateWorker !== -1) {
      // Clear previous specializations and focus on new task type
      const state = this.workerStates[candidateWorker];
      state.specializations.clear();
      state.specializations.add(taskType);

      console.log(`Retrained worker ${candidateWorker} for ${taskType}`);
    }
  }

  private optimizeWorkerCount(): void {
    const queueLength = this.taskQueue.length;
    const activeWorkers = this.workerStates.filter(state => state.busy).length;
    const totalWorkers = this.workers.length;

    // Scale up if queue is consistently long
    if (queueLength > totalWorkers * 2 && totalWorkers < this.maxWorkers) {
      this.addWorker();
    }

    // Scale down if workers are consistently idle
    if (
      activeWorkers < totalWorkers * 0.3 &&
      totalWorkers > 2 &&
      queueLength === 0
    ) {
      this.removeWorker();
    }
  }

  private addWorker(): void {
    const newIndex = this.workers.length;
    this.createWorker(newIndex);
    console.log(`Added worker ${newIndex}, total: ${this.workers.length}`);
  }

  private removeWorker(): void {
    const lastIndex = this.workers.length - 1;
    const state = this.workerStates[lastIndex];

    if (!state.busy) {
      this.workers[lastIndex].terminate();
      this.workers.pop();
      this.workerStates.pop();
      this.performanceMetrics.delete(lastIndex);
      console.log(`Removed worker ${lastIndex}, total: ${this.workers.length}`);
    }
  }

  getPerformanceReport(): PerformanceReport {
    const totalTasks = this.workerStates.reduce(
      (sum, state) => sum + state.totalTasks,
      0
    );
    const successfulTasks = this.workerStates.reduce(
      (sum, state) => sum + state.successfulTasks,
      0
    );
    const averageTime =
      this.workerStates.reduce((sum, state) => sum + state.averageTime, 0) /
      this.workers.length;

    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.workerStates.filter(state => state.busy).length,
      queueLength: this.taskQueue.length,
      totalTasks,
      successRate: successfulTasks / totalTasks,
      averageExecutionTime: averageTime,
      memoryUsage: this.workerStates.reduce(
        (sum, state) => sum + state.memoryUsage,
        0
      ),
    };
  }
}

interface WorkerState {
  busy: boolean;
  currentTask: EnhancedPoolTask | null;
  totalTasks: number;
  successfulTasks: number;
  averageTime: number;
  memoryUsage: number;
  specializations: Set<string>;
}

interface WorkerMetrics {
  taskTimes: number[];
  errorCount: number;
  memoryPeaks: number[];
  specializationScore: Map<string, number>;
}

interface PoolTask {
  type: string;
  payload: any;
  priority?: "high" | "normal" | "low";
  timeout?: number;
  retries?: number;
}

interface EnhancedPoolTask extends PoolTask {
  id: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  submitTime: number;
}

interface PerformanceReport {
  totalWorkers: number;
  activeWorkers: number;
  queueLength: number;
  totalTasks: number;
  successRate: number;
  averageExecutionTime: number;
  memoryUsage: number;
}
```

## 5. Frontend Optimization

### Rendering Performance

```typescript
class RenderingOptimizer {
  private frameRequestId: number | null = null;
  private pendingUpdates: Set<() => void> = new Set();
  private lastFrameTime: number = 0;
  private targetFPS: number = 60;
  private frameTime: number = 1000 / this.targetFPS;

  // Batch DOM updates to avoid layout thrashing
  scheduleUpdate(update: () => void): void {
    this.pendingUpdates.add(update);

    if (!this.frameRequestId) {
      this.frameRequestId = requestAnimationFrame(timestamp => {
        this.processPendingUpdates(timestamp);
      });
    }
  }

  private processPendingUpdates(timestamp: number): void {
    const deltaTime = timestamp - this.lastFrameTime;

    // Skip frame if we're running too fast
    if (deltaTime < this.frameTime - 1) {
      this.frameRequestId = requestAnimationFrame(ts =>
        this.processPendingUpdates(ts)
      );
      return;
    }

    this.lastFrameTime = timestamp;

    // Process all pending updates in a single frame
    const updates = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();
    this.frameRequestId = null;

    // Batch DOM reads and writes
    const reads: Array<() => any> = [];
    const writes: Array<() => void> = [];

    updates.forEach(update => {
      // Analyze update to separate reads from writes
      if (this.isReadOperation(update)) {
        reads.push(update);
      } else {
        writes.push(update);
      }
    });

    // Execute all reads first, then all writes
    reads.forEach(read => read());
    writes.forEach(write => write());
  }

  private isReadOperation(operation: () => void): boolean {
    // Simple heuristic - in practice, you'd need more sophisticated analysis
    const code = operation.toString();
    return (
      code.includes("getBoundingClientRect") ||
      code.includes("offsetWidth") ||
      code.includes("scrollTop")
    );
  }

  // Virtualize large lists to improve rendering performance
  createVirtualizedList<T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    renderItem: (item: T, index: number) => HTMLElement
  ): VirtualizedList<T> {
    return new VirtualizedList(items, itemHeight, containerHeight, renderItem);
  }

  // Debounce expensive operations
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Throttle high-frequency events
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCallTime = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallTime >= delay) {
        lastCallTime = now;
        func(...args);
      }
    };
  }

  // Optimize image loading with lazy loading and WebP support
  optimizeImageLoading(container: HTMLElement): void {
    const images = container.querySelectorAll("img[data-src]");

    const imageObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadOptimizedImage(img);
            imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: "50px",
      }
    );

    images.forEach(img => imageObserver.observe(img));
  }

  private loadOptimizedImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src) return;

    // Check WebP support
    const supportsWebP = this.supportsWebP();
    const optimizedSrc = supportsWebP
      ? src.replace(/\.(jpg|jpeg|png)$/i, ".webp")
      : src;

    // Preload image
    const preloadImg = new Image();
    preloadImg.onload = () => {
      img.src = optimizedSrc;
      img.classList.add("loaded");
    };
    preloadImg.onerror = () => {
      // Fallback to original format
      img.src = src;
      img.classList.add("loaded");
    };
    preloadImg.src = optimizedSrc;
  }

  private supportsWebP(): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  }
}

class VirtualizedList<T> {
  private container: HTMLElement;
  private viewport: HTMLElement;
  private visibleItems: HTMLElement[] = [];
  private startIndex: number = 0;
  private endIndex: number = 0;

  constructor(
    private items: T[],
    private itemHeight: number,
    private containerHeight: number,
    private renderItem: (item: T, index: number) => HTMLElement
  ) {
    this.setupContainer();
    this.calculateVisibleRange();
    this.renderVisibleItems();
  }

  private setupContainer(): void {
    this.container = document.createElement("div");
    this.container.style.height = `${this.containerHeight}px`;
    this.container.style.overflow = "auto";

    this.viewport = document.createElement("div");
    this.viewport.style.height = `${this.items.length * this.itemHeight}px`;
    this.viewport.style.position = "relative";

    this.container.appendChild(this.viewport);

    // Listen for scroll events
    this.container.addEventListener("scroll", () => {
      this.calculateVisibleRange();
      this.renderVisibleItems();
    });
  }

  private calculateVisibleRange(): void {
    const scrollTop = this.container.scrollTop;
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);

    this.startIndex = Math.floor(scrollTop / this.itemHeight);
    this.endIndex = Math.min(
      this.startIndex + visibleCount + 1,
      this.items.length
    );

    // Add buffer for smooth scrolling
    this.startIndex = Math.max(0, this.startIndex - 2);
    this.endIndex = Math.min(this.items.length, this.endIndex + 2);
  }

  private renderVisibleItems(): void {
    // Remove existing items
    this.visibleItems.forEach(item => item.remove());
    this.visibleItems = [];

    // Render visible items
    for (let i = this.startIndex; i < this.endIndex; i++) {
      const element = this.renderItem(this.items[i], i);
      element.style.position = "absolute";
      element.style.top = `${i * this.itemHeight}px`;
      element.style.height = `${this.itemHeight}px`;

      this.viewport.appendChild(element);
      this.visibleItems.push(element);
    }
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  updateItems(newItems: T[]): void {
    this.items = newItems;
    this.viewport.style.height = `${this.items.length * this.itemHeight}px`;
    this.calculateVisibleRange();
    this.renderVisibleItems();
  }
}
```

## 6. Monitoring and Profiling

### Performance Monitoring

```typescript
class PerformanceProfiler {
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private customMarks: Map<string, number> = new Map();

  // Mark the start of an operation
  mark(name: string): void {
    const timestamp = performance.now();
    this.customMarks.set(name, timestamp);

    if ("mark" in performance) {
      performance.mark(name);
    }
  }

  // Measure duration of an operation
  measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    let startTime: number;

    if (startMark) {
      startTime = this.customMarks.get(startMark) || 0;
    } else {
      startTime = this.customMarks.get(`${name}-start`) || 0;
    }

    const duration = endTime - startTime;

    // Store measurement
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push({
      name,
      entryType: "measure",
      startTime,
      duration,
    } as PerformanceEntry);

    if ("measure" in performance && startMark) {
      performance.measure(name, startMark);
    }

    return duration;
  }

  // Profile a function execution
  async profile<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    this.mark(`${name}-start`);

    try {
      const result = await fn();
      this.measure(name, `${name}-start`);
      return result;
    } catch (error) {
      this.measure(`${name}-error`, `${name}-start`);
      throw error;
    }
  }

  // Get performance statistics
  getStats(metricName: string): PerformanceStats | null {
    const entries = this.metrics.get(metricName);
    if (!entries || entries.length === 0) {
      return null;
    }

    const durations = entries.map(entry => entry.duration);
    durations.sort((a, b) => a - b);

    const sum = durations.reduce((acc, val) => acc + val, 0);
    const mean = sum / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      count: entries.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      mean,
      median,
      p95,
      p99,
      stdDev: this.calculateStdDev(durations, mean),
    };
  }

  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  // Export performance data
  exportData(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      metrics: {},
    };

    for (const [name, entries] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        report.metrics[name] = stats;
      }
    }

    return report;
  }

  // Clear old metrics to prevent memory leaks
  cleanup(maxAge: number = 300000): void {
    // 5 minutes
    const cutoff = Date.now() - maxAge;

    for (const [name, entries] of this.metrics) {
      const filtered = entries.filter(entry => entry.startTime > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(name);
      } else {
        this.metrics.set(name, filtered);
      }
    }

    // Clear old marks
    const marksToDelete: string[] = [];
    for (const [name, timestamp] of this.customMarks) {
      if (timestamp < cutoff) {
        marksToDelete.push(name);
      }
    }
    marksToDelete.forEach(name => this.customMarks.delete(name));
  }
}

interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

interface PerformanceReport {
  timestamp: number;
  userAgent: string;
  metrics: { [name: string]: PerformanceStats };
}
```

## 7. Bundle Optimization

### Webpack Configuration

```javascript
// webpack.prod.js
const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const CompressionPlugin = require("compression-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ["console.log", "console.info"],
          },
        },
      }),
    ],

    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // Separate vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },

        // Separate AI models
        models: {
          test: /[\\/]models[\\/]/,
          name: "ai-models",
          chunks: "all",
          enforce: true,
        },

        // Separate workers
        workers: {
          test: /\.worker\.(js|ts)$/,
          name: "workers",
          chunks: "all",
          enforce: true,
        },
      },
    },
  },

  plugins: [
    // Analyze bundle size
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? "server" : "disabled",
    }),

    // Compress assets
    new CompressionPlugin({
      algorithm: "gzip",
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),

    new CompressionPlugin({
      algorithm: "brotliCompress",
      test: /\.(js|css|html|svg)$/,
      compressionOptions: { level: 11 },
      threshold: 8192,
      minRatio: 0.8,
      filename: "[path][base].br",
    }),
  ],

  resolve: {
    // Optimize module resolution
    modules: [path.resolve(__dirname, "src"), "node_modules"],
    extensions: [".ts", ".tsx", ".js", ".jsx"],

    // Use production builds
    mainFields: ["browser", "module", "main"],

    // Tree shaking friendly aliases
    alias: {
      "@": path.resolve(__dirname, "src"),
      lodash: "lodash-es",
    },
  },

  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        use: [
          {
            loader: "worker-loader",
            options: {
              filename: "workers/[name].[contenthash].worker.js",
              chunkFilename: "workers/[id].[contenthash].worker.js",
            },
          },
          "ts-loader",
        ],
      },
    ],
  },
};
```

## Performance Checklist

### ✅ Model Optimization

- [ ] Use quantized models when possible
- [ ] Implement model preloading
- [ ] Enable model caching
- [ ] Optimize model formats (ONNX vs TensorFlow.js)

### ✅ Memory Management

- [ ] Monitor memory usage
- [ ] Implement garbage collection strategies
- [ ] Use tensor pooling
- [ ] Set memory limits for workers

### ✅ Network Optimization

- [ ] Enable compression (Gzip/Brotli)
- [ ] Implement intelligent caching
- [ ] Use CDN for model distribution
- [ ] Optimize request batching

### ✅ Worker Pool Management

- [ ] Dynamic worker scaling
- [ ] Worker specialization
- [ ] Performance-based task assignment
- [ ] Memory-aware scheduling

### ✅ Frontend Performance

- [ ] Virtualize large lists
- [ ] Batch DOM updates
- [ ] Lazy load images
- [ ] Optimize bundle size

### ✅ Monitoring

- [ ] Track performance metrics
- [ ] Set up alerts
- [ ] Profile critical paths
- [ ] Monitor user experience

This comprehensive performance optimization guide provides you with the tools and techniques needed to build high-performance geospatial AI applications that scale efficiently in production environments.
