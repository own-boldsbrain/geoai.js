import { Mapbox } from "@/data_providers/mapbox";
import { RawImage } from "@huggingface/transformers";
import { SamModel, AutoProcessor } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";

interface ProviderParams {
  apiKey: string;
  style: string;
}

interface SegmentationResult {
  embeddings: any;
  masks: any;
  rawImage: RawImage;
}

export class GenericSegmentation {
  private static instance: GenericSegmentation | null = null;
  private provider: string;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox;
  private model_id: string;
  private model: typeof SamModel;
  private processor: typeof AutoProcessor;
  private image_inputs: any;
  private image_embeddings: any;
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
  ): Promise<{ instance: GenericSegmentation }> {
    if (
      !GenericSegmentation.instance ||
      parametersChanged(
        GenericSegmentation.instance,
        model_id,
        provider,
        providerParams
      )
    ) {
      GenericSegmentation.instance = new GenericSegmentation(
        model_id,
        provider,
        providerParams
      );
      await GenericSegmentation.instance.initialize();
    }
    return { instance: GenericSegmentation.instance };
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

    // Then initialize model components
    this.model = await SamModel.from_pretrained(this.model_id, {
      quantized: true,
    });
    this.processor = await AutoProcessor.from_pretrained(this.model_id);

    this.initialized = true;
  }

  async segment(
    polygon: GeoJSON.Feature,
    input_points: number[][]
  ): Promise<SegmentationResult> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized properly");
    }

    const rawImage = await this.polygon_to_image(polygon);
    const inputs = await this.processor(rawImage, { input_points });
    const outputs = await this.model(inputs);
    const masks = await this.processor.post_process_masks(
      outputs.pred_masks,
      inputs.original_sizes,
      inputs.reshaped_input_sizes
    );

    return {
      masks,
      rawImage,
    };
  }

  private async polygon_to_image(polygon: GeoJSON.Feature): Promise<RawImage> {
    const image = this.dataProvider.get_image(polygon);
    return image;
  }
}
