import { useEffect, useRef, useState, useCallback } from "react";

// Worker message types
export type WorkerMessageType = "init" | "inference";
export type WorkerResponseType =
  | "init_complete"
  | "inference_complete"
  | "error";

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
  clearError: () => void;
  reset: () => void;
}

export declare function useGeoAIWorker(): UseGeoAIWorkerReturn;
export declare function useOptimizedGeoAI(
  task: string
): UseGeoAIWorkerReturn & {
  runOptimizedInference: (
    polygon: GeoJSON.Feature,
    zoomLevel: number,
    options?: Partial<Omit<InferenceParams, "polygon" | "zoomLevel" | "task">>
  ) => void;
};
