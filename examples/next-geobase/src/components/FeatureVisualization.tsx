import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface FeatureVisualizationProps {
  map: maplibregl.Map | null;
  features: number[][] | null;
  similarityMatrix: number[][] | null;
  patchSize: number | null;
  geoRawImage: any;
  similarityThreshold: number;
  onPatchesReady?: (patches: GeoJSON.Feature<GeoJSON.Polygon>[]) => void;
}

export const FeatureVisualization: React.FC<FeatureVisualizationProps> = ({
  map,
  features,
  similarityMatrix,
  patchSize,
  geoRawImage,
  similarityThreshold,
  onPatchesReady,
}) => {
  const sourceRef = useRef<string | null>(null);
  const layerRef = useRef<string | null>(null);
  const hoveredPatchRef = useRef<number | null>(null);
  const allPatchesRef = useRef<GeoJSON.Feature<GeoJSON.Polygon>[]>([]);

  // Helper function to update layer styling based on hovered patch
  const updateLayerStyling = (hoveredPatchIndex: number | null) => {
    if (!map || !map.getStyle || !layerRef.current) return;
    
    hoveredPatchRef.current = hoveredPatchIndex;
    
    if (hoveredPatchIndex !== null) {
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
    if (!map || !features || !similarityMatrix || !patchSize || !geoRawImage) {
      return;
    }

    const startTime = Date.now();
    console.log("FeatureVisualization - Update hook started");
    // Cleanup existing layers
    cleanupLayers();

    // Calculate patches per row and column
    const patchesPerRow = Math.floor(geoRawImage.width / patchSize);
    const patchesPerCol = Math.floor(geoRawImage.height / patchSize);

    // Clear existing layers and sources
    cleanupLayers();
    
    // Get geographic bounds
    const geoBounds = geoRawImage.bounds;
    
    if (!geoBounds || !geoBounds.west || !geoBounds.east || !geoBounds.north || !geoBounds.south) {
      return;
    }

    // Calculate geographic coordinates for each patch
    const patchWidth = (geoBounds.east - geoBounds.west) / patchesPerRow;
    const patchHeight = (geoBounds.north - geoBounds.south) / patchesPerCol;

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

    allPatchesRef.current = allPatches; // Store all patches for export
    
    // Notify parent component that patches are ready
    if (onPatchesReady) {
      onPatchesReady(allPatches);
    }

    // Create single source and layer for all patches
    const sourceId = `feature-patches-source`;
    const layerId = `feature-patches-layer`;
    
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

    const endTime = Date.now();
    console.log(`FeatureVisualization - Update hook completed in ${endTime - startTime}ms`);

    return () => {
      cleanupLayers();
    };
  }, [features, similarityMatrix, patchSize, geoRawImage, similarityThreshold]);

  return null;
};
