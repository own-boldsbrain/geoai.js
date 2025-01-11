// import {
//   env,
//   SamModel,
//   AutoProcessor,
//   RawImage,
//   Tensor,
//   pipeline,
// } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2";
// // } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

import { Mapbox } from "@/data_providers/mapbox";
import { RawImage } from "@huggingface/transformers";
import { SamModel, AutoProcessor } from "@huggingface/transformers";
// env.allowLocalModels = false;

// // We adopt the singleton pattern to enable lazy-loading of the model and processor.
// class SegmentAnythingSingleton {
//   static model_id = "Xenova/slimsam-77-uniform";
//   static model;
//   static processor;
//   static quantized = true;

//   static getInstance() {
//     if (!this.model) {
//       this.model = SamModel.from_pretrained(this.model_id, {
//         quantized: this.quantized,
//       });
//     }
//     if (!this.processor) {
//       this.processor = AutoProcessor.from_pretrained(this.model_id);
//     }

//     return Promise.all([this.model, this.processor]);
//   }
// }

// export class GeobaseSamGeo {
//   private static instance: GeobaseSamGeo;
//   private model;
//   private processor;
//   private ready: boolean;
//   private image_embeddings: any;
//   private image_inputs: any;

//   private constructor() {
//     this.ready = false;
//     this.image_embeddings = null;
//     this.image_inputs = null;
//   }

//   static async getInstance() {
//     if (!this.instance) {
//       this.instance = new GeobaseSamGeo();
//       [this.instance.model, this.instance.processor] =
//         await SegmentAnythingSingleton.getInstance();
//       this.instance.ready = true;
//     }
//     return this.instance;
//   }

//   isReady() {
//     return this.ready;
//   }

//   // private method to create embeddings from an image
//   async create_embeddings_from_image_uri(image_uri: string) {
//     const image = await RawImage.read(image_uri);
//     this.image_inputs = await this.processor(image);
//     this.image_embeddings = await this.model.get_image_embeddings(
//       this.image_inputs
//     );
//   }

//   // create_embeddings_from_tile_click
//   // query
//   async query(
//     input: Array<{
//       point: Array<number>;
//       label: number;
//     }>
//   ) {
//     const reshaped = this.image_inputs.reshaped_input_sizes[0];
//     const points = input.map(x => [
//       x.point[0] * reshaped[1],
//       x.point[1] * reshaped[0],
//     ]);
//     const labels = input.map(x => BigInt(x.label));

//     const input_points = new Tensor("float32", points.flat(Infinity), [
//       1,
//       1,
//       points.length,
//       2,
//     ]);
//     const input_labels = new Tensor("int64", labels.flat(Infinity), [
//       1,
//       1,
//       labels.length,
//     ]);

//     const outputs = await this.model({
//       ...this.image_embeddings,
//       input_points,
//       input_labels,
//     });

//     // Post-process the mask
//     const masks = await this.processor.post_process_masks(
//       outputs.pred_masks,
//       this.image_inputs.original_sizes,
//       this.image_inputs.reshaped_input_sizes
//     );

//     const return_value = {
//       mask: RawImage.fromTensor(masks[0][0]),
//       scores: outputs.iou_scores.data,
//     };

//     return return_value;
//   }
// }

export class GenericSegmentation {
  private provider: string;
  private providerParams: any;
  private dataProvider: any;
  private model_id: string;
  private model: any;
  private processor: any;
  private image_inputs: any;
  private image_embeddings: any;
  static async getInstance(
    model_id: string,
    provider: string,
    providerParams: any
  ) {
    this.model_id = model_id;
    this.provider = provider;
    this.providerParams = providerParams;
    if (provider === "mapbox") {
      this.dataProvider = new Mapbox(
        providerParams.apiKey,
        providerParams.style
      );
    }
    this.model = await SamModel.from_pretrained(this.model_id, {
      quantized: true,
    });
    if (!this.processor) {
      this.processor = await AutoProcessor.from_pretrained(this.model_id);
    }
  }

  async segment(polygon: any) {
    const best_fitting_tile_uri = this.polygon_to_image_uri(polygon);
    // next calculate the embeddings
    const embeddings = await this.create_embeddings_from_image_uri(
      best_fitting_tile_uri
    );
    return Promise.resolve({
      embeddings,
      masks: polygon,
      best_fitting_tile_uri,
    });
  }

  polygon_to_image_uri(polygon: any) {
    return this.dataProvider.get_image_uri(polygon);
  }

  async create_embeddings_from_image_uri(image_uri: string) {
    const image = await RawImage.read(image_uri);
    this.image_inputs = await this.processor(image);
    this.image_embeddings = await this.model.get_image_embeddings(
      this.image_inputs
    );
    return this.image_embeddings;
  }
}
