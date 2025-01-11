// TODO models to incorporate
// https://huggingface.co/models?other=zero-shot-object-detection&library=transformers.js
// https://huggingface.co/models?pipeline_tag=zero-shot-image-classification&library=transformers.js

import { GenericSegmentation } from "./models/generic_segmentation";

// Look at https://huggingface.co/Xenova/mobilebert-uncased-mnli to see if we can help the developer pick the right model based on a short description of what they are trying to do. For example they say "Hi Everyone, I've been trying to find a method to extract points from a WMS server the background is transparent and the only thing on server is the points in raster the WFS server is returning nothing but errors if there are tools or pre existing scripts where i can achieve this please let me know it would be greatly appreciated." (Source: https://discord.com/channels/769917190182404127/1326839223331852319/1326839223331852319) and given we have the tags or labels for the models, we can help the developer pick the right model based on the description.

// const classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
// const text = "Hi Everyone, I've been trying to find a method to extract points from a WMS server the background is transparent and the only thing on server is the points in raster the WFS server is returning nothing but errors if there are tools or pre existing scripts where i can achieve this please let me know it would be greatly appreciated."

// const labels = [ 'zero-shot-object-detection', 'zero-shot-image-classification' ];
// const output = await classifier(text, labels);
// {
//   sequence: 'Hi Everyone, I've been trying to find a method to extract points from a WMS server the background is transparent and the only thing on server is the points in raster the WFS server is returning nothing but errors if there are tools or pre existing scripts where i can achieve this please let me know it would be greatly appreciated.',
//   labels: [ 'zero-shot-object-detection', 'zero-shot-image-classification' ],
//   scores: [ 0.5562091040482018, 0.1843621307860853 ]
// }

type HuggingFaceModelTasks =
  | "mask-generation"
  | "zero-shot-object-detection"
  | "zero-shot-image-classification";

type GeobaseAiModelTasks =
  | "damage-assessment"
  | "vegetation-classification"
  | "land-cover-classification"
  | "land-use-classification"
  | "land-cover-change-detection"
  | "land-use-change-detection";

type GeobaseAiModelMetadata = {
  task: HuggingFaceModelTasks | GeobaseAiModelTasks;
  library: string;
  model: string;
  description: string;
  geobase_ai_pipeline: (params: any) => Promise<any>;
};

const model_metadata: GeobaseAiModelMetadata[] = [
  {
    task: "zero-shot-object-detection",
    library: "transformers.js",
    model: "onnx-community/grounding-dino-tiny-ONNX",
    description: "Zero-shot object detection model.",
    geobase_ai_pipeline: (params: any) => ({}),
  },
  {
    task: "mask-generation",
    library: "transformers.js",
    model: "Xenova/slimsam-77-uniform",
    description: "Mask generation model.",
    geobase_ai_pipeline: (params: any) => {
      return GenericSegmentation.getInstance(
        "Xenova/slimsam-77-uniform",
        "mapbox",
        {
          apiKey: params.apiKey,
          style: params.style,
        }
      );
    },
  },
];

const models = () => {
  return model_metadata;
};

const tasks = () => {
  return "tasks";
};

const domains = () => {
  return "domains";
};

const pipeline = async (
  task: HuggingFaceModelTasks | GeobaseAiModelTasks,
  imagerySource: string,
  params: any
) => {
  const model = model_metadata.find(model => model.task === task);

  if (!model) {
    throw new Error(`Model for task ${task} not found`);
  }

  return await model.geobase_ai_pipeline(params);
};

const geobaseAi = {
  tasks,
  domains,
  models,
  pipeline,
};

export { geobaseAi };
