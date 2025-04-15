import { Mapbox } from "@/data_providers/mapbox";
import { getPolygonFromMask, parametersChanged } from "@/utils/utils";

import { ObjectDetectionResults } from "../models/zero_shot_object_detection";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";
import * as ort from "onnxruntime-web";

/**
 * Base class for all geo-based detection models
 */
abstract class BaseDetectionModel {
  protected static instance: BaseDetectionModel | null = null;
  protected providerParams: ProviderParams;
  protected dataProvider: Mapbox | Geobase | undefined;
  protected model_id: string; // model name or path
  protected model: ort.InferenceSession | undefined;
  protected initialized: boolean = false;
  protected zoom?: number;

  protected constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  protected async preProcessor(
    image: GeoRawImage
  ): Promise<{ input: ort.Tensor }> {
    const tensor = image.toTensor("CHW"); // Transpose to CHW format (equivalent to Python's transpose(2, 0, 1))

    // Convert tensor data to Float32Array and normalize
    const floatData = new Float32Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
      floatData[i] = tensor.data[i] / 255.0; // Normalize to [0, 1]
    }

    // Create the ONNX Runtime tensor
    return {
      input: new ort.Tensor(floatData, [
        1,
        tensor.dims[0],
        tensor.dims[1],
        tensor.dims[2],
      ]),
    };
  }

  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider
    this.initializeDataProvider();

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    // Fetch and load model
    await this.loadModel();
    this.initialized = true;
  }

  private initializeDataProvider(): void {
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
  }

  private async loadModel(): Promise<void> {
    const response = await fetch(this.model_id);
    if (!response.ok) {
      throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load model using ONNX Runtime
    this.model = await ort.InferenceSession.create(uint8Array);
  }

  protected async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    return await this.dataProvider.getImage(
      polygon,
      undefined,
      undefined,
      this.zoom
    );
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
        throw new Error("Model not initialized");
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

  protected async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<GeoJSON.FeatureCollection> {
    const { masks } = outputs;

    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims;
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];

    const masksArray: Uint8Array[] = [];
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

      return {
        type: "FeatureCollection",
        features,
      };
    }

    return {
      type: "FeatureCollection",
      features: [],
    };
  }
}

export class SolarPanelDetection extends BaseDetectionModel {
  private static instanceRef: SolarPanelDetection | null = null;

  private constructor(model_id: string, providerParams: ProviderParams) {
    super(model_id, providerParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: SolarPanelDetection }> {
    if (
      !SolarPanelDetection.instanceRef ||
      parametersChanged(
        SolarPanelDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      SolarPanelDetection.instanceRef = new SolarPanelDetection(
        model_id,
        providerParams
      );
      await SolarPanelDetection.instanceRef.initialize();
    }
    return { instance: SolarPanelDetection.instanceRef };
  }
}

export class ShipDetection extends BaseDetectionModel {
  private static instanceRef: ShipDetection | null = null;

  private constructor(model_id: string, providerParams: ProviderParams) {
    super(model_id, providerParams);
    this.zoom = 21; // Set specific zoom level for ship detection
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: ShipDetection }> {
    if (
      !ShipDetection.instanceRef ||
      parametersChanged(
        ShipDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ShipDetection.instanceRef = new ShipDetection(model_id, providerParams);
      await ShipDetection.instanceRef.initialize();
    }
    return { instance: ShipDetection.instanceRef };
  }
}

export class CarDetection extends BaseDetectionModel {
  private static instanceRef: CarDetection | null = null;

  private constructor(model_id: string, providerParams: ProviderParams) {
    super(model_id, providerParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: CarDetection }> {
    if (
      !CarDetection.instanceRef ||
      parametersChanged(
        CarDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      CarDetection.instanceRef = new CarDetection(model_id, providerParams);
      await CarDetection.instanceRef.initialize();
    }
    return { instance: CarDetection.instanceRef };
  }
}

export class BuildingDetection extends BaseDetectionModel {
  private static instanceRef: BuildingDetection | null = null;

  private constructor(model_id: string, providerParams: ProviderParams) {
    super(model_id, providerParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: BuildingDetection }> {
    if (
      !BuildingDetection.instanceRef ||
      parametersChanged(
        BuildingDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      BuildingDetection.instanceRef = new BuildingDetection(
        model_id,
        providerParams
      );
      await BuildingDetection.instanceRef.initialize();
    }
    return { instance: BuildingDetection.instanceRef };
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
      outputs = await this.model.run({ input: inputs.input });
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
  ): Promise<GeoJSON.FeatureCollection> {
    outputs = Object.values(outputs);
    const masks = outputs[1];
    const labels = outputs[3];
    const scores = outputs[0].data as Float32Array;
    const threshold = 0.5;

    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims; // [masknumber, 1, height, width]
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];

    const features: GeoJSON.Feature[] = [];

    // Process each mask separately
    for (let idx = 0; idx < maskDims[0]; idx++) {
      if (scores[idx] > threshold) {
        const maskArray = new Uint8Array(maskHeight * maskWidth);
        const startIdx = idx * maskHeight * maskWidth;

        // Extract single mask
        for (let i = 0; i < maskHeight * maskWidth; i++) {
          maskArray[i] = maskData[startIdx + i] > 0.5 ? 1 : 0;
        }

        // Convert to 2D binary mask
        const binaryMask2D: number[][] = [];
        for (let i = 0; i < maskHeight; i++) {
          const row: number[] = [];
          for (let j = 0; j < maskWidth; j++) {
            const index = i * maskWidth + j;
            row.push(maskArray[index]);
          }
          binaryMask2D.push(row);
        }

        // //save binaryMask2D as png
        // const visualMaskArray = new Uint8Array(maskArray.length);
        // for (let i = 0; i < maskArray.length; i++) {
        //   visualMaskArray[i] = maskArray[i] * 255;
        // }
        // const binaryMaskImage = new RawImage(
        //   visualMaskArray,
        //   maskHeight,
        //   maskWidth,
        //   1
        // );
        // binaryMaskImage.save(`mask_wetland_${idx}.png`);

        // Convert mask to polygon
        const polygon = getPolygonFromMask(binaryMask2D, geoRawImage);
        if (polygon) {
          features.push({
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [polygon],
            },
            properties: {
              score: scores[idx],
              label: labels ? labels.data[idx] : undefined,
            },
          });
        }
      }
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }
}
