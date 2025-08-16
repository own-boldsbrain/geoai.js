import { describe, expect, it, beforeEach, vi } from "vitest";
import { ImageFeatureExtraction } from "../src/models/image_feature_extraction";
import { ProviderParams } from "../src/geobase-ai";
import { InferenceParams } from "../src/core/types";
import { polygon } from "./constants";

// Mock the transformers library
vi.mock("@huggingface/transformers", () => ({
  pipeline: vi.fn(),
  matmul: vi.fn(),
  RawImage: class MockRawImage {
    static fromCanvas() {
      return Promise.resolve(new MockRawImage());
    }
  },
}));

// Mock the utils
vi.mock("../src/utils/utils", () => ({
  parametersChanged: vi.fn(),
}));

describe("ImageFeatureExtraction", () => {
  let mockMatmul: any;
  let mockParametersChanged: any;
  let mockGeoRawImage: any;
  let mockExtractor: any;

  const mockProviderParams: ProviderParams = {
    provider: "geobase",
    apikey: "test-api-key",
    cogImagery: "https://example.com/test.tif",
    projectRef: "test-project",
  };

  const mockModelId = "onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX";

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock the polygonToImage method
    mockGeoRawImage = {
      width: 256,
      height: 256,
      data: new Uint8Array(256 * 256 * 3),
      bounds: {
        west: -122.5,
        south: 37.5,
        east: -122.4,
        north: 37.6,
      },
    };

    // Mock matmul result
    mockMatmul = vi.fn().mockResolvedValue({
      tolist: vi.fn().mockResolvedValue([
        [
          [1.0, 0.8, 0.3],
          [0.8, 1.0, 0.4],
          [0.3, 0.4, 1.0],
        ],
      ]),
    });

    // Create mock extractor function
    mockExtractor = vi.fn().mockResolvedValue({
      slice: vi.fn().mockReturnValue({
        normalize: vi.fn().mockReturnValue({
          permute: vi.fn().mockReturnValue({}),
        }),
        tolist: vi.fn().mockResolvedValue([
          [
            [0.1, 0.2, 0.3, 0.4, 0.5],
            [0.2, 0.3, 0.4, 0.5, 0.6],
            [0.3, 0.4, 0.5, 0.6, 0.7],
          ],
        ]),
      }),
    });

    // Add model config to mock extractor
    mockExtractor.model = {
      config: {
        patch_size: 16,
        num_register_tokens: 0,
      },
    };

    mockExtractor.processor = {
      image_processor: {
        do_resize: false,
      },
    };

    // Mock pipeline function to return our mock extractor
    const transformers = await import("@huggingface/transformers");
    vi.mocked(transformers.pipeline).mockResolvedValue(mockExtractor);
    vi.mocked(transformers.matmul).mockImplementation(mockMatmul);

    // Mock parametersChanged
    const utils = await import("../src/utils/utils");
    mockParametersChanged = utils.parametersChanged;
    vi.mocked(mockParametersChanged).mockReturnValue(false);
  });

  describe("getInstance", () => {
    it("should create a new instance when none exists", async () => {
      const { instance } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      expect(instance).toBeInstanceOf(ImageFeatureExtraction);
      expect(instance).toBeDefined();
    });

    it("should return existing instance when parameters haven't changed", async () => {
      const { instance: instance1 } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      const { instance: instance2 } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      expect(instance1).toBe(instance2);
    });

    it("should create new instance when parameters change", async () => {
      const { instance: instance1 } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      vi.mocked(mockParametersChanged).mockReturnValue(true);

      const { instance: instance2 } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("inference", () => {
    let instance: ImageFeatureExtraction;

    beforeEach(async () => {
      const { instance: inst } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );
      instance = inst;

      vi.spyOn(instance as any, "polygonToImage").mockResolvedValue(
        mockGeoRawImage
      );
    });

    it("should perform feature extraction successfully", async () => {
      const params: InferenceParams = {
        inputs: {
          polygon: polygon,
        },
        postProcessingParams: {
          similarityThreshold: 0.5,
        },
      };

      const result = await instance.inference(params);

      expect(result).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.similarityMatrix).toBeDefined();
      expect(result.patchSize).toBe(16);
      expect(result.geoRawImage).toBe(mockGeoRawImage);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.numPatches).toBeGreaterThan(0);
      expect(result.metadata.featureDimensions).toBeGreaterThan(0);
      expect(result.metadata.modelId).toBe(mockModelId);
    });

    it("should throw error when polygon is missing", async () => {
      const params: InferenceParams = {
        inputs: {},
        postProcessingParams: {},
      };

      await expect(instance.inference(params)).rejects.toThrow(
        "Polygon input is required for feature extraction"
      );
    });

    it("should throw error when polygon geometry is invalid", async () => {
      const params: InferenceParams = {
        inputs: {
          polygon: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
            properties: {},
          },
        },
        postProcessingParams: {},
      };

      await expect(instance.inference(params)).rejects.toThrow(
        "Input must be a valid GeoJSON Polygon feature"
      );
    });

    it("should filter features based on similarity threshold", async () => {
      const params: InferenceParams = {
        inputs: {
          polygon: polygon,
        },
        postProcessingParams: {
          similarityThreshold: 0.9, // High threshold
        },
      };

      const result = await instance.inference(params);

      expect(result.features).toBeDefined();
      expect(result.similarityMatrix).toBeDefined();
      // With high threshold, we expect fewer features
      expect(result.metadata.numPatches).toBeLessThanOrEqual(3);
    });

    it("should limit features based on maxFeatures parameter", async () => {
      const params: InferenceParams = {
        inputs: {
          polygon: polygon,
        },
        postProcessingParams: {
          maxFeatures: 2,
        },
      };

      const result = await instance.inference(params);

      expect(result.features).toBeDefined();
      expect(result.features.length).toBeLessThanOrEqual(2);
      expect(result.similarityMatrix).toBeDefined();
      expect(result.similarityMatrix.length).toBeLessThanOrEqual(2);
      expect(result.metadata.numPatches).toBeLessThanOrEqual(2);
    });

    it("should handle extraction errors gracefully", async () => {
      // Create a new instance with error-throwing mock
      const errorMockExtractor = vi
        .fn()
        .mockRejectedValue(new Error("Model loading failed"));
      errorMockExtractor.model = {
        config: {
          patch_size: 16,
          num_register_tokens: 0,
        },
      };
      errorMockExtractor.processor = {
        image_processor: {
          do_resize: false,
        },
      };

      const transformers = await import("@huggingface/transformers");
      vi.mocked(transformers.pipeline).mockResolvedValue(errorMockExtractor);

      const { instance: errorInstance } =
        await ImageFeatureExtraction.getInstance(
          mockModelId,
          mockProviderParams
        );

      vi.spyOn(errorInstance as any, "polygonToImage").mockResolvedValue(
        mockGeoRawImage
      );

      const params: InferenceParams = {
        inputs: {
          polygon: polygon,
        },
        postProcessingParams: {},
      };

      await expect(errorInstance.inference(params)).rejects.toThrow(
        "Feature extraction failed"
      );
    });

    it("should work with different map source parameters", async () => {
      const params: InferenceParams = {
        inputs: {
          polygon: polygon,
        },
        mapSourceParams: {
          zoomLevel: 18,
          bands: [1, 2, 3],
          expression: "(b1 + b2 + b3) / 3",
        },
        postProcessingParams: {},
      };

      const result = await instance.inference(params);

      expect(result).toBeDefined();
      expect(instance["polygonToImage"]).toHaveBeenCalledWith(
        polygon,
        18,
        [1, 2, 3],
        "(b1 + b2 + b3) / 3"
      );
    });
  });

  describe("model initialization", () => {
    it("should initialize with correct model parameters", async () => {
      const transformers = await import("@huggingface/transformers");

      await ImageFeatureExtraction.getInstance(mockModelId, mockProviderParams);

      expect(transformers.pipeline).toHaveBeenCalledWith(
        "image-feature-extraction",
        mockModelId,
        {
          device: "wasm",
          dtype: "q8",
        }
      );
    });

    it("should configure processor correctly", async () => {
      await ImageFeatureExtraction.getInstance(mockModelId, mockProviderParams);

      expect(mockExtractor.processor.image_processor.do_resize).toBe(false);
    });

    it("should extract patch size from model config", async () => {
      const { instance } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      // Access private property for testing
      expect((instance as any).patchSize).toBe(16);
    });
  });

  describe("edge cases", () => {
    it("should handle empty feature vectors", async () => {
      // Create a new mock extractor for empty features
      const emptyMockExtractor = vi.fn().mockResolvedValue({
        slice: vi.fn().mockReturnValue({
          normalize: vi.fn().mockReturnValue({
            permute: vi.fn().mockReturnValue({}),
          }),
          tolist: vi.fn().mockResolvedValue([[]]),
        }),
      });

      emptyMockExtractor.model = {
        config: {
          patch_size: 16,
          num_register_tokens: 0,
        },
      };

      emptyMockExtractor.processor = {
        image_processor: {
          do_resize: false,
        },
      };

      const transformers = await import("@huggingface/transformers");
      vi.mocked(transformers.pipeline).mockResolvedValue(emptyMockExtractor);

      const { instance } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      vi.spyOn(instance as any, "polygonToImage").mockResolvedValue(
        mockGeoRawImage
      );

      const params: InferenceParams = {
        inputs: {
          polygon: polygon,
        },
        postProcessingParams: {},
      };

      const result = await instance.inference(params);

      expect(result.features).toEqual([]);
      expect(result.similarityMatrix).toEqual([]);
      expect(result.metadata.numPatches).toBe(0);
      expect(result.metadata.featureDimensions).toBe(0);
    });

    it("should handle single feature vector", async () => {
      // Create a new mock extractor for single feature
      const singleMockExtractor = vi.fn().mockResolvedValue({
        slice: vi.fn().mockReturnValue({
          normalize: vi.fn().mockReturnValue({
            permute: vi.fn().mockReturnValue({}),
          }),
          tolist: vi.fn().mockResolvedValue([[[0.1, 0.2, 0.3]]]),
        }),
      });

      singleMockExtractor.model = {
        config: {
          patch_size: 16,
          num_register_tokens: 0,
        },
      };

      singleMockExtractor.processor = {
        image_processor: {
          do_resize: false,
        },
      };

      const transformers = await import("@huggingface/transformers");
      vi.mocked(transformers.pipeline).mockResolvedValue(singleMockExtractor);

      const { instance } = await ImageFeatureExtraction.getInstance(
        mockModelId,
        mockProviderParams
      );

      vi.spyOn(instance as any, "polygonToImage").mockResolvedValue(
        mockGeoRawImage
      );

      const params: InferenceParams = {
        inputs: {
          polygon: polygon,
        },
        postProcessingParams: {},
      };

      const result = await instance.inference(params);

      expect(result.features).toHaveLength(1);
      expect(result.similarityMatrix).toHaveLength(1);
      expect(result.metadata.numPatches).toBe(1);
      expect(result.metadata.featureDimensions).toBe(3);
    });
  });
});
