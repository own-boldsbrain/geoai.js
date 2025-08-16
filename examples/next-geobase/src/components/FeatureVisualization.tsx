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
  const sourceRef = useRef<string | null>(null);
  const layerRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('🔍 FeatureVisualization useEffect triggered');
    console.log('Map:', !!map);
    console.log('Features:', features?.length);
    console.log('SimilarityMatrix:', similarityMatrix?.length);
    console.log('PatchSize:', patchSize);
    console.log('GeoRawImage:', geoRawImage);
    console.log('VisualizationMode:', visualizationMode);
    console.log('SimilarityThreshold:', similarityThreshold);

    if (!map || !features || !similarityMatrix || !patchSize || !geoRawImage) {
      console.log('❌ Missing required props, returning early');
      return;
    }

    console.log('✅ All props present, proceeding with visualization');

    // Remove existing overlay
    if (overlayRef.current) {
      overlayRef.current.remove();
    }

    // Create canvas for visualization
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ Could not get 2D context');
      return;
    }

    console.log('✅ Canvas and context ready');

    // Set canvas size based on image dimensions
    canvas.width = geoRawImage.width;
    canvas.height = geoRawImage.height;

    console.log('📐 Canvas size set to:', canvas.width, 'x', canvas.height);

    // Calculate patches per row and column
    const patchesPerRow = Math.floor(geoRawImage.width / patchSize);
    const patchesPerCol = Math.floor(geoRawImage.height / patchSize);

    console.log('🔢 Patches grid:', patchesPerRow, 'x', patchesPerCol);
    console.log('📊 Total patches:', patchesPerRow * patchesPerCol);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a simple test rectangle to verify canvas is working
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 50, 50);
    console.log('🧪 Test rectangle drawn on canvas');

    if (visualizationMode === 'heatmap') {
      console.log('🎨 Drawing heatmap visualization');
      // Create similarity heatmap
      let maxSimilarity = -Infinity;
      let minSimilarity = Infinity;
      for (const row of similarityMatrix) {
        for (const val of row) {
          if (val > maxSimilarity) maxSimilarity = val;
          if (val < minSimilarity) minSimilarity = val;
        }
      }
      
      console.log('📊 Similarity range:', minSimilarity, 'to', maxSimilarity);

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

    // Get geographic bounds from GeoRawImage
    console.log('🔍 GeoRawImage type:', typeof geoRawImage);
    console.log('🔍 GeoRawImage properties:', Object.keys(geoRawImage));
    
    // Use direct bounds property like other components do
    const bounds = geoRawImage.bounds;
    console.log('🗺️ GeoRawImage bounds:', bounds);
    
    if (!bounds || !bounds.west || !bounds.east || !bounds.north || !bounds.south) {
      console.error('❌ Invalid bounds structure:', bounds);
      return;
    }
    
    console.log('📍 Coordinates for overlay:', [
      [bounds.west, bounds.north], // top-left
      [bounds.east, bounds.north], // top-right
      [bounds.east, bounds.south], // bottom-right
      [bounds.west, bounds.south], // bottom-left
    ]);
    
    if (bounds) {
      console.log('📍 Creating canvas overlay with bounds:', bounds);
      
      // Remove existing source and layer if they exist
      if (sourceRef.current && layerRef.current) {
        if (map.getLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        if (map.getSource(sourceRef.current)) {
          map.removeSource(sourceRef.current);
        }
      }

      // Create unique IDs for source and layer
      const sourceId = `feature-overlay-${Date.now()}`;
      const layerId = `feature-layer-${Date.now()}`;
      
      sourceRef.current = sourceId;
      layerRef.current = layerId;

      // Generate canvas data URL
      const canvasDataURL = canvas.toDataURL();
      console.log('🎨 Canvas data URL generated, length:', canvasDataURL.length);
      
      // Add canvas as a raster source
      map.addSource(sourceId, {
        type: 'image',
        url: canvasDataURL,
        coordinates: [
          [bounds.west, bounds.north], // top-left
          [bounds.east, bounds.north], // top-right
          [bounds.east, bounds.south], // bottom-right
          [bounds.west, bounds.south], // bottom-left
        ],
      });

      // Add raster layer
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': 0.8,
        },
      });

      console.log('✅ Canvas overlay added to map with proper geographic alignment');
      
      // Add a test rectangle to verify bounds are correct
      const testSourceId = `test-rect-${Date.now()}`;
      const testLayerId = `test-layer-${Date.now()}`;
      
      const testRect: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: { test: true },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [bounds.west, bounds.north],
            [bounds.east, bounds.north],
            [bounds.east, bounds.south],
            [bounds.west, bounds.south],
            [bounds.west, bounds.north]
          ]]
        }
      };
      
      map.addSource(testSourceId, {
        type: 'geojson',
        data: testRect,
      });
      
      map.addLayer({
        id: testLayerId,
        type: 'line',
        source: testSourceId,
        paint: {
          'line-color': '#ff0000',
          'line-width': 3,
        },
      });
      
      console.log('🧪 Test rectangle added to verify bounds alignment');
    } else {
      console.log('❌ No bounds available for overlay placement');
    }

    return () => {
      // Cleanup function
      if (sourceRef.current && layerRef.current && map) {
        if (map.getLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        if (map.getSource(sourceRef.current)) {
          map.removeSource(sourceRef.current);
        }
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
        position: 'absolute',
        top: '-9999px', // Hide canvas off-screen since we're using it as data source
        left: '-9999px',
      }}
    />
  );
};
