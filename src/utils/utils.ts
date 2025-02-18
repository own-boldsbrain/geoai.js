import { ObjectDectection } from "@/models/zero_shot_object_detection";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { RawImage } from "@huggingface/transformers";

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
