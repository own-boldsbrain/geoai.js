import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface FeatureVisualizationProps {
  map: maplibregl.Map | null;
  features: number[][] | null;
  similarityMatrix: number[][] | null;
  patchSize: number | null;
  geoRawImage: any;
  visualizationMode: 'heatmap' | 'overlay' | 'patches';
  similarityThreshold: number;
}

export const FeatureVisualization: React.FC<FeatureVisualizationProps> = ({
  map,
  features,
  similarityMatrix,
  patchSize,
  geoRawImage,
  visualizationMode,
  similarityThreshold,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !features || !similarityMatrix || !patchSize || !geoRawImage) {
      return;
    }

    // Remove existing overlay
    if (overlayRef.current) {
      overlayRef.current.remove();
    }

    // Create canvas for visualization
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on image dimensions
    canvas.width = geoRawImage.width;
    canvas.height = geoRawImage.height;

    // Calculate patches per row and column
    const patchesPerRow = Math.floor(geoRawImage.width / patchSize);
    const patchesPerCol = Math.floor(geoRawImage.height / patchSize);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (visualizationMode === 'heatmap') {
      // Create similarity heatmap
      let maxSimilarity = -Infinity;
      let minSimilarity = Infinity;
      for (const row of similarityMatrix) {
        for (const val of row) {
          if (val > maxSimilarity) maxSimilarity = val;
          if (val < minSimilarity) minSimilarity = val;
        }
      }

      for (let i = 0; i < patchesPerCol; i++) {
        for (let j = 0; j < patchesPerRow; j++) {
          const patchIndex = i * patchesPerRow + j;
          if (patchIndex < similarityMatrix.length) {
            // Calculate average similarity for this patch
            const similarities = similarityMatrix[patchIndex];
            const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
            
            // Normalize similarity
            const normalizedSimilarity = (avgSimilarity - minSimilarity) / (maxSimilarity - minSimilarity);
            
            // Apply threshold
            if (normalizedSimilarity >= similarityThreshold) {
              // Create color based on similarity (red to yellow to green)
              const hue = normalizedSimilarity * 120; // 0 = red, 120 = green
              const saturation = 80;
              const lightness = 50;
              
              ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
              ctx.globalAlpha = normalizedSimilarity * 0.8;
              ctx.fillRect(j * patchSize, i * patchSize, patchSize, patchSize);
            }
          }
        }
      }
    } else if (visualizationMode === 'overlay') {
      // Create feature overlay
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 1;

      for (let i = 0; i < patchesPerCol; i++) {
        for (let j = 0; j < patchesPerRow; j++) {
          const patchIndex = i * patchesPerRow + j;
          if (patchIndex < features.length) {
            // Check if this patch has high similarity with others
            const similarities = similarityMatrix[patchIndex];
            const highSimilarityCount = similarities.filter(s => s >= similarityThreshold).length;
            
            if (highSimilarityCount > 0) {
              ctx.fillRect(j * patchSize, i * patchSize, patchSize, patchSize);
              ctx.strokeRect(j * patchSize, i * patchSize, patchSize, patchSize);
            }
          }
        }
      }
    } else if (visualizationMode === 'patches') {
      // Show individual patches with feature strength
      for (let i = 0; i < patchesPerCol; i++) {
        for (let j = 0; j < patchesPerRow; j++) {
          const patchIndex = i * patchesPerRow + j;
          if (patchIndex < features.length) {
            const feature = features[patchIndex];
            // Calculate feature strength (magnitude of feature vector)
            const strength = Math.sqrt(feature.reduce((sum, val) => sum + val * val, 0));
            const normalizedStrength = Math.min(strength / 10, 1); // Normalize to 0-1
            
            if (normalizedStrength >= similarityThreshold) {
              ctx.fillStyle = `rgba(0, 255, 255, ${normalizedStrength * 0.6})`;
              ctx.fillRect(j * patchSize, i * patchSize, patchSize, patchSize);
              
              // Add border for strong features
              if (normalizedStrength > 0.7) {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(j * patchSize, i * patchSize, patchSize, patchSize);
              }
            }
          }
        }
      }
    }

    // Create marker with canvas overlay
    const bounds = geoRawImage.bounds;
    if (bounds) {
      const marker = new maplibregl.Marker({
        element: canvas,
        anchor: 'top-left',
      })
        .setLngLat([bounds.west, bounds.north])
        .addTo(map);

      overlayRef.current = marker;
    }

    return () => {
      if (overlayRef.current) {
        overlayRef.current.remove();
      }
    };
  }, [map, features, similarityMatrix, patchSize, geoRawImage, visualizationMode, similarityThreshold]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: geoRawImage?.width || 0,
        height: geoRawImage?.height || 0,
        pointerEvents: 'none',
      }}
    />
  );
};
