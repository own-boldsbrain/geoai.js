import { ObjectDectection } from "@/models/zero_shot_object_detection";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { RawImage } from "@huggingface/transformers";
import * as turf from "@turf/turf";

type detection = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
  label: string;
};

function removeDuplicates(detections: detection[], iouThreshold: number) {
  const filteredDetections = [];

  for (const detection of detections) {
    let isDuplicate = false;
    let duplicateIndex = -1;
    let maxIoU = 0;

    for (let i = 0; i < filteredDetections.length; i++) {
      const iou = calculateIoU(detection, filteredDetections[i]);
      if (iou > iouThreshold) {
        isDuplicate = true;
        if (iou > maxIoU) {
          maxIoU = iou;
          duplicateIndex = i;
        }
      }
    }

    if (!isDuplicate) {
      filteredDetections.push(detection);
    } else if (
      duplicateIndex !== -1 &&
      detection.score > filteredDetections[duplicateIndex].score
    ) {
      filteredDetections[duplicateIndex] = detection;
    }
  }

  return filteredDetections;
}

function calculateIoU(det1: detection, det2: detection) {
  const xOverlap = Math.max(
    0,
    Math.min(det1.x2, det2.x2) - Math.max(det1.x1, det2.x1)
  );
  const yOverlap = Math.max(
    0,
    Math.min(det1.y2, det2.y2) - Math.max(det1.y1, det2.y1)
  );
  const overlapArea = xOverlap * yOverlap;

  const area1 = (det1.x2 - det1.x1) * (det1.y2 - det1.y1);
  const area2 = (det2.x2 - det2.x1) * (det2.y2 - det2.y1);
  return overlapArea / (area1 + area2 - overlapArea);
}

export const postProcessYoloOutput = (
  model_outputs: any,
  pixel_values: { dims: number[] },
  rawImage: RawImage,
  id2label: { [key: number]: string }
) => {
  const permuted = model_outputs.output0[0].transpose(1, 0);
  const threshold = 0.5; // Confidence threshold
  const [scaledHeight, scaledWidth] = pixel_values.dims.slice(-2);
  const results = [];

  for (const [xc, yc, w, h, ...scores] of permuted.tolist()) {
    const x1 = ((xc - w / 2) / scaledWidth) * rawImage.width;
    const y1 = ((yc - h / 2) / scaledHeight) * rawImage.height;
    const x2 = ((xc + w / 2) / scaledWidth) * rawImage.width;
    const y2 = ((yc + h / 2) / scaledHeight) * rawImage.height;

    const argmax = scores.reduce(
      (maxIndex: number, val: number, idx: number, arr: number[]) =>
        val > arr[maxIndex] ? idx : maxIndex,
      0
    );
    const score = scores[argmax];
    if (score < threshold) continue;

    results.push({
      x1,
      y1,
      x2,
      y2,
      score,
      label: id2label[argmax],
      index: argmax,
    });
  }

  const iouThreshold = 0.7;
  const filteredResults = removeDuplicates(results, iouThreshold);

  const model_output: ObjectDectection[] = filteredResults.map(d => {
    return {
      score: d.score,
      box: [d.x1, d.y1, d.x2, d.y2],
      label: d.label,
    };
  });

  return model_output;
};

export const parametersChanged = (
  instance: any,
  model_id: string,
  // provider: string,
  providerParams: any
): boolean => {
  return (
    instance.model_id !== model_id ||
    // instance.provider !== provider ||
    JSON.stringify(instance.providerParams) !== JSON.stringify(providerParams)
  );
};

export const detectionsToGeoJSON = (
  detections: ObjectDectection[],
  geoRawImage: GeoRawImage
) => {
  const features = detections.map(detection => {
    const [x1, y1, x2, y2] = detection.box;
    let bbox = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
      [x1, y1],
    ];
    bbox = bbox.map(point => geoRawImage.pixelToWorld(point[0], point[1]));
    return {
      type: "Feature",
      properties: {
        label: detection.label,
        score: detection.score,
      },
      geometry: {
        type: "Polygon",
        coordinates: [bbox],
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
};

const getEdges = (binaryMask: number[][]) => {
  let rows = binaryMask.length;
  let cols = binaryMask[0].length;
  let edges = Array.from({ length: rows }, () => Array(cols).fill(0));

  let directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  for (let i = 1; i < rows - 1; i++) {
    for (let j = 1; j < cols - 1; j++) {
      if (binaryMask[i][j] === 1) {
        for (let [dx, dy] of directions) {
          let ni = i + dx,
            nj = j + dy;
          if (binaryMask[ni][nj] === 0) {
            edges[i][j] = 1;
            break;
          }
        }
      }
    }
  }
  return edges;
};

const getPolygonFromMask = (mask: number[][], geoRawImage: GeoRawImage) => {
  const edges = getEdges(mask);
  const height = edges.length;
  const width = edges[0].length;
  const visited = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );
  const polygon: [number, number][] = [];
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  const isValid = (y: number, x: number) =>
    y >= 0 && y < height && x >= 0 && x < width;

  const dfs = (y: number, x: number) => {
    if (!isValid(y, x) || visited[y][x] || edges[y][x] === 0) return;
    visited[y][x] = true;
    polygon.push(geoRawImage.pixelToWorld(x, y));
    for (const [dy, dx] of directions) dfs(y + dy, x + dx);
  };

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (!visited[y][x] && edges[y][x] === 1) dfs(y, x);
    }
  }

  polygon.push(polygon[0]);
  return polygon;
};

export const maskToGeoJSON = (masks: any, geoRawImage: GeoRawImage) => {
  const { mask, scores } = masks;
  const numMasks = scores.length;
  const features = [];

  console.log({ numMasks, scores });

  for (let index = 0; index < numMasks; index++) {
    const height = mask[0].dims[2];
    const width = mask[0].dims[3];
    const binaryMask = Array.from({ length: height }, () =>
      Array(width).fill(0)
    );

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        if (mask[0].data[index * height * width + y * width + x] === 1) {
          binaryMask[y][x] = 1;
        }
      }
    }

    //save binary mask as a png using RawImage
    // const maskImage = {
    //   data: new Uint8ClampedArray(width * height * 4),
    //   width: width,
    //   height: height,
    // };
    // const edgeMask = getEdges(binaryMask);
    // for (let y = 0; y < height; ++y) {
    //   for (let x = 0; x < width; ++x) {
    //     const value = edgeMask[y][x] === 1 ? 255 : 0;
    //     maskImage.data[4 * (y * width + x) + 0] = value;
    //     maskImage.data[4 * (y * width + x) + 1] = value;
    //     maskImage.data[4 * (y * width + x) + 2] = value;
    //     maskImage.data[4 * (y * width + x) + 3] = 255;
    //   }
    // }

    // const rawImage = new RawImage(maskImage.data, width, height, 4);
    // rawImage.save(`mask_${index}-${scores[index]}.png`);

    features.push({
      type: "Feature",
      properties: {
        score: scores[index],
      },
      geometry: {
        type: "Polygon",
        coordinates: [getPolygonFromMask(binaryMask, geoRawImage)],
      },
    });
  }
  console.log({ features });

  return {
    type: "FeatureCollection",
    features,
  };
};
