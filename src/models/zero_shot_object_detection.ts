import { Mapbox } from "@/data_providers/mapbox";
import { pipeline, RawImage } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
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
  private detector: any;

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
    if (
      !ZeroShotObjectDetection.instance ||
      parametersChanged(
        ZeroShotObjectDetection.instance,
        model_id,
        provider,
        providerParams
      )
    ) {
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

    this.detector = await pipeline("zero-shot-object-detection", this.model_id);

    this.initialized = true;
  }

  private async polygon_to_image(polygon: GeoJSON.Feature): Promise<RawImage> {
    const image = this.dataProvider.get_image(polygon);
    return image;
  }

  async detection(
    polygon: GeoJSON.Feature,
    text: string | string[]
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

    let outputs;
    try {
      const candidate_labels = Array.isArray(text) ? text : [text];
      outputs = await this.detector(image, candidate_labels, {
        topk: 4,
        threshold: 0.2,
      });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    const model_output = {
      scores: [],
      boxes: [],
      labels: [],
    };

    outputs.forEach((item: any) => {
      model_output.scores.push(item.score);
      model_output.boxes.push([
        item.box.xmin,
        item.box.ymin,
        item.box.xmax,
        item.box.ymax,
      ]);
      model_output.labels.push(item.label);
    });
    return model_output;
  }
}
