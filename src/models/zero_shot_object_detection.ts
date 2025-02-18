import { Mapbox } from "@/data_providers/mapbox";
import { pipeline, RawImage } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";

export type ObjectDectection = {
  label: string;
  score: number;
  box: [number, number, number, number];
};

export interface ObjectDetectionResults {
  detections: Array<ObjectDectection>;
  geoRawImage: GeoRawImage;
}

export class ZeroShotObjectDetection {
  private static instance: ZeroShotObjectDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | undefined;
  private model_id: string;
  private detector: any;

  private initialized: boolean = false;

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams
  ): Promise<{ instance: ZeroShotObjectDetection }> {
    if (
      !ZeroShotObjectDetection.instance ||
      parametersChanged(
        ZeroShotObjectDetection.instance,
        model_id,
        providerParams
      )
    ) {
      ZeroShotObjectDetection.instance = new ZeroShotObjectDetection(
        model_id,
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

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized properly");
    }
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

    const geoRawImage = await this.polygon_to_image(polygon);
    const rawImage = new RawImage(
      geoRawImage.data,
      geoRawImage.width,
      geoRawImage.height,
      geoRawImage.channels
    );

    let outputs;
    try {
      const candidate_labels = Array.isArray(text) ? text : [text];
      outputs = await this.detector(rawImage, candidate_labels, {
        topk: 4,
        threshold: 0.2,
      });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }
    return {
      detections: outputs,
      geoRawImage,
    };
  }
}
