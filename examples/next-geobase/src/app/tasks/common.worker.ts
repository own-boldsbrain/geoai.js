import { geoai, ProviderParams } from "@geobase-js/geoai";
import { PretrainedOptions } from "@huggingface/transformers";

// Worker message types
type WorkerMessage = {
  type: "init" | "inference" | "getEmbeddings";
  payload: any;
};

type InitPayload = {
  provider: "geobase" | "mapbox";
  projectRef?: string;
  apikey?: string;
  cogImagery?: string;
  apiKey?: string;
  style?: string;
  modelId?: string;
  task?: string;
  chain_config?: {
    task: string;
    modelId?: string;
    modelParams?: PretrainedOptions;
  }[];
};

type InferencePayload = {
  polygon: GeoJSON.Feature;
  classLabel?: string;
  confidenceScore: number;
  zoomLevel: number;
  topk: number;
  nmsThreshold?: number;
  minArea?: number;
  inputPoint?: any;
  maxMasks?: number;
  task: string;
};

let modelInstance: any = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        console.log("[Worker] Received init message");
        const { task, provider, modelId, chain_config, ...config } = payload as InitPayload;

        console.log("[Worker] Init payload:", { task, provider, modelId, config });

        console.log("[Worker] Starting pipeline initialization");
        if (chain_config) {
          modelInstance = await geoai.pipeline(
            chain_config as { task: string; modelId?: string; modelParams?: PretrainedOptions }[],
            { provider, ...config } as ProviderParams
          );
        }
        else {
          modelInstance = await geoai.pipeline(
            [{task}]!,
            { provider, ...config } as ProviderParams,
          );
        }

        console.log("[Worker] Pipeline initialized successfully");
        self.postMessage({ type: "init_complete" });
        break;
      }

      case "inference": {
        console.log("[Worker] Received inference message");
        if (!modelInstance) {
          console.error("[Worker] Model instance not initialized");
          throw new Error("Object detector not initialized");
        }

        const { polygon, zoomLevel, topk, confidenceScore, minArea, nmsThreshold, classLabel, inputPoint, maxMasks } = payload as InferencePayload;
        console.log("[Worker] Running inference with:", { zoomLevel, polygon, topk, confidenceScore, classLabel, inputPoint, maxMasks });

        console.log("[Worker] Starting inference");

        // Lookup table for argument builders by task name
        const inferenceArgBuilders: Record<string, (payload: InferencePayload) => any> = {
          "zero-shot-object-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon,
              classLabel: payload.classLabel
            },
            postProcessingParams: {
              threshold: payload.confidenceScore,
              topk: payload.topk,
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "oil-storage-tank-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            postProcessingParams: {
              confidenceThreshold: payload.confidenceScore,
              nmsThreshold: payload.nmsThreshold,
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "land-cover-classification": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            postProcessingParams: {
              minArea: payload.minArea,
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "oriented-object-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "wetland-segmentation": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "object-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            postProcessingParams: {
              confidence: payload.confidenceScore
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "building-footprint-segmentation": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            postProcessingParams: {
              confidenceThreshold: payload.confidenceScore,
              minArea: payload.minArea
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "mask-generation": (payload) => ({
            inputs: {
              polygon: payload.polygon,
              input: payload.inputPoint
            },
            postProcessingParams: {
              maxMasks: payload.maxMasks
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          })
        };

        // Default builder if task is not found
        const defaultBuilder = (payload: InferencePayload) => ({
          inputs: {
            polygon: payload.polygon,
            classLabel: payload.classLabel,
            input: payload.inputPoint
          },
          postProcessingParams: {
            confidence: payload.confidenceScore,
            topk: payload.topk,
            minArea: payload.minArea,
          },
          mapSourceParams: {
            zoomLevel: payload.zoomLevel
          }
        });

        const task = payload.task;
        const argBuilder = (task && inferenceArgBuilders[task]) ? inferenceArgBuilders[task] : defaultBuilder;
        const inferenceArgs = argBuilder(payload);
        let result: any;
        result = await modelInstance.inference(inferenceArgs);
        console.log("[Worker] Inference completed successfully");
        console.log({ result });

        // Convert any tensors to transferable data
        const serializedResult = JSON.parse(JSON.stringify(result, (key, value) => {
          // Handle tensor objects by converting them to plain objects
          if (value && typeof value === 'object' && value.data && value.dims && value.type) {
            return {
              data: Array.from(value.data),
              dims: value.dims,
              type: value.type
            };
          }
          return value;
        }));

        self.postMessage({
          type: "inference_complete",
          payload: serializedResult
        });
        break;
      }

      case "getEmbeddings": {
        console.log("[Worker] Received getEmbeddings message");
        
        if (!modelInstance) {
          throw new Error("Model not initialized. Call 'init' first.");
        }

        // Check if the model has a getImageEmbeddings method
        if (typeof modelInstance.getImageEmbeddings !== 'function') {
          throw new Error("Model does not support getImageEmbeddings method");
        }

        const task = payload.task || "mask-generation";
        const inferenceArgBuilders: { [key: string]: (payload: InferencePayload) => any } = {
          "mask-generation": (payload) => ({
            inputs: {
              polygon: payload.polygon,
            },
            mapSourceParams: {
              zoomLevel: payload.zoomLevel
            }
          })
        };

        const defaultBuilder = (payload: InferencePayload) => ({
          inputs: {
            polygon: payload.polygon,
          },
          mapSourceParams: {
            zoomLevel: payload.zoomLevel
          }
        });

        const argBuilder = (task && inferenceArgBuilders[task]) ? inferenceArgBuilders[task] : defaultBuilder;
        const inferenceArgs = argBuilder(payload);
        
        let result: any;
        result = await modelInstance.getImageEmbeddings(inferenceArgs);
        console.log("[Worker] getImageEmbeddings completed successfully");
        console.log("Embeddings result:", result);

        // Convert tensor to transferable data
        const serializedResult = {
          ...result,
          image_embeddings: result.image_embeddings ? {
            data: Array.from(result.image_embeddings.image_embeddings.data),
            dims: result.image_embeddings.image_embeddings.dims,
            type: result.image_embeddings.image_embeddings.type
          } : null
        };

        self.postMessage({
          type: "embeddings_complete",
          payload: serializedResult
        });
        break;
      }

    }
  } catch (error) {
    console.error("[Worker] Error occurred:", error);
    self.postMessage({
      type: "error",
      payload: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
}; 