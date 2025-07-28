import { useEffect, useRef, useState, useCallback } from "react";

// Worker message types
export type WorkerMessageType = "init" | "inference" | "getEmbeddings";
export type WorkerResponseType = "init_complete" | "inference_complete" | "embeddings_complete" | "error";

export interface WorkerMessage {
  type: WorkerMessageType;
  payload: any;
}

export interface WorkerResponse {
  type: WorkerResponseType;
  payload?: any;
}

export interface InitConfig {
  provider: "geobase" | "mapbox";
  projectRef?: string;
  apikey?: string;
  apiKey?: string;
  cogImagery?: string;
  style?: string;
  task: string;
  modelId?: string;
  chain_config?: {
    task: string;
    modelId?: string;
    modelParams?: any;
  }[];
}

export interface InferenceParams {
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

export interface GeoAIWorkerResult {
  detections?: GeoJSON.FeatureCollection;
  geoRawImage?: any;
  [key: string]: any;
}

export interface UseGeoAIWorkerReturn {
  // State
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  lastResult: GeoAIWorkerResult | null;
  
  // Actions
  initializeModel: (config: InitConfig) => void;
  runInference: (params: InferenceParams) => void;
  getEmbeddings: (params: InferenceParams) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * Custom hook for managing GeoAI worker lifecycle and communication
 * Provides clean separation of concerns for AI model operations
 */
export function useGeoAIWorker(): UseGeoAIWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GeoAIWorkerResult | null>(null);

  // Initialize worker on mount
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../app/tasks/common.worker.ts", import.meta.url)
      );

      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = handleWorkerError;

    } catch (err) {
      console.error("Failed to initialize worker:", err);
      setError("Failed to initialize AI worker");
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      // Clear large data structures
      setLastResult(null);
      setError(null);
      setIsInitialized(false);
      setIsProcessing(false);
    };
  }, []);

  // Handle worker messages
  const handleWorkerMessage = useCallback((e: MessageEvent<WorkerResponse>) => {
    const { type, payload } = e.data;

    switch (type) {
      case "init_complete":
        setIsInitialized(true);
        setError(null);
        console.log("[Hook] AI model initialized successfully");
        break;

      case "inference_complete":
        setIsProcessing(false);
        setLastResult(payload || null);
        setError(null);
        console.log("[Hook] Inference completed successfully");
        break;

      case "embeddings_complete":
        setIsProcessing(false);
        setLastResult(payload || null);
        setError(null);
        console.log("[Hook] Embeddings extraction completed successfully");
        break;

      case "error":
        setIsProcessing(false);
        setIsInitialized(false);
        setError(payload || "Unknown worker error occurred");
        console.log("[Hook] Worker error:", payload);
        break;

      default:
        console.warn("[Hook] Unknown worker message type:", type);
    }
  }, []);

  // Handle worker errors
  const handleWorkerError = useCallback((error: ErrorEvent) => {
    console.error("[Hook] Worker error event:", error);
    setError(`Worker error: ${error.message}`);
    setIsProcessing(false);
    setIsInitialized(false);
  }, []);

  // Initialize AI model
  const initializeModel = useCallback((config: InitConfig) => {
    if (!workerRef.current) {
      setError("Worker not available");
      return;
    }

    if (isInitialized) {
      console.warn("[Hook] Model already initialized");
      return;
    }

    console.log("[Hook] Initializing AI model with config:", config);
    setError(null);
    
    const message: WorkerMessage = {
      type: "init",
      payload: config
    };

    workerRef.current.postMessage(message);
  }, [isInitialized]);

  // Run inference
  const runInference = useCallback((params: InferenceParams) => {
    if (!workerRef.current) {
      setError("Worker not available");
      return;
    }

    if (!isInitialized) {
      setError("AI model not initialized. Please initialize first.");
      return;
    }

    if (isProcessing) {
      console.warn("[Hook] Inference already in progress");
      return;
    }

    console.log("[Hook] Running inference with params:", params);
    setIsProcessing(true);
    setError(null);
    
    const message: WorkerMessage = {
      type: "inference",
      payload: params
    };

    workerRef.current.postMessage(message);
  }, [isInitialized, isProcessing]);

  // Get embeddings from AI model
  const getEmbeddings = useCallback((params: InferenceParams) => {
    if (!workerRef.current) {
      setError("Worker not available");
      return;
    }

    if (!isInitialized) {
      setError("AI model not initialized. Please initialize first.");
      return;
    }

    if (isProcessing) {
      console.warn("[Hook] Embeddings extraction already in progress");
      return;
    }

    console.log("[Hook] Getting embeddings with params:", params);
    setIsProcessing(true);
    setError(null);
    
    const message: WorkerMessage = {
      type: "getEmbeddings",
      payload: params
    };

    workerRef.current.postMessage(message);
  }, [isInitialized, isProcessing]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = new Worker(
        new URL("../app/tasks/common.worker.ts", import.meta.url)
      );
      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = handleWorkerError;
    }
    
    setIsInitialized(false);
    setIsProcessing(false);
    setError(null);
    setLastResult(null);
  }, [handleWorkerMessage, handleWorkerError]);

  return {
    // State
    isInitialized,
    isProcessing,
    error,
    lastResult,
    
    // Actions
    initializeModel,
    runInference,
    getEmbeddings,
    clearError,
    reset
  };
}

// Helper hook for common AI tasks with optimized parameters
export function useOptimizedGeoAI(task: string) {
  const worker = useGeoAIWorker();

  const runOptimizedInference = useCallback((
    polygon: GeoJSON.Feature,
    zoomLevel: number,
    options: Partial<InferenceParams> = {}
  ) => {
    // Optimize parameters based on task and zoom level
    const optimizedParams = getOptimalParams(task, zoomLevel, options);
    
    worker.runInference({
      polygon,
      zoomLevel,
      task,
      confidenceScore: optimizedParams.confidenceScore || 0.8,
      ...optimizedParams
    });
  }, [worker, task]);

  const runOptimizedEmbeddings = useCallback((
    polygon: GeoJSON.Feature,
    zoomLevel: number,
    options: Partial<InferenceParams> = {}
  ) => {
    // Get embeddings with optimized parameters
    const optimizedParams = getOptimalParams(task, zoomLevel, options);
    
    worker.getEmbeddings({
      polygon,
      zoomLevel,
      task,
      confidenceScore: optimizedParams.confidenceScore || 0.8,
      ...optimizedParams
    });
  }, [worker, task]);

  return {
    ...worker,
    runOptimizedInference,
    runOptimizedEmbeddings
  };
}

// Helper function to get optimal parameters for different tasks
function getOptimalParams(
  task: string, 
  zoomLevel: number, 
  options: Partial<InferenceParams>
): Partial<InferenceParams> {
  const baseParams: Partial<InferenceParams> = {
    confidenceScore: 0.8,
    topk: 10,
    ...options
  };

  switch (task) {
    case "object-detection":
      return {
        ...baseParams,
        confidenceScore: zoomLevel > 18 ? 0.6 : 0.8
      };
      
    case "building-footprint-segmentation":
      return {
        ...baseParams,
        confidenceScore: 0.7,
        minArea: zoomLevel > 16 ? 50 : 100
      };
      
    case "zero-shot-object-detection":
      return {
        ...baseParams,
        confidenceScore: 0.8,
        topk: 15
      };
      
    case "land-cover-classification":
      return {
        ...baseParams,
        minArea: zoomLevel > 15 ? 25 : 50
      };
      
    case "mask-generation":
      return {
        ...baseParams,
      };
      
    default:
      return baseParams;
  }
}