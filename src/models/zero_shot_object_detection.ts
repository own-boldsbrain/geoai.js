import { Mapbox } from "@/data_providers/mapbox";
import {
  AutoModelForZeroShotObjectDetection,
  AutoProcessor,
  load_image,
  pipeline,
  RawImage,
} from "@huggingface/transformers";

interface ProviderParams {
  apiKey: string;
  style: string;
}

export interface ObjectDetectionResults {
  scores: number[];
  boxes: number[][];
  labels: string[];
}

export class ZeroShotObjectDetection {
  private static instance: ZeroShotObjectDetection | null = null;
  private provider: string;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox;
  private model_id: string;
  private model: typeof AutoModelForZeroShotObjectDetection;
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
  ): Promise<{ instance: ZeroShotObjectDetection }> {
    if (!ZeroShotObjectDetection.instance) {
      ZeroShotObjectDetection.instance = new ZeroShotObjectDetection(
        model_id,
        provider,
        providerParams
      );
      await ZeroShotObjectDetection.instance.initialize();
    }
    return { instance: ZeroShotObjectDetection.instance };
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

    this.model = await AutoModelForZeroShotObjectDetection.from_pretrained(
      this.model_id,
      { dtype: "fp32" }
    );

    this.processor = await AutoProcessor.from_pretrained(this.model_id);

    this.initialized = true;
  }

  // private polygon_to_image_uri(polygon: GeoJSON.Feature): string {
  //   return this.dataProvider.get_image_uri(polygon);
  // }

  private async polygon_to_image(polygon: GeoJSON.Feature): Promise<RawImage> {
    const image = this.dataProvider.get_image(polygon);
    return image;
  }

  async detection(
    polygon: GeoJSON.Feature,
    text: string
  ): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized properly");
    }

    const image = await this.polygon_to_image(polygon);
    // const image = await load_image(best_fitting_tile_uri);

    console.log(image);
    let inputs;
    try {
      inputs = await this.processor(image, text);
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    let outputs;
    try {
      outputs = await this.model(inputs);
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    const results = this.processor.post_process_grounded_object_detection(
      outputs,
      inputs.input_ids,
      {
        box_threshold: 0.3,
        text_threshold: 0.3,
        target_sizes: [image.size.reverse()],
      }
    );

    return results;
  }
}
