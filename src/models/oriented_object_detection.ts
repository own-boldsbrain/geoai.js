import { Mapbox } from "@/data_providers/mapbox";
import { RawImage } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";

import { ObjectDetectionResults } from "../models/zero_shot_object_detection";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";
import * as ort from "onnxruntime-web";
// import { createPolyIoUModule } from '../utils/wasm/polyiou.js';
import * as turf from "@turf/turf";

interface ConvertPredParams {
  pred_bbox: number[][];
  test_input_size: number;
  org_img_shape: [number, number];
  valid_scale: [number, number];
  conf_thresh: number;
}

export class OrientedObjectDetection {
  private static instance: OrientedObjectDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string; //model name or path
  private model: ort.InferenceSession | undefined;
  private initialized: boolean = false;
  private classes: string[] = [
    "plane",
    "baseball-diamond",
    "bridge",
    "ground-track-field",
    "small-vehicle",
    "large-vehicle",
    "ship",
    "tennis-court",
    "basketball-court",
    "storage-tank",
    "soccer-ball-field",
    "roundabout",
    "harbor",
    "swimming-pool",
    "helicopter",
  ];

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: OrientedObjectDetection }> {
    if (
      !OrientedObjectDetection.instance ||
      parametersChanged(
        OrientedObjectDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      OrientedObjectDetection.instance = new OrientedObjectDetection(
        model_id,
        providerParams
      );
      await OrientedObjectDetection.instance.initialize();
    }
    return { instance: OrientedObjectDetection.instance };
  }

  // private async preProcessor(image: GeoRawImage): Promise<any> {
  //   const transposeImage = (img: number[][][]): number[][][] => {
  //     const height = img.length;
  //     const width = img[0].length;
  //     const channels = img[0][0].length;

  //     // Initialize the transposed image
  //     const transposed = new Array(channels)
  //         .fill(0)
  //         .map(() => new Array(height)
  //             .fill(0)
  //             .map(() => new Array(width).fill(0)));

  //     // Perform the transpose operation
  //     for (let c = 0; c < channels; c++) {
  //         for (let h = 0; h < height; h++) {
  //             for (let w = 0; w < width; w++) {
  //                 transposed[c][h][w] = img[h][w][c];
  //             }
  //         }
  //     }

  //     return transposed;
  //   }
  //   const rawImage = new RawImage(image.data,image.height,image.width, image.channels);
  //   rawImage.resize(512, 512);
  //   console.log({rawImage});

  //   rawImage.save("/home/shoaib/scratch/code/geobase-ai.js/merged-geobase_gghl_resized.png");
  //   const floatData = Float32Array.from(rawImage.data);
  //   const inputs = {
  //       input: new ort.Tensor(floatData, [1,3, rawImage.height, rawImage.width])
  //   };
  //   return inputs;
  // }
  private async preProcessor(image: GeoRawImage): Promise<any> {
    // Create RawImage instance and resize it
    const rawImage = new RawImage(
      image.data,
      image.height,
      image.width,
      image.channels
    );
    rawImage.resize(512, 512);

    // Save the resized image (for debugging purposes)
    rawImage.save(
      "/home/shoaib/scratch/code/geobase-ai.js/merged-geobase_gghl_resized.png"
    );

    // Convert RawImage to a tensor in CHW format
    const tensor = rawImage.toTensor("CHW"); // Transpose to CHW format

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

    // Load model using ONNX Runtime
    this.model = await ort.InferenceSession.create(this.model_id);
    this.initialized = true;
  }

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    const image = this.dataProvider.getImage(polygon);
    return image;
  }

  async detection(polygon: GeoJSON.Feature): Promise<ObjectDetectionResults> {
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
      outputs = await this.model.run(inputs);
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    console.log({ outputs });

    outputs = this.postProcessor(outputs, geoRawImage);

    // return outputs as any;

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  private xywh2xyxy(x: number[][]): number[][] {
    return x.map(bbox => {
      const [x, y, w, h] = bbox;
      const x1 = x - w / 2;
      const y1 = y - h / 2;
      const x2 = x + w / 2;
      const y2 = y + h / 2;
      return [x1, y1, x2, y2];
    });
  }
  // private convertPred(
  //   pred_bbox: number[][],
  //   test_input_size: number,
  //   org_img_shape: [number, number],
  //   valid_scale: [number, number],
  //   conf_thresh: number
  // ): number[][] {
  //   const pred_xyxy = this.xywh2xyxy(pred_bbox.map(bbox => bbox.slice(0, 4)));
  //   const pred_conf = pred_bbox.map(bbox => bbox[13]);
  //   const pred_prob = pred_bbox.map(bbox => bbox.slice(14));
  //   const [org_h, org_w] = org_img_shape;
  //   console.log({org_h, org_w});
  //   const resize_ratio = Math.min(1.0 * test_input_size / org_w, 1.0 * test_input_size / org_h);
  //   const dw = (test_input_size - resize_ratio * org_w) / 2;
  //   const dh = (test_input_size - resize_ratio * org_h) / 2;

  //   for (let i = 0; i < pred_xyxy.length; i++) {
  //     pred_xyxy[i][0] = (pred_xyxy[i][0] - dw) / resize_ratio;
  //     pred_xyxy[i][1] = (pred_xyxy[i][1] - dh) / resize_ratio;
  //     pred_xyxy[i][2] = (pred_xyxy[i][2] - dw) / resize_ratio;
  //     pred_xyxy[i][3] = (pred_xyxy[i][3] - dh) / resize_ratio;
  //   }

  //   const pred_s = pred_bbox.map(bbox => bbox.slice(4, 8));
  //   const pred_r = pred_bbox.map(bbox => bbox.slice(8, 9));
  //   const zero = pred_s.map(() => [0, 0, 0, 0]);

  //   for (let i = 0; i < pred_s.length; i++) {
  //     if (pred_r[i][0] > 0.9) {
  //       pred_s[i] = zero[i];
  //     }
  //   }

  //   for (let i = 0; i < pred_xyxy.length; i++) {
  //     pred_xyxy[i][0] = Math.max(pred_xyxy[i][0], 0);
  //     pred_xyxy[i][1] = Math.max(pred_xyxy[i][1], 0);
  //     pred_xyxy[i][2] = Math.min(pred_xyxy[i][2], org_w - 1);
  //     pred_xyxy[i][3] = Math.min(pred_xyxy[i][3], org_h - 1);
  //   }

  //   const invalid_mask = pred_xyxy.map(bbox => bbox[0] > bbox[2] || bbox[1] > bbox[3]);

  //   for (let i = 0; i < invalid_mask.length; i++) {
  //     if (invalid_mask[i]) {
  //       pred_xyxy[i] = [0, 0, 0, 0];
  //       pred_s[i] = [0, 0, 0, 0];
  //     }
  //   }

  //   const bboxes_scale = pred_xyxy.map(bbox => Math.sqrt((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])));
  //   const scale_mask = bboxes_scale.map(scale => valid_scale[0] < scale && scale < valid_scale[1]);

  //   const classes = pred_prob.map(prob => prob.indexOf(Math.max(...prob)));
  //   const scores = pred_conf.map((conf, i) => conf * pred_prob[i][classes[i]]);
  //   const score_mask = scores.map(score => score > conf_thresh);
  //   const mask = scale_mask.map((scale, i) => scale && score_mask[i]);

  //   const filtered_pred_xyxy = pred_xyxy.filter((_, i) => mask[i]);
  //   const filtered_pred_s = pred_s.filter((_, i) => mask[i]);
  //   const filtered_pred_conf = pred_conf.filter((_, i) => mask[i]);
  //   const filtered_pred_prob = pred_prob.filter((_, i) => mask[i]);

  //   const coor4points = filtered_pred_s.map((s, i) => {
  //     const [x1, y1, x2, y2, x3, y3, x4, y4] = [
  //       s[0] * (filtered_pred_xyxy[i][2] - filtered_pred_xyxy[i][0]) + filtered_pred_xyxy[i][0],
  //       filtered_pred_xyxy[i][1],
  //       filtered_pred_xyxy[i][2],
  //       s[1] * (filtered_pred_xyxy[i][3] - filtered_pred_xyxy[i][1]) + filtered_pred_xyxy[i][1],
  //       filtered_pred_xyxy[i][2] - s[2] * (filtered_pred_xyxy[i][2] - filtered_pred_xyxy[i][0]),
  //       filtered_pred_xyxy[i][3],
  //       filtered_pred_xyxy[i][0],
  //       filtered_pred_xyxy[i][3] - s[3] * (filtered_pred_xyxy[i][3] - filtered_pred_xyxy[i][1])
  //     ];
  //     return [x1, y1, x2, y2, x3, y3, x4, y4];
  //   });

  //   const bboxes = coor4points.map((points, i) => [...points, filtered_pred_conf[i], ...filtered_pred_prob[i]]);

  //   return bboxes;
  // }
  private convertPred({
    pred_bbox,
    test_input_size,
    org_img_shape,
    valid_scale,
    conf_thresh,
  }: ConvertPredParams): number[][] {
    const fs = require("fs");
    const logFile =
      "/home/shoaib/scratch/code/geobase-ai.js/convertPred_debug.log";

    // Helper function to log array shapes
    const logShape = (lineNum: number, name: string, arr: any[]) => {
      const shape = Array.isArray(arr)
        ? `[${arr.length}${Array.isArray(arr[0]) ? `, ${arr[0].length}` : ""}]`
        : "not an array";
      const logMessage = `Line ${lineNum}: ${name}.shape = ${shape}\n`;
      console.log(logMessage);
      fs.appendFileSync(logFile, logMessage);
    };

    // Clear previous log file
    const timestamp = new Date().toISOString();
    fs.writeFileSync(logFile, `Starting convertPred method at ${timestamp}\n`);
    fs.appendFileSync(
      logFile,
      `Input parameters: test_input_size=${test_input_size}, org_img_shape=(${org_img_shape[0]}, ${org_img_shape[1]}), valid_scale=[${valid_scale[0]}, ${valid_scale[1] === Infinity ? "inf" : valid_scale[1]}]\n\n`
    );

    // Log input array shapes
    logShape(276, "pred_bbox", pred_bbox);

    const [org_h, org_w] = org_img_shape;
    fs.appendFileSync(
      logFile,
      `Line 279: org_h, org_w = (${org_h}, ${org_w})\n`
    );

    const resize_ratio = Math.min(
      test_input_size / org_w,
      test_input_size / org_h
    );
    fs.appendFileSync(logFile, `Line 282: resize_ratio = ${resize_ratio}\n`);

    const dw = (test_input_size - resize_ratio * org_w) / 2;
    fs.appendFileSync(logFile, `Line 285: dw = ${dw}\n`);

    const dh = (test_input_size - resize_ratio * org_h) / 2;
    fs.appendFileSync(logFile, `Line 288: dh = ${dh}\n`);

    // Extract and convert xywh to xyxy
    const xywh = pred_bbox.map(bbox => bbox.slice(0, 4));
    logShape(291, "xywh", xywh);

    const xyxy = xywh.map(box => {
      const [x, y, w, h] = box;
      return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    });
    logShape(297, "xyxy", xyxy);

    // Extract other components
    const pred_s = pred_bbox.map(bbox => bbox.slice(4, 8));
    logShape(301, "pred_s", pred_s);

    const pred_r = pred_bbox.map(bbox => bbox[8]);
    logShape(304, "pred_r", pred_r);

    const pred_conf = pred_bbox.map(bbox => bbox[13]);
    logShape(307, "pred_conf", pred_conf);

    const pred_prob = pred_bbox.map(bbox => bbox.slice(14));
    logShape(310, "pred_prob", pred_prob);

    // Adjust coordinates
    const adjusted_xyxy = xyxy.map(box => {
      return [
        (box[0] - dw) / resize_ratio,
        (box[1] - dh) / resize_ratio,
        (box[2] - dw) / resize_ratio,
        (box[3] - dh) / resize_ratio,
      ];
    });
    logShape(320, "adjusted_xyxy", adjusted_xyxy);

    // Handle rotation
    const zero = pred_s.map(() => [0, 0, 0, 0]);
    logShape(324, "zero", zero);

    const pred_s_adjusted = pred_s.map((s, i) => {
      return pred_r[i] > 0.9 ? zero[i] : s;
    });
    logShape(328, "pred_s_adjusted", pred_s_adjusted);

    // Clip coordinates
    const clipped_xyxy = adjusted_xyxy.map(box => {
      return [
        Math.max(0, box[0]),
        Math.max(0, box[1]),
        Math.min(org_w - 1, box[2]),
        Math.min(org_h - 1, box[3]),
      ];
    });
    logShape(337, "clipped_xyxy", clipped_xyxy);

    // Find invalid boxes
    const invalid_mask = clipped_xyxy.map(
      box => box[0] > box[2] || box[1] > box[3]
    );
    fs.appendFileSync(
      logFile,
      `Line 341: invalid_mask count = ${invalid_mask.filter(Boolean).length}\n`
    );

    // Zero out invalid boxes
    const final_xyxy = clipped_xyxy.map((box, i) => {
      return invalid_mask[i] ? [0, 0, 0, 0] : box;
    });
    logShape(346, "final_xyxy", final_xyxy);

    const final_pred_s = pred_s_adjusted.map((s, i) => {
      return invalid_mask[i] ? [0, 0, 0, 0] : s;
    });
    logShape(351, "final_pred_s", final_pred_s);

    // Calculate scale and apply scale mask
    const bboxes_scale = final_xyxy.map(box =>
      Math.sqrt((box[2] - box[0]) * (box[3] - box[1]))
    );
    logShape(357, "bboxes_scale", bboxes_scale);

    const scale_mask = bboxes_scale.map(
      scale => valid_scale[0] < scale && scale < valid_scale[1]
    );
    fs.appendFileSync(
      logFile,
      `Line 362: scale_mask count = ${scale_mask.filter(Boolean).length}\n`
    );

    // Calculate class scores
    const classes = pred_prob.map(prob => prob.indexOf(Math.max(...prob)));
    logShape(366, "classes", classes);

    const scores = pred_conf.map((conf, i) => conf * pred_prob[i][classes[i]]);
    logShape(369, "scores", scores);

    console.log({ scores: scores.slice(0, 10) });

    const score_mask = scores.map(score => score > conf_thresh);
    fs.appendFileSync(
      logFile,
      `Line 372: score_mask count = ${score_mask.filter(Boolean).length}\n`
    );

    // Combine masks
    const mask = scale_mask.map((scale, i) => scale && score_mask[i]);
    fs.appendFileSync(
      logFile,
      `Line 376: combined mask count = ${mask.filter(Boolean).length}\n`
    );

    // Apply masks to filter arrays
    const filtered_xyxy = final_xyxy.filter((_, i) => mask[i]);
    logShape(380, "filtered_xyxy", filtered_xyxy);

    const filtered_pred_s = final_pred_s.filter((_, i) => mask[i]);
    logShape(383, "filtered_pred_s", filtered_pred_s);

    const filtered_pred_conf = pred_conf.filter((_, i) => mask[i]);
    logShape(386, "filtered_pred_conf", filtered_pred_conf);

    const filtered_pred_prob = pred_prob.filter((_, i) => mask[i]);
    logShape(389, "filtered_pred_prob", filtered_pred_prob);

    // Calculate 4 corner points
    const coor4points = filtered_pred_s.map((s, i) => {
      const [x1, y1, x2, y2] = filtered_xyxy[i];
      const width = x2 - x1;
      const height = y2 - y1;

      return [
        s[0] * width + x1, // x1
        y1, // y1
        x2, // x2
        s[1] * height + y1, // y2
        x2 - s[2] * width, // x3
        y2, // y3
        x1, // x4
        y2 - s[3] * height, // y4
      ];
    });
    logShape(406, "coor4points", coor4points);

    // Combine with confidence and class probabilities
    const bboxes = coor4points.map((points, i) => {
      return [...points, filtered_pred_conf[i], ...filtered_pred_prob[i]];
    });
    logShape(412, "bboxes", bboxes);

    fs.appendFileSync(
      logFile,
      `\nFinished convertPred method at ${new Date().toISOString()}\n`
    );

    return bboxes;
  }

  private async non_max_suppression_4points(
    geoRawImage: GeoRawImage,
    prediction: number[][][],
    conf_thres: number = 0.2,
    iou_thres: number = 0.45,
    classes: number[] | null = null,
    multi_label: boolean = true,
    without_iouthres: boolean = false
  ): Promise<number[][]> {
    const nc = prediction[0][0].length - 9;
    const xc = prediction[0].map(p => p[8] > conf_thres);

    const max_det = 500;
    multi_label = multi_label && nc > 1;

    const output: number[][] = [];

    for (let xi = 0; xi < prediction.length; xi++) {
      let x = prediction[xi].filter((_, i) => xc[i]);

      if (!x.length) continue;

      x.forEach(p => {
        for (let i = 9; i < p.length; i++) {
          p[i] = p[i] * p[8];
        }
      });

      let box = x.map(p => p.slice(0, 8));

      if (multi_label) {
        const filtered = [];
        for (let i = 0; i < x.length; i++) {
          for (let j = 9; j < x[i].length; j++) {
            if (x[i][j] > conf_thres) {
              filtered.push([...box[i], x[i][j], j - 9]);
            }
          }
        }
        x = filtered;
      } else {
        x = x
          .map(p => {
            const maxConf = Math.max(...p.slice(9));
            const maxIndex = p.slice(9).indexOf(maxConf);
            return [...box[prediction[0].indexOf(p)], maxConf, maxIndex];
          })
          .filter(p => p[8] > conf_thres);
      }

      if (without_iouthres) {
        output.push(...x);
        continue;
      }

      if (classes) {
        x = x.filter(p => classes.includes(p[9]));
      }

      if (!x.length) continue;

      x.sort((a, b) => b[8] - a[8]);

      const boxes_4points = x.map(p => p.slice(0, 8));
      const scores = x.map(p => p[8]);

      //convert 4 points to lat long coordinates
      // const boxes_4points_latlong = boxes_4points.map(box => {
      //   const points = [
      //     [box[0], box[1]], [box[2], box[3]], [box[4], box[5]], [box[6], box[7]]
      //   ].map(point => {
      //     point = point.map(Math.round)
      //     return geoRawImage.pixelToWorld(point[0], point[1]);
      //   });
      //   return points.flat();
      // });
      const i = await this.py_cpu_nms_poly_fast(
        boxes_4points,
        scores,
        iou_thres
      );

      if (i.length > max_det) {
        i.length = max_det;
      }

      output.push(...i.map(index => x[index]));
    }

    return output;
  }

  private async iouPoly(p: number[], q: number[]): Promise<number> {
    if (p.length !== 8 || q.length !== 8) {
      throw new Error(
        "Each polygon must have exactly 4 points (8 values: x1, y1, x2, y2, x3, y3, x4, y4)"
      );
    }

    // Helper function: Compute polygon area using Shoelace formula
    function polygonArea(points: number[][]): number {
      let area = 0;
      const n = points.length;
      for (let i = 0; i < n; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % n];
        area += x1 * y2 - x2 * y1;
      }
      return Math.abs(area) / 2;
    }

    // Convert flat array [x1, y1, x2, y2, x3, y3, x4, y4] → [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    const poly1 = [
      [p[0], p[1]],
      [p[2], p[3]],
      [p[4], p[5]],
      [p[6], p[7]],
    ];
    const poly2 = [
      [q[0], q[1]],
      [q[2], q[3]],
      [q[4], q[5]],
      [q[6], q[7]],
    ];

    // Compute intersection points (Brute-force approximation)
    function getIntersectionPoints(
      polyA: number[][],
      polyB: number[][]
    ): number[][] {
      let intersection: number[][] = [];

      for (let pt of polyA) {
        if (isInside(pt, polyB)) intersection.push(pt);
      }
      for (let pt of polyB) {
        if (isInside(pt, polyA)) intersection.push(pt);
      }
      return intersection;
    }

    // Check if a point is inside a polygon using ray-casting
    function isInside(point: number[], polygon: number[][]): boolean {
      let [px, py] = point;
      let inside = false;
      const n = polygon.length;

      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        const intersect =
          yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
      }
      return inside;
    }

    // Get intersection polygon points
    const intersectionPolygon = getIntersectionPoints(poly1, poly2);

    if (intersectionPolygon.length < 3) {
      return 0;
    }
    // Compute areas
    const area1 = polygonArea(poly1);
    const area2 = polygonArea(poly2);
    const interArea = polygonArea(intersectionPolygon);

    // Compute IoU
    return interArea / (area1 + area2 - interArea);
  }

  private async py_cpu_nms_poly_fast(
    boxes: number[][],
    scores: number[],
    iou_thres: number
  ): Promise<number[]> {
    const x1 = boxes.map(box => Math.min(box[0], box[2], box[4], box[6]));
    const y1 = boxes.map(box => Math.min(box[1], box[3], box[5], box[7]));
    const x2 = boxes.map(box => Math.max(box[0], box[2], box[4], box[6]));
    const y2 = boxes.map(box => Math.max(box[1], box[3], box[5], box[7]));
    const areas = x1.map((x, i) => (x2[i] - x + 1) * (y2[i] - y1[i] + 1));

    const polys = boxes.map(box => [
      box[0],
      box[1],
      box[2],
      box[3],
      box[4],
      box[5],
      box[6],
      box[7],
    ]);

    const order = scores
      .map((score, i) => [score, i])
      .sort((a, b) => b[0] - a[0])
      .map(item => item[1]);

    const keep: number[] = [];
    while (order.length > 0) {
      const i = order[0];
      keep.push(i);

      const xx1 = order.slice(1).map(j => Math.max(x1[i], x1[j]));
      const yy1 = order.slice(1).map(j => Math.max(y1[i], y1[j]));
      const xx2 = order.slice(1).map(j => Math.min(x2[i], x2[j]));
      const yy2 = order.slice(1).map(j => Math.min(y2[i], y2[j]));
      const w = xx2.map((x, idx) => Math.max(0.0, x - xx1[idx] + 1));
      const h = yy2.map((y, idx) => Math.max(0.0, y - yy1[idx] + 1));
      const inter = w.map((width, idx) => width * h[idx]);
      const hbb_ovr = inter.map(
        (area, idx) => area / (areas[i] + areas[order[idx + 1]] - area)
      );

      const h_inds = hbb_ovr
        .map((overlap, idx) => (overlap > 0 ? idx : -1))
        .filter(idx => idx !== -1);
      const tmp_order = order.slice(1).filter((_, idx) => h_inds.includes(idx));

      for (let j = 0; j < tmp_order.length; j++) {
        const iou = await this.iouPoly(polys[i], polys[tmp_order[j]]);
        console.log({ iou });
        hbb_ovr[h_inds[j]] = iou;
      }

      const inds = hbb_ovr
        .map((overlap, idx) => (overlap <= iou_thres ? idx : -1))
        .filter(idx => idx !== -1);
      order.splice(0, 1);
      for (let k = inds.length - 1; k >= 0; k--) {
        order.splice(inds[k], 1);
      }
    }
    return keep;
  }

  private async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<any> {
    geoRawImage.save(
      "/home/shoaib/scratch/code/geobase-ai.js/merged-geobase_gghl.png"
    );
    console.log({ geoRawImage });

    //convert tensor to array
    const dimsensions = outputs.output.dims;
    // convert 1 d array to 2d array
    const data = outputs.output.data;
    const pred_bbox = [];
    for (let i = 0; i < dimsensions[0]; i++) {
      pred_bbox.push(data.slice(i * dimsensions[1], (i + 1) * dimsensions[1]));
    }
    //save model output in file
    const fs = require("fs");
    await fs.writeFileSync(
      "/home/shoaib/scratch/code/geobase-ai.js/model_output.json",
      JSON.stringify(pred_bbox, null, 2)
    );

    const valid_scale: [number, number] = [0, Infinity];
    let predbboxes = this.convertPred({
      pred_bbox,
      test_input_size: 512,
      org_img_shape: [geoRawImage.width, geoRawImage.height],
      valid_scale,
      conf_thresh: 0.2,
    });

    //print dimensions of predbboxes
    console.log({
      predbboxes: predbboxes.length,
      predbboxes_0: predbboxes[0].length,
    });

    predbboxes = await this.non_max_suppression_4points(
      geoRawImage,
      predbboxes,
      0.2,
      0.45
    );

    console.log(JSON.stringify(predbboxes));

    // predbboxes = [
    //   [222, 244, 257, 289, 237, 306, 202, 262, 0.79, 3],
    //   [357, 172, 380, 216, 357, 229, 333, 186, 0.76, 3],
    //   [193, 231, 212, 332, 149, 342, 130, 243, 0.74, 3],
    //   [299, 364, 321, 374, 317, 384, 294, 374, 0.61, 2],
    //   [347, 351, 352, 356, 346, 363, 341, 359, 0.61, 13],
    //   [448, 218, 465, 260, 459, 262, 441, 220, 0.59, 2]
    // ];

    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    for (const bbox of predbboxes) {
      const [x1, y1, x2, y2, x3, y3, x4, y4, score, class_ind] = bbox;
      const class_name = this.classes[class_ind];
      const points = [
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x4, y4],
        [x1, y1],
      ].map(point => {
        point = point.map(Math.round);
        return geoRawImage.pixelToWorld(point[0], point[1]);
      });

      const feature: GeoJSON.Feature = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [points],
        },
        properties: {
          score,
          class_name,
        },
      };
      featureCollection.features.push(feature);

      // img.drawPolygon(points, color, 2);
      // img.drawText(`${class_name} ${score.toFixed(4)}`, [x1, y1], { color: [255, 255, 255], fontSize: 0.3 });
    }

    // const storePath = `${this.pred_result_path}/imgs/${img_id}.png`;
    // img.save(storePath, { quality: 100 });

    console.log(JSON.stringify(featureCollection));

    return featureCollection;
  }
}
