import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface FeatureVisualizationProps {
  map: maplibregl.Map | null;
  features: number[][] | null;
  similarityMatrix: number[][] | null;
  patchSize: number | null;
  geoRawImage: any;
  similarityThreshold: number;
}

export const FeatureVisualization: React.FC<FeatureVisualizationProps> = ({
  map,
  features,
  similarityMatrix,
  patchSize,
  geoRawImage,
  similarityThreshold,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<string | null>(null);
  const layerRef = useRef<string | null>(null);
  const hoveredPatchRef = useRef<number | null>(null);

  // Helper function to update layer styling based on hovered patch
  const updateLayerStyling = (hoveredPatchIndex: number | null) => {
    if (!map || !map.getStyle || !layerRef.current) return;
    
    hoveredPatchRef.current = hoveredPatchIndex;
    
    if (hoveredPatchIndex !== null) {
      console.log('🔥 Updating layer styling for hovered patch:', hoveredPatchIndex);
      
      try {
        // Use pre-computed similarity data with Maplibre expressions
        // No source data updates needed - just change paint properties
        map.setPaintProperty(layerRef.current, 'fill-color', [
          'case',
          ['==', ['get', 'patchIndex'], hoveredPatchIndex], '#fcfdbf', // Hovered patch = bright yellow-white
          ['interpolate', ['linear'], 
            ['get', `sim_${hoveredPatchIndex}`], // Use pre-computed similarity
            0, '#000004',   // Black for low similarity
            0.2, '#3b0f70', // Dark purple for low-medium similarity
            0.4, '#8c2981', // Purple for medium similarity
            0.6, '#de4968', // Pink-red for medium-high similarity
            0.8, '#fe9f6d', // Orange for high similarity
            1, '#fcfdbf'    // Bright yellow-white for highest similarity
          ]
        ]);
        
        map.setPaintProperty(layerRef.current, 'fill-opacity', [
          'case',
          ['==', ['get', 'patchIndex'], hoveredPatchIndex], 1, // Hovered patch = fully opaque
          ['interpolate', ['linear'], 
            ['get', `sim_${hoveredPatchIndex}`], // Use pre-computed similarity
            0, 0.2,  // Higher opacity for low similarity
            1, 0.9   // Higher opacity for high similarity
          ]
        ]);
      } catch (error) {
        console.warn('Error updating layer styling:', error);
      }
    } else {
      console.log('🔄 Resetting layer styling');
      
      try {
        // Reset to default styling - no source data updates needed
        map.setPaintProperty(layerRef.current, 'fill-color', '#8c2981'); // Magma purple
        map.setPaintProperty(layerRef.current, 'fill-opacity', 0.4); // Slightly higher opacity
      } catch (error) {
        console.warn('Error resetting layer styling:', error);
      }
    }
  };

  // Helper function to cleanup layers
  const cleanupLayers = () => {
    if (!map || !map.getStyle) return;

    if (sourceRef.current && layerRef.current) {
      try {
        if (map.getLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        if (map.getSource(sourceRef.current)) {
          map.removeSource(sourceRef.current);
        }
      } catch (error) {
        console.warn('Error during layer cleanup:', error);
      }
    }
  };

  useEffect(() => {
    console.log('🔍 FeatureVisualization useEffect triggered');
    console.log('Map:', !!map);
    console.log('Features:', features?.length);
    console.log('SimilarityMatrix:', similarityMatrix?.length);
    console.log('PatchSize:', patchSize);
    console.log('GeoRawImage:', geoRawImage);
    console.log('SimilarityThreshold:', similarityThreshold);

    if (!map || !features || !similarityMatrix || !patchSize || !geoRawImage) {
      console.log('❌ Missing required props, returning early');
      return;
    }

    console.log('✅ All props present, proceeding with visualization');

    // Cleanup existing layers
    cleanupLayers();

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

    // Clear existing layers and sources
    cleanupLayers();
    
    // Get geographic bounds
    const geoBounds = geoRawImage.bounds;
    console.log('🗺️ GeoRawImage bounds:', geoBounds);
    
    if (!geoBounds || !geoBounds.west || !geoBounds.east || !geoBounds.north || !geoBounds.south) {
      console.error('❌ Invalid bounds structure:', geoBounds);
      return;
    }

    // Calculate geographic coordinates for each patch
    const patchWidth = (geoBounds.east - geoBounds.west) / patchesPerRow;
    const patchHeight = (geoBounds.north - geoBounds.south) / patchesPerCol;

    console.log('📍 Creating interactive patch layers for hover similarity visualization');

    // Create a single layer with all patches
    const allPatches: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    
    for (let i = 0; i < patchesPerCol; i++) {
      for (let j = 0; j < patchesPerRow; j++) {
        const patchIndex = i * patchesPerRow + j;
        if (patchIndex < features.length) {
          // Calculate patch bounds in geographic coordinates
          const patchWest = geoBounds.west + j * patchWidth;
          const patchEast = geoBounds.west + (j + 1) * patchWidth;
          const patchNorth = geoBounds.north - i * patchHeight;
          const patchSouth = geoBounds.north - (i + 1) * patchHeight;

          // Create patch polygon with ALL pre-computed similarity data
          const patchPolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
            type: "Feature",
            properties: {
              patchIndex,
              i,
              j,
              featureVector: features[patchIndex],
              // Pre-compute ALL similarities for this patch to avoid runtime calculation
              similarities: similarityMatrix[patchIndex],
              // Pre-compute similarity values for all other patches
              ...Object.fromEntries(
                similarityMatrix[patchIndex].map((similarity, targetIndex) => [
                  `sim_${targetIndex}`, similarity
                ])
              ),
            },
            geometry: {
              type: "Polygon",
              coordinates: [[
                [patchWest, patchNorth],
                [patchEast, patchNorth],
                [patchEast, patchSouth],
                [patchWest, patchSouth],
                [patchWest, patchNorth]
              ]]
            }
          };

          allPatches.push(patchPolygon);
        }
      }
    }

    // Create single source and layer for all patches
    const sourceId = `feature-patches-${Date.now()}`;
    const layerId = `feature-layer-${Date.now()}`;
    
    sourceRef.current = sourceId;
    layerRef.current = layerId;

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: allPatches,
      },
    });

    // Add single layer with dynamic styling
    map.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#8c2981', // Magma purple
        'fill-opacity': 0.4, // Slightly higher opacity
      },
    });

    map.on('mousemove', layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const patchIndex = feature.properties?.patchIndex;
    
        if (patchIndex !== undefined && patchIndex !== hoveredPatchRef.current) {
          map.getCanvas().style.cursor = 'crosshair';
          updateLayerStyling(patchIndex);
        }
      } else {
        // Cursor not on any patch
        if (hoveredPatchRef.current !== null) {
          map.getCanvas().style.cursor = '';
          updateLayerStyling(null);
        }
      }
    });
    

    console.log('✅ Single interactive layer created with', allPatches.length, 'patches');

    return () => {
      cleanupLayers();
    };
  }, [map, features, similarityMatrix, patchSize, geoRawImage, similarityThreshold]);

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
