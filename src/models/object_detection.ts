import { Mapbox } from "@/data_providers/mapbox";
import { AutoModel, AutoProcessor, RawImage } from "@huggingface/transformers";

import { ObjectDetectionResults } from "../models/zero_shot_object_detection";
import { postProcessYoloOutput } from "@/utils/utils";

interface ProviderParams {
  apiKey: string;
  style: string;
}

export class ObjectDetection {
  private static instance: ObjectDetection | null = null;
  private provider: string;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox;
  private model_id: string;
  private model: typeof AutoModel;
  private processor: typeof AutoProcessor;

  private initialized: boolean = false;

  private constructor(
    model_id: string,
    provider: string,
    providerParams: ProviderParams
  ) {
    this.model_id = model_id;
    this.provider = provider;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    provider: string,
    providerParams: ProviderParams
  ): Promise<{ instance: ObjectDetection }> {
    if (!ObjectDetection.instance) {
      ObjectDetection.instance = new ObjectDetection(
        model_id,
        provider,
        providerParams
      );
      await ObjectDetection.instance.initialize();
    }
    return { instance: ObjectDetection.instance };
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

    this.model = await AutoModel.from_pretrained(this.model_id, {
      dtype: "fp32",
    });

    this.processor = await AutoProcessor.from_pretrained(this.model_id);

    this.initialized = true;
  }

  private async polygon_to_image(polygon: GeoJSON.Feature): Promise<RawImage> {
    const image = this.dataProvider.get_image(polygon);
    return image;
  }

  async detection(polygon: GeoJSON.Feature): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized properly");
    }

    const image = await this.polygon_to_image(polygon);
    image.save("test_mapbox_image.png");
    // const image = await load_image(best_fitting_tile_uri);

    let outputs;
    let inputs;
    try {
      inputs = await this.processor(image);
      outputs = await this.model({ images: inputs.pixel_values });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    const results = postProcessYoloOutput(
      outputs,
      inputs.pixel_values,
      image,
      this.model.config.id2label
    );

    return results;
  }
}
