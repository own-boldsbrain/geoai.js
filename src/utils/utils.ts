function removeDuplicates(detections, iouThreshold) {
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

function calculateIoU(det1, det2) {
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
  output: any,
  pixel_values,
  rawImage,
  id2label
) => {
  const permuted = output.output0[0].transpose(1, 0);
  const threshold = 0.5; // Confidence threshold
  const [scaledHeight, scaledWidth] = pixel_values.dims.slice(-2);
  const results = [];

  for (const [xc, yc, w, h, ...scores] of permuted.tolist()) {
    const x1 = ((xc - w / 2) / scaledWidth) * rawImage.width;
    const y1 = ((yc - h / 2) / scaledHeight) * rawImage.height;
    const x2 = ((xc + w / 2) / scaledWidth) * rawImage.width;
    const y2 = ((yc + h / 2) / scaledHeight) * rawImage.height;

    const argmax = scores.reduce(
      (maxIndex, val, idx, arr) => (val > arr[maxIndex] ? idx : maxIndex),
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

  const model_output = {
    scores: filteredResults.map(d => d.score),
    boxes: filteredResults.map(d => [d.x1, d.y1, d.x2, d.y2]),
    labels: filteredResults.map(d => d.label),
  };

  return model_output;
};

export const parametersChanged = (
  instance: any,
  model_id: string,
  provider: string,
  providerParams: any
): boolean => {
  return (
    instance.model_id !== model_id ||
    instance.provider !== provider ||
    JSON.stringify(instance.providerParams) !== JSON.stringify(providerParams)
  );
};
