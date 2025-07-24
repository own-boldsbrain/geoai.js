import { geoai, InferenceParams } from "../geobase-ai";
import { PipelineInitConfig } from "./useGeoAIWorker";

// Worker message types
type WorkerMessage = {
  type: "init" | "inference";
  payload: any;
};

let modelInstance: any = null;
let initializedTasks: string[] = [];

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  console.log("[Worker] onmessage event:", e);
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        console.log("[Worker] Received init message");
        const { tasks, providerParams } = payload as PipelineInitConfig;

        console.log("[Worker] Init payload:", {
          tasks,
          providerParams,
        });

        console.log("[Worker] Starting pipeline initialization");

        // Debug: check geoai import
        try {
          console.log("[Worker] Attempting to import geoai...");
          // @ts-ignore
          if (!geoai) {
            throw new Error("geoai is not defined");
          }
        } catch (importErr) {
          console.error("[Worker] geoai import error:", importErr);
          throw importErr;
        }

        modelInstance = await geoai.pipeline(tasks, providerParams);
        initializedTasks = tasks.map(t => t.task);

        console.log("[Worker] Pipeline initialized successfully");
        self.postMessage({
          type: "init_complete",
          payload: { tasks: initializedTasks },
        });
        break;
      }

      case "inference": {
        console.log("[Worker] Received inference message");
        if (!modelInstance) {
          console.error("[Worker] Model instance not initialized");
          throw new Error("Object detector not initialized");
        }

        const { inputs, postProcessingParams, mapSourceParams } =
          payload as InferenceParams;
        console.log("[Worker] Running inference with:", {
          inputs,
          postProcessingParams,
          mapSourceParams,
        });

        console.log("[Worker] Starting inference");

        let result: any;
        try {
          result = await modelInstance.inference(payload as InferenceParams);
        } catch (inferErr) {
          console.error("[Worker] Inference error:", inferErr);
          throw inferErr;
        }
        console.log("[Worker] Inference completed successfully");
        console.log({ result });

        self.postMessage({
          type: "inference_complete",
          payload: result,
        });
        break;
      }
    }
  } catch (error) {
    console.error("[Worker] Error occurred:", error);
    self.postMessage({
      type: "error",
      payload: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
};
