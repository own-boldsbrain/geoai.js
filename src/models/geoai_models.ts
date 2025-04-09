import { Mapbox } from "@/data_providers/mapbox";
import { getPolygonFromMask, parametersChanged } from "@/utils/utils";

import { ObjectDetectionResults } from "../models/zero_shot_object_detection";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";
import * as ort from "onnxruntime-web";

export class SolarPanelDetection {
  private static instance: SolarPanelDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string; //model name or path
  private model: ort.InferenceSession | undefined;
  private initialized: boolean = false;

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: SolarPanelDetection }> {
    if (
      !SolarPanelDetection.instance ||
      parametersChanged(
        SolarPanelDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      SolarPanelDetection.instance = new SolarPanelDetection(
        model_id,
        providerParams
      );
      await SolarPanelDetection.instance.initialize();
    }
    return { instance: SolarPanelDetection.instance };
  }

  private async preProcessor(
    image: GeoRawImage
  ): Promise<{ input: ort.Tensor }> {
    // Create RawImage instance and resize it
    // let rawImage = new RawImage(
    //   image.data,
    //   image.height,
    //   image.width,
    //   image.channels
    // );
    // await rawImage.save("solarpanelinput.png");
    // console.log("rawImage", image);

    // If image has 4 channels, convert it to 3 channels (e.g., remove alpha channel)
    // if (image.channels > 3) {
    //   const newData = new Uint8Array(image.width * image.height * 3);
    //   for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
    //     newData[j] = image.data[i]; // R
    //     newData[j + 1] = image.data[i + 1]; // G
    //     newData[j + 2] = image.data[i + 2]; // B
    //   }
    //   rawImage = new RawImage(newData, image.height, image.width, 3);
    // }

    // rawImage.resize(512, 512);

    // Convert RawImage to a tensor in CHW format
    const tensor = image.toTensor("CHW"); // Transpose to CHW format, it is equal in python transpose(2, 0, 1)

    // Convert tensor data to Float32Array
    const floatData = new Float32Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
      floatData[i] = tensor.data[i] / 255.0; // Normalize to [0, 1] if needed
    }

    // Create the ONNX Runtime tensor
    const inputs = {
      input: new ort.Tensor(floatData, [
        1,
        tensor.dims[0],
        tensor.dims[1],
        tensor.dims[2],
      ]),
    };

    return inputs;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider first
    switch (this.providerParams.provider) {
      case "mapbox":
        this.dataProvider = new Mapbox(
          this.providerParams.apiKey,
          this.providerParams.style
        );
        break;
      case "geobase":
        this.dataProvider = new Geobase({
          projectRef: this.providerParams.projectRef,
          cogImagery: this.providerParams.cogImagery,
          apikey: this.providerParams.apikey,
        });
        break;
      case "sentinel":
        throw new Error("Sentinel provider not implemented yet");
      default:
        throw new Error(
          `Unknown provider: ${(this.providerParams as any).provider}`
        );
    }

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    const response = await fetch(this.model_id);
    if (!response.ok) {
      throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load model using ONNX Runtime
    this.model = await ort.InferenceSession.create(uint8Array);
    this.initialized = true;
  }

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    const image = await this.dataProvider.getImage(polygon);
    return image;
  }

  async inference(polygon: GeoJSON.Feature): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    const inputs = await this.preProcessor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run({ image: inputs.input });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(outputs, geoRawImage);

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  private async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<any> {
    const { boxes, scores, labels, masks } = outputs;
    console.log({
      boxes: boxes.dims,
      scores: scores.dims,
      labels: labels.dims,
      masks,
    });
    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims;
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];
    let masksArray = [];
    for (let idx = 0; idx < maskDims[0]; idx++) {
      const maskArray = new Uint8Array(maskHeight * maskWidth);
      const startIdx = idx * maskHeight * maskWidth;

      for (let i = 0; i < maskHeight * maskWidth; i++) {
        maskArray[i] = maskData[startIdx + i] > 0.5 ? 255 : 0; // Binarize mask
      }

      masksArray.push(maskArray);
    }
    const features: GeoJSON.Feature[] = [];
    if (masksArray.length > 0) {
      masksArray.forEach(maskArray => {
        const binaryMask2D: number[][] = [];
        for (let i = 0; i < maskHeight; i++) {
          const row: number[] = [];
          for (let j = 0; j < maskWidth; j++) {
            const index = i * maskWidth + j;
            row.push(maskArray[index] > 0 ? 1 : 0); // Convert to binary values
          }
          binaryMask2D.push(row);
        }

        const polygon = getPolygonFromMask(binaryMask2D, geoRawImage);
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [polygon],
          },
          properties: {},
        });
      });
      const featureCollection = {
        type: "FeatureCollection",
        features,
      };
      return featureCollection;
    }
  }
}

export class ShipDetection {
  private static instance: ShipDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string; //model name or path
  private model: ort.InferenceSession | undefined;
  private initialized: boolean = false;

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: ShipDetection }> {
    if (
      !ShipDetection.instance ||
      parametersChanged(
        ShipDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ShipDetection.instance = new ShipDetection(model_id, providerParams);
      await ShipDetection.instance.initialize();
    }
    return { instance: ShipDetection.instance };
  }

  private async preProcessor(
    image: GeoRawImage
  ): Promise<{ input: ort.Tensor }> {
    const tensor = image.toTensor("CHW"); // Transpose to CHW format, it is equal in python transpose(2, 0, 1)

    // Convert tensor data to Float32Array
    const floatData = new Float32Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
      floatData[i] = tensor.data[i] / 255.0; // Normalize to [0, 1] if needed
    }

    // Create the ONNX Runtime tensor
    const inputs = {
      input: new ort.Tensor(floatData, [
        1,
        tensor.dims[0],
        tensor.dims[1],
        tensor.dims[2],
      ]),
    };

    return inputs;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider first
    switch (this.providerParams.provider) {
      case "mapbox":
        this.dataProvider = new Mapbox(
          this.providerParams.apiKey,
          this.providerParams.style
        );
        break;
      case "geobase":
        this.dataProvider = new Geobase({
          projectRef: this.providerParams.projectRef,
          cogImagery: this.providerParams.cogImagery,
          apikey: this.providerParams.apikey,
        });
        break;
      case "sentinel":
        throw new Error("Sentinel provider not implemented yet");
      default:
        throw new Error(
          `Unknown provider: ${(this.providerParams as any).provider}`
        );
    }

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    const response = await fetch(this.model_id);
    if (!response.ok) {
      throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load model using ONNX Runtime
    this.model = await ort.InferenceSession.create(uint8Array);
    this.initialized = true;
  }

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    const image = await this.dataProvider.getImage(polygon, 21);
    return image;
  }

  async inference(polygon: GeoJSON.Feature): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    const inputs = await this.preProcessor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run({ image: inputs.input });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(outputs, geoRawImage);

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  private async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<any> {
    const { boxes, scores, labels, masks } = outputs;
    console.log({
      boxes: boxes.dims,
      scores: scores.dims,
      labels: labels.dims,
      masks,
    });
    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims;
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];
    let masksArray = [];
    for (let idx = 0; idx < maskDims[0]; idx++) {
      const maskArray = new Uint8Array(maskHeight * maskWidth);
      const startIdx = idx * maskHeight * maskWidth;

      for (let i = 0; i < maskHeight * maskWidth; i++) {
        maskArray[i] = maskData[startIdx + i] > 0.5 ? 255 : 0; // Binarize mask
      }

      masksArray.push(maskArray);
    }
    const features: GeoJSON.Feature[] = [];
    if (masksArray.length > 0) {
      masksArray.forEach(maskArray => {
        const binaryMask2D: number[][] = [];
        for (let i = 0; i < maskHeight; i++) {
          const row: number[] = [];
          for (let j = 0; j < maskWidth; j++) {
            const index = i * maskWidth + j;
            row.push(maskArray[index] > 0 ? 1 : 0); // Convert to binary values
          }
          binaryMask2D.push(row);
        }

        const polygon = getPolygonFromMask(binaryMask2D, geoRawImage);
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [polygon],
          },
          properties: {},
        });
      });
      const featureCollection = {
        type: "FeatureCollection",
        features,
      };
      return featureCollection;
    }
  }
}

export class CarDetection {
  private static instance: CarDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string; //model name or path
  private model: ort.InferenceSession | undefined;
  private initialized: boolean = false;

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: CarDetection }> {
    if (
      !CarDetection.instance ||
      parametersChanged(
        CarDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      CarDetection.instance = new CarDetection(model_id, providerParams);
      await CarDetection.instance.initialize();
    }
    return { instance: CarDetection.instance };
  }

  private async preProcessor(
    image: GeoRawImage
  ): Promise<{ input: ort.Tensor }> {
    // Create RawImage instance and resize it
    // let rawImage = new RawImage(
    //   image.data,
    //   image.height,
    //   image.width,
    //   image.channels
    // );
    // await rawImage.save("solarpanelinput.png");
    // console.log("rawImage", image);

    // If image has 4 channels, convert it to 3 channels (e.g., remove alpha channel)
    // if (image.channels > 3) {
    //   const newData = new Uint8Array(image.width * image.height * 3);
    //   for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
    //     newData[j] = image.data[i]; // R
    //     newData[j + 1] = image.data[i + 1]; // G
    //     newData[j + 2] = image.data[i + 2]; // B
    //   }
    //   rawImage = new RawImage(newData, image.height, image.width, 3);
    // }

    // rawImage.resize(512, 512);

    // Convert RawImage to a tensor in CHW format
    const tensor = image.toTensor("CHW"); // Transpose to CHW format, it is equal in python transpose(2, 0, 1)

    // Convert tensor data to Float32Array
    const floatData = new Float32Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
      floatData[i] = tensor.data[i] / 255.0; // Normalize to [0, 1] if needed
    }

    // Create the ONNX Runtime tensor
    const inputs = {
      input: new ort.Tensor(floatData, [
        1,
        tensor.dims[0],
        tensor.dims[1],
        tensor.dims[2],
      ]),
    };

    return inputs;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider first
    switch (this.providerParams.provider) {
      case "mapbox":
        this.dataProvider = new Mapbox(
          this.providerParams.apiKey,
          this.providerParams.style
        );
        break;
      case "geobase":
        this.dataProvider = new Geobase({
          projectRef: this.providerParams.projectRef,
          cogImagery: this.providerParams.cogImagery,
          apikey: this.providerParams.apikey,
        });
        break;
      case "sentinel":
        throw new Error("Sentinel provider not implemented yet");
      default:
        throw new Error(
          `Unknown provider: ${(this.providerParams as any).provider}`
        );
    }

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    const response = await fetch(this.model_id);
    if (!response.ok) {
      throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load model using ONNX Runtime
    this.model = await ort.InferenceSession.create(uint8Array);
    this.initialized = true;
  }

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    const image = await this.dataProvider.getImage(polygon);
    return image;
  }

  async inference(polygon: GeoJSON.Feature): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    const inputs = await this.preProcessor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run({ image: inputs.input });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(outputs, geoRawImage);

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  private async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<any> {
    const { boxes, scores, labels, masks } = outputs;
    console.log({
      boxes: boxes.dims,
      scores: scores.dims,
      labels: labels.dims,
      masks,
    });
    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims;
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];
    let masksArray = [];
    for (let idx = 0; idx < maskDims[0]; idx++) {
      const maskArray = new Uint8Array(maskHeight * maskWidth);
      const startIdx = idx * maskHeight * maskWidth;

      for (let i = 0; i < maskHeight * maskWidth; i++) {
        maskArray[i] = maskData[startIdx + i] > 0.5 ? 255 : 0; // Binarize mask
      }

      masksArray.push(maskArray);
    }
    const features: GeoJSON.Feature[] = [];
    if (masksArray.length > 0) {
      masksArray.forEach(maskArray => {
        const binaryMask2D: number[][] = [];
        for (let i = 0; i < maskHeight; i++) {
          const row: number[] = [];
          for (let j = 0; j < maskWidth; j++) {
            const index = i * maskWidth + j;
            row.push(maskArray[index] > 0 ? 1 : 0); // Convert to binary values
          }
          binaryMask2D.push(row);
        }

        const polygon = getPolygonFromMask(binaryMask2D, geoRawImage);
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [polygon],
          },
          properties: {},
        });
      });
      const featureCollection = {
        type: "FeatureCollection",
        features,
      };
      return featureCollection;
    }
  }
}

//todo: wetland segmentation works with multiband band images need to write the code to get the mulibands from the source.
export class WetLandSegmentation {
  private static instance: WetLandSegmentation | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string; //model name or path
  private model: ort.InferenceSession | undefined;
  private initialized: boolean = false;

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: WetLandSegmentation }> {
    if (
      !WetLandSegmentation.instance ||
      parametersChanged(
        WetLandSegmentation.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      WetLandSegmentation.instance = new WetLandSegmentation(
        model_id,
        providerParams
      );
      await WetLandSegmentation.instance.initialize();
    }
    return { instance: WetLandSegmentation.instance };
  }

  private async preProcessor(
    image: GeoRawImage
  ): Promise<{ input: ort.Tensor }> {
    const image_tensor = image.toTensor();
    console.log({ image_tensor: image_tensor.dims });
    console.log({ image: image.toTensor() });
    // Create RawImage instance and resize it
    // let rawImage = new RawImage(
    //   image.data,
    //   image.height,
    //   image.width,
    //   image.channels
    // );
    // await rawImage.save("solarpanelinput.png");
    // console.log("rawImage", image);

    // If image has 4 channels, convert it to 3 channels (e.g., remove alpha channel)
    // if (image.channels > 3) {
    //   const newData = new Uint8Array(image.width * image.height * 3);
    //   for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
    //     newData[j] = image.data[i]; // R
    //     newData[j + 1] = image.data[i + 1]; // G
    //     newData[j + 2] = image.data[i + 2]; // B
    //   }
    //   rawImage = new RawImage(newData, image.height, image.width, 3);
    // }

    // rawImage.resize(512, 512);

    // Convert RawImage to a tensor in CHW format
    const tensor = image.toTensor("CHW"); // Transpose to CHW format, it is equal in python transpose(2, 0, 1)

    // Convert tensor data to Float32Array
    const floatData = new Float32Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
      floatData[i] = tensor.data[i] / 255.0; // Normalize to [0, 1] if needed
    }

    // Create the ONNX Runtime tensor
    const inputs = {
      input: new ort.Tensor(floatData, [
        1,
        tensor.dims[0],
        tensor.dims[1],
        tensor.dims[2],
      ]),
    };

    return inputs;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider first
    switch (this.providerParams.provider) {
      case "mapbox":
        this.dataProvider = new Mapbox(
          this.providerParams.apiKey,
          this.providerParams.style
        );
        break;
      case "geobase":
        this.dataProvider = new Geobase({
          projectRef: this.providerParams.projectRef,
          cogImagery: this.providerParams.cogImagery,
          apikey: this.providerParams.apikey,
        });
        break;
      case "sentinel":
        throw new Error("Sentinel provider not implemented yet");
      default:
        throw new Error(
          `Unknown provider: ${(this.providerParams as any).provider}`
        );
    }

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    const response = await fetch(this.model_id);
    if (!response.ok) {
      throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load model using ONNX Runtime
    this.model = await ort.InferenceSession.create(uint8Array);
    this.initialized = true;
  }

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    const image = await this.dataProvider.getImage(polygon);
    return image;
  }

  async inference(polygon: GeoJSON.Feature): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    const inputs = await this.preProcessor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run({ image: inputs.input });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(outputs, geoRawImage);

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  private async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<any> {
    //code for postprocessing the output
    // create a binary mask from the output and convert it to a polygon
    console.log({ outputs, geoRawImage });
  }
}
