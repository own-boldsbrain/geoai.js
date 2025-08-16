import { GeoRawImage, Bounds } from "../images/GeoRawImage";
import { Tensor, matmul } from "@huggingface/transformers";

interface Patch {
  index: number;
  bounds: Bounds;
  feature: Tensor; // Tensor instead of number[]
}

export class GeoEmbeddings {
  private geoRawImage: GeoRawImage;
  private patchSize: number | null;
  private patchGrid: Patch[][] | null;
  private pooledFeatures: Tensor | null;
  private similarityMatrix: Tensor | null;
  private modelId?: string;
  private input_source?: string;

  constructor(
    geoRawImage: GeoRawImage,
    patchSize: number | null,
    patchFeatures: Tensor | null, // shape [numPatches, dim]
    pooledFeatures: Tensor | null, // shape [dim]
    modelId?: string,
    input_source?: string
  ) {
    this.geoRawImage = geoRawImage;
    this.patchSize = patchSize;
    this.pooledFeatures = pooledFeatures;
    this.modelId = modelId;
    this.input_source = input_source;

    if (patchFeatures && patchSize) {
      this.patchGrid = this.buildPatchGrid(patchFeatures, patchSize);
      this.similarityMatrix = this.computeSimilarityMatrix(patchFeatures);
    } else {
      this.patchGrid = null;
      this.similarityMatrix = null;
    }
  }

  /**
   * Build patch grid: divide image bounds into sub-bounds for each patch
   */
  private buildPatchGrid(patchFeatures: Tensor, patchSize: number): Patch[][] {
    const patchesPerRow = Math.ceil(this.geoRawImage.width / patchSize);
    const patchesPerCol = Math.ceil(this.geoRawImage.height / patchSize);

    const lonStep =
      (this.geoRawImage.getBounds().east - this.geoRawImage.getBounds().west) /
      patchesPerRow;
    const latStep =
      (this.geoRawImage.getBounds().north -
        this.geoRawImage.getBounds().south) /
      patchesPerCol;

    const grid: Patch[][] = [];
    let idx = 0;

    for (let row = 0; row < patchesPerCol; row++) {
      const patchRow: Patch[] = [];
      for (let col = 0; col < patchesPerRow; col++) {
        const patchBounds: Bounds = {
          north: this.geoRawImage.getBounds().north - row * latStep,
          south: this.geoRawImage.getBounds().north - (row + 1) * latStep,
          west: this.geoRawImage.getBounds().west + col * lonStep,
          east: this.geoRawImage.getBounds().west + (col + 1) * lonStep,
        };

        const feature = patchFeatures.slice([idx, 0], [1, -1]).squeeze();

        patchRow.push({
          index: idx,
          bounds: patchBounds,
          feature,
        });
        idx++;
      }
      grid.push(patchRow);
    }
    return grid;
  }

  /**
   * Compute cosine similarity matrix with Tensor ops
   */
  private async computeSimilarityMatrix(patchFeatures: Tensor): Tensor {
    // Normalize features along last dimension
    const normalized = patchFeatures.normalize(2, -1); // [numPatches, dim]

    // Cosine sim = normalized @ normalized^T
    const sim = await matmul(normalized, normalized.transpose(0, 1)); // [numPatches, numPatches]
    return sim;
  }

  /**
   * Export embeddings as GeoJSON
   */
  toGeoJSON(): any {
    if (this.patchGrid) {
      const features = this.patchGrid.flat().map(patch => ({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [patch.bounds.west, patch.bounds.north],
              [patch.bounds.east, patch.bounds.north],
              [patch.bounds.east, patch.bounds.south],
              [patch.bounds.west, patch.bounds.south],
              [patch.bounds.west, patch.bounds.north],
            ],
          ],
        },
        properties: {
          patchIndex: patch.index,
          embedding: patch.feature.tolist(), // convert tensor -> array
        },
      }));

      return {
        type: "FeatureCollection",
        features,
        properties: {
          type: "patchEmbeddings",
          modelId: this.modelId,
          input_source: this.input_source,
        },
      };
    } else if (this.pooledFeatures) {
      const bounds = this.geoRawImage.getBounds();
      const feature = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [bounds.west, bounds.north],
              [bounds.east, bounds.north],
              [bounds.east, bounds.south],
              [bounds.west, bounds.south],
              [bounds.west, bounds.north],
            ],
          ],
        },
        properties: {
          type: "pooledEmbeddings",
          embedding: this.pooledFeatures.tolist(),
          modelId: this.modelId,
          input_source: this.input_source,
        },
      };

      return {
        type: "FeatureCollection",
        features: [feature],
      };
    } else {
      throw new Error("No embeddings available");
    }
  }

  /**
   * Factory method: create GeoEmbeddings from a GeoRawImage + embeddings
   */
  static fromGeoRawImage(
    geoRawImage: GeoRawImage,
    options: {
      patchSize?: number;
      patchFeatures?: Tensor; // [numPatches, dim]
      pooledFeatures?: Tensor; // [dim]
      modelId?: string;
      input_source?: string;
    }
  ): GeoEmbeddings {
    if (options.patchFeatures) {
      if (!options.patchSize) {
        throw new Error("patchSize is required when providing patchFeatures");
      }
      return new GeoEmbeddings(
        geoRawImage,
        options.patchSize,
        options.patchFeatures,
        null,
        options.modelId,
        options.input_source
      );
    } else if (options.pooledFeatures) {
      return new GeoEmbeddings(
        geoRawImage,
        null,
        null,
        options.pooledFeatures,
        options.modelId,
        options.input_source
      );
    } else {
      throw new Error(
        "Either patchFeatures or pooledFeatures must be provided"
      );
    }
  }
}
