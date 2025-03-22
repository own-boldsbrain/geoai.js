import { Mapbox } from "@/data_providers/mapbox";
import { RawImage } from "@huggingface/transformers";
import { getPolygonFromMask, parametersChanged } from "@/utils/utils";
import sharp from "sharp";
const cv = require("@techstark/opencv-js");
// import cv from "@techstark/opencv-js";

import { ObjectDetectionResults } from "../models/zero_shot_object_detection";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";
import * as ort from "onnxruntime-web";
import { iouPoly } from "@/utils/gghl/polyiou";
const fs = require("fs");

export class LandCoverClassification {
  private static instance: LandCoverClassification | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string; //model name or path
  private model: ort.InferenceSession | undefined;
  private initialized: boolean = false;
  private classes: string[] = [
    "bareland",
    "rangeland",
    "developed space",
    "road",
    "tree",
    "water",
    "agriculture land",
    "buildings",
  ];
  private colors: number[][] = [
    [128, 0, 0],
    [0, 255, 0],
    [192, 192, 192],
    [255, 255, 255],
    [49, 139, 87],
    [0, 0, 255],
    [127, 255, 0],
    [255, 0, 0],
  ];

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: LandCoverClassification }> {
    if (
      !LandCoverClassification.instance ||
      parametersChanged(
        LandCoverClassification.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      LandCoverClassification.instance = new LandCoverClassification(
        model_id,
        providerParams
      );
      await LandCoverClassification.instance.initialize();
    }
    return { instance: LandCoverClassification.instance };
  }

  private async preProcessor(image: GeoRawImage): Promise<any> {
    // image.save("image_geobase.png");
    // Create RawImage instance and resize it
    let rawImage = new RawImage(
      image.data,
      image.height,
      image.width,
      image.channels
    );

    // If image has 4 channels, remove the alpha channel
    if (image.channels > 3) {
      const newData = new Uint8Array(image.width * image.height * 3);
      for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
        newData[j] = image.data[i]; // R
        newData[j + 1] = image.data[i + 1]; // G
        newData[j + 2] = image.data[i + 2]; // B
      }
      rawImage = new RawImage(newData, image.height, image.width, 3);
    }

    // let hwcData = rawImage.toTensor("HWC").data as Uint8Array;

    // // Ensure it's in RGB format (remove alpha if present)
    // const channels = image.channels > 3 ? 3 : image.channels;

    // // Convert the pixel data into an actual image
    // const formattedBuffer = await sharp(Buffer.from(hwcData), {
    //   raw: {
    //     width: image.width,
    //     height: image.height,
    //     channels: channels,
    //   },
    // })
    //   .toFormat("jpg") // Convert to PNG format
    //   .toBuffer();

    // // Resize to 1024x1024
    // const resizedBuffer = await sharp(formattedBuffer)
    //   .resize(1024, 1024)
    //   .raw()
    //   .toBuffer();

    // // Convert resized buffer back to Uint8Array
    // const resizedImageData = new Uint8Array(resizedBuffer);

    // console.log({ resizedImageData: resizedImageData.length });

    // // Create a new RawImage object with resized data
    // const resizedRawImage = new RawImage(resizedImageData, 1024, 1024, 3);

    // resizedRawImage.save("resizedRawImage_geobase.png");

    // console.log({ resizedRawImage });

    let tensor = rawImage.toTensor("CHW");
    const data = tensor.data as Uint8Array;

    console.log({ data, dataL: data.length });

    // Create a Float32Array to store normalized pixel values
    const floatData = new Float32Array(image.width * image.height * 3);

    // Normalize pixel values to the range [0, 1]
    for (let i = 0; i < image.width * image.height * 3; i++) {
      floatData[i] = data[i] / 255.0; // Normalize to [0, 1]
    }

    // Normalize (same as PyTorch transforms.Normalize)
    const mean = [0.4325, 0.4483, 0.3879];
    const std = [0.0195, 0.0169, 0.0179];

    // Normalize pixel values
    for (let i = 0; i < image.width * image.height * 3; i++) {
      floatData[i] = (floatData[i] - mean[i % 3]) / std[i % 3];
    }
    // tensor = tensor.div(255); // Convert [0, 255] → [0, 1]
    // .sub(mean) // Subtract mean
    // .div(std); // Divide by std

    // Convert Float32Array to Float32 tensor
    let normal_tensor = new ort.Tensor("float32", floatData, [
      3,
      image.height,
      image.width,
    ]);
    // Add batch dimension (1, C, H, W)
    normal_tensor = normal_tensor.reshape([1, 3, image.height, image.width]);

    // Create the ONNX Runtime tensor
    const inputs = { input: normal_tensor };

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
    const image = this.dataProvider.getImage(polygon);
    return image;
  }

  async inference(polygon: GeoJSON.Feature): Promise<any> {
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
    console.log({ inputs, data: inputs.input.data });
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

    // let output = outputs[Object.keys(outputs)[0]]; // Extract first tensor
    let output = outputs.output; // Extract first tensor
    console.log({ output });

    console.log("Output shape:", output.dims); // Expect (1, 8, 512, 512)

    // Convert to Float32Array and remove batch dimension (1, 8, 512, 512) → (8, 512, 512)
    const squeezedOutput = output.data as Float32Array;
    const [batch, channels, height, width] = output.dims;

    if (batch !== 1) throw new Error("Unexpected batch size");

    // Initialize argmax output (512 x 512)
    const argmaxOutput = new Uint8Array(height * width);

    // Compute argmax along the channel axis (8 classes)
    for (let i = 0; i < height * width; i++) {
      let maxIndex = 0;
      let maxValue = squeezedOutput[i];

      for (let j = 1; j < channels; j++) {
        const value = squeezedOutput[j * height * width + i];
        if (value > maxValue) {
          maxValue = value;
          maxIndex = j;
        }
      }
      argmaxOutput[i] = maxIndex; // Assign class index with highest probability
    }

    // Initialize output image (512 x 512 x 3)
    const outputImage = new Uint8Array(height * width * 3);

    // Create a binary mask for each class
    const binaryMasks: RawImage[] = [];
    for (let c = 0; c < channels; c++) {
      const mask = new Uint8Array(height * width);
      for (let i = 0; i < height * width; i++) {
        mask[i] = argmaxOutput[i] === c ? 1 : 0;
      }
      // binaryMasks.push(mask);

      // Save each binary mask as an image
      const maskImage = new Uint8Array(height * width * 3);
      for (let i = 0; i < height * width; i++) {
        const value = mask[i] * 255;
        maskImage[i * 3] = value;
        maskImage[i * 3 + 1] = value;
        maskImage[i * 3 + 2] = value;
      }
      const maskRawImage = new RawImage(maskImage, height, width, 3);
      binaryMasks.push(maskRawImage);
      // maskRawImage.save(`binary_mask_class_${c}.png`);
    }

    const featureCollection: GeoJSON.FeatureCollection[] =
      await this.postProcessor(binaryMasks, geoRawImage);
    // Assign color to each pixel based on class index
    for (let i = 0; i < height * width; i++) {
      const classIndex = argmaxOutput[i];
      const color = this.colors[classIndex];
      const offset = i * 3;
      outputImage[offset] = color[0];
      outputImage[offset + 1] = color[1];
      outputImage[offset + 2] = color[2];
    }

    // Create a new RawImage object with output data
    const outputRawImage = new RawImage(outputImage, height, width, 3);
    // outputRawImage.save("output_geobase.png");

    return {
      detections: featureCollection,
      geoRawImage,
      binaryMasks,
      outputRawImage,
    };

    // // Assign color to each pixel based on class index
    // for (let i = 0; i < height * width; i++) {
    //   const classIndex = argmaxOutput[i];
    //   const color = this.colors[classIndex];
    //   const offset = i * 3;
    //   outputImage[offset] = color[0];
    //   outputImage[offset + 1] = color[1];
    //   outputImage[offset + 2] = color[2];
    // }

    // Create a new RawImage object with output data
    // const outputRawImage = new RawImage(outputImage, height, width, 3);

    // outputRawImage.save("output_geobase.png");

    // return {
    //   detections: outputs,
    //   geoRawImage,
    // };
  }

  private async postProcessor(
    binaryMasks: RawImage[],
    geoRawImage: GeoRawImage
  ): Promise<GeoJSON.FeatureCollection[]> {
    const maskGeojson: GeoJSON.FeatureCollection[] = [];
    binaryMasks.forEach((mask, index) => {
      const maskDataArray = Array.from(mask.data);

      const maskMat = cv.matFromArray(
        mask.height,
        mask.width,
        cv.CV_8UC3,
        maskDataArray
      );

      const gray = new cv.Mat();
      cv.cvtColor(maskMat, gray, cv.COLOR_RGB2GRAY);
      let thresh = new cv.Mat();
      cv.threshold(gray, thresh, 128, 255, cv.THRESH_BINARY);
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        thresh,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      const refinedMask = cv.Mat.zeros(mask.height, mask.width, cv.CV_8UC1);

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const epsilon = 0.01 * cv.arcLength(contour, true); // Adjust epsilon to be a smaller fraction of the contour perimeter
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, epsilon, true);
        const approxVector = new cv.MatVector();
        approxVector.push_back(approx);

        cv.drawContours(
          refinedMask,
          approxVector,
          -1,
          new cv.Scalar(255),
          cv.FILLED
        );
        approx.delete();
        approxVector.delete();
      }

      // Step 2: Find contours and filter based on area
      const cleanedMaskContours = new cv.MatVector();
      const cleanedMaskHierarchy = new cv.Mat();
      cv.findContours(
        refinedMask,
        cleanedMaskContours,
        cleanedMaskHierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      const finalRefinedMask = cv.Mat.zeros(
        mask.height,
        mask.width,
        cv.CV_8UC1
      );
      const minArea = 20; // Adjust threshold based on noise size

      for (let i = 0; i < cleanedMaskContours.size(); i++) {
        const contour = cleanedMaskContours.get(i);
        const area = cv.contourArea(contour);
        if (area > minArea) {
          const contourVector = new cv.MatVector();
          contourVector.push_back(contour);
          cv.drawContours(
            finalRefinedMask,
            contourVector,
            -1,
            new cv.Scalar(255),
            cv.FILLED
          );
          contourVector.delete();
        }
        contour.delete();
      }

      // Step 3: Apply Morphological Closing (Fill gaps)
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.morphologyEx(
        finalRefinedMask,
        finalRefinedMask,
        cv.MORPH_CLOSE,
        kernel,
        new cv.Point(-1, -1),
        2
      );

      //resize the mask to the original image size
      const resizedMask = new cv.Mat();
      cv.resize(
        finalRefinedMask,
        resizedMask,
        new cv.Size(geoRawImage.width, geoRawImage.height),
        0,
        0,
        cv.INTER_NEAREST
      );

      //add padding to the mask of 1 pixel as black border
      const paddedMask = new cv.Mat(
        geoRawImage.height + 2,
        geoRawImage.width + 2,
        cv.CV_8UC1,
        new cv.Scalar(0, 0, 0, 0)
      );
      resizedMask.copyTo(
        paddedMask.roi(new cv.Rect(1, 1, geoRawImage.width, geoRawImage.height))
      );

      //get all contours for the resized mask

      const _contours = new cv.MatVector();
      const _hierarchy = new cv.Mat();
      cv.findContours(
        paddedMask,
        _contours,
        _hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      const edges = [];
      // Create a new mask for each contour
      for (let i = 0; i < _contours.size(); i++) {
        const contour = _contours.get(i);
        const contourMask = cv.Mat.zeros(
          geoRawImage.height + 2,
          geoRawImage.width + 2,
          cv.CV_8UC1
        );
        const contourVector = new cv.MatVector();
        contourVector.push_back(contour);
        cv.drawContours(
          contourMask,
          contourVector,
          -1,
          new cv.Scalar(255),
          cv.FILLED
        );

        //edge detection
        const edge = new cv.Mat();
        cv.Canny(contourMask, edge, 100, 200);

        let kernel = cv.Mat.ones(3, 3, cv.CV_8U); // 3x3 kernel
        let closed = new cv.Mat();

        cv.morphologyEx(edge, closed, cv.MORPH_CLOSE, kernel);

        //save the edge
        // const edgeRawImage = new RawImage(
        //   new Uint8Array(closed.data),
        //   geoRawImage.height + 2,
        //   geoRawImage.width + 2,
        //   1
        // );

        // edgeRawImage.save(`edges/edge_class_${index}_contour_${i}.png`);
        edges.push(closed);
        contourVector.delete();
      }

      // function sortEdgePixels(edgePixels: number[][]): number[][] {
      //   if (edgePixels.length === 0) return [];

      //   let sortedEdges: number[][] = [edgePixels[0]];
      //   let remaining = edgePixels.slice(1);

      //   while (remaining.length > 0) {
      //     let last = sortedEdges[sortedEdges.length - 1];
      //     let closestIndex = 0;
      //     let minDist = Infinity;

      //     // Find the closest neighboring edge
      //     for (let i = 0; i < remaining.length; i++) {
      //       let dx = last[0] - remaining[i][0];
      //       let dy = last[1] - remaining[i][1];
      //       let dist = dx * dx + dy * dy;

      //       if (dist < minDist) {
      //         minDist = dist;
      //         closestIndex = i;
      //       }
      //     }

      //     sortedEdges.push(remaining[closestIndex]);
      //     remaining.splice(closestIndex, 1);
      //   }

      //   return sortedEdges;
      // }

      function sortEdges(edgePixels: number[][]): number[][] {
        if (edgePixels.length === 0) return [];

        let sorted: number[][] = [];
        let visited = new Set();

        // Start with first point
        let current = edgePixels[0];
        sorted.push(current);
        visited.add(`${current[0]},${current[1]}`);

        while (sorted.length < edgePixels.length) {
          let last = sorted[sorted.length - 1];

          // Find nearest unvisited point
          let nearest = null;
          let minDist = Infinity;
          for (let point of edgePixels) {
            let key = `${point[0]},${point[1]}`;
            if (visited.has(key)) continue;

            let dist = Math.hypot(last[0] - point[0], last[1] - point[1]);
            if (dist < minDist) {
              minDist = dist;
              nearest = point;
            }
          }

          if (nearest) {
            sorted.push(nearest);
            visited.add(`${nearest[0]},${nearest[1]}`);
          } else {
            break; // No more points left
          }
        }

        return sorted;
      }

      function getEdgePixels(edgeImage: any): number[][] {
        let edgePixels: number[][] = [];

        for (let y = 1; y < edgeImage.rows - 1; y++) {
          // Avoid boundaries
          for (let x = 1; x < edgeImage.cols - 1; x++) {
            if (edgeImage.ucharPtr(y, x)[0] === 255) {
              // White edge pixel
              edgePixels.push([x, y]);
            }
          }
        }
        return edgePixels;
      }

      // const geojsonPolygons = edges.map((edge, index) => {
      //   const edgePixels = getEdgePixels(edge);
      //   console.log({ edgePixels });
      //   const sortedEdgePixels = sortEdges(edgePixels);
      //   const edgePixelGeo = sortedEdgePixels.map(([x, y]) =>
      //     geoRawImage.pixelToWorld(x - 1, y - 1)
      //   );
      //   console.log({ sortedEdgePixels: JSON.stringify(sortedEdgePixels) });
      //   console.log({ edgePixelGeo });
      //   return edgePixelGeo;
      // });

      const geojsonPolygons = edges.map(edge => {
        const edgeData = new Uint8Array(edge.data);
        const edgeData2D = [];
        for (let i = 0; i < edge.rows; i++) {
          const row = [];
          for (let j = 0; j < edge.cols; j++) {
            const value = edgeData[i * edge.cols + j] === 255 ? 1 : 0;
            row.push(value);
          }
          edgeData2D.push(row);
        }

        const ed = getPolygonFromMask(edgeData2D, geoRawImage);
        console.log({ ed: JSON.stringify(ed) });
        return ed;
      });

      const features: GeoJSON.Feature[] = geojsonPolygons.map(polygon => {
        polygon.push(polygon[0]);
        return {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [polygon],
          },
          properties: {
            class: this.classes[index],
          },
        };
      });

      const featureCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      maskGeojson.push(featureCollection);

      const refinedMaskRawImage = new RawImage(
        new Uint8Array(paddedMask.data),
        geoRawImage.height + 2,
        geoRawImage.width + 2,
        1
      );

      // console.log({ refinedMaskRawImage }, { geoRawImage });
      // refinedMaskRawImage.save(`refined_mask_class_${index}.png`);

      // Clean up
      maskMat.delete();
      gray.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();
      refinedMask.delete();
      cleanedMaskContours.delete();
      cleanedMaskHierarchy.delete();
      finalRefinedMask.delete();
      kernel.delete();
    });

    return maskGeojson;
  }
}
