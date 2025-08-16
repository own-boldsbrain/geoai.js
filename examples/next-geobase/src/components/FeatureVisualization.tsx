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
  const sourceRef = useRef<string | null>(null);
  const layerRef = useRef<string | null>(null);
  const hoveredPatchRef = useRef<number | null>(null);

  // Helper function to update layer styling based on hovered patch
  const updateLayerStyling = (hoveredPatchIndex: number | null) => {
    if (!map || !layerRef.current || !similarityMatrix) return;
    
    hoveredPatchRef.current = hoveredPatchIndex;
    
    if (hoveredPatchIndex !== null) {
      console.log('🔥 Updating layer styling for hovered patch:', hoveredPatchIndex);
      
      // Get similarities for the hovered patch
      const similarities = similarityMatrix[hoveredPatchIndex];
      if (!similarities) return;
      
      // Create a map of patch index to similarity for this hovered patch
      const similarityMap = new Map<number, number>();
      for (let i = 0; i < similarities.length; i++) {
        similarityMap.set(i, similarities[i]);
      }
      
      // Update the layer paint properties dynamically using expressions
      map.setPaintProperty(layerRef.current, 'fill-color', [
        'case',
        ['==', ['get', 'patchIndex'], hoveredPatchIndex], '#ff0000', // Hovered patch = red
        ['interpolate', ['linear'], 
          ['coalesce', ['get', 'similarity'], 0], // Use similarity from properties, default to 0
          0, '#0000ff',   // Blue for low similarity
          1, '#ff0000'    // Red for high similarity
        ]
      ]);
      
      map.setPaintProperty(layerRef.current, 'fill-opacity', [
        'case',
        ['==', ['get', 'patchIndex'], hoveredPatchIndex], 1, // Hovered patch = fully opaque
        ['interpolate', ['linear'], 
          ['coalesce', ['get', 'similarity'], 0], // Use similarity from properties, default to 0
          0, 0.1,  // Low opacity for low similarity
          1, 0.8   // High opacity for high similarity
        ]
      ]);
      
      // Update the source data to include similarity values for the hovered patch
      const source = map.getSource(sourceRef.current!) as maplibregl.GeoJSONSource;
      if (source) {
        const currentData = source.serialize().data as any;
        const updatedFeatures = currentData.features.map((feature: any) => {
          const patchIndex = feature.properties.patchIndex;
          const similarity = similarityMap.get(patchIndex) || 0;
          return {
            ...feature,
            properties: {
              ...feature.properties,
              similarity: similarity,
            }
          };
        });
        
        source.setData({
          type: 'FeatureCollection',
          features: updatedFeatures,
        });
      }
    } else {
      console.log('🔄 Resetting layer styling');
      
      // Reset to default styling
      map.setPaintProperty(layerRef.current, 'fill-color', '#888888');
      map.setPaintProperty(layerRef.current, 'fill-opacity', 0.3);
      
      // Reset the source data to remove similarity values
      const source = map.getSource(sourceRef.current!) as maplibregl.GeoJSONSource;
      if (source) {
        const currentData = source.serialize().data as any;
        const resetFeatures = currentData.features.map((feature: any) => ({
          ...feature,
          properties: {
            patchIndex: feature.properties.patchIndex,
            i: feature.properties.i,
            j: feature.properties.j,
            featureVector: feature.properties.featureVector,
            similarities: feature.properties.similarities,
          }
        }));
        
        source.setData({
          type: 'FeatureCollection',
          features: resetFeatures,
        });
      }
    }
  };

  // Helper function to cleanup layers
  const cleanupLayers = () => {
    if (!map) return;

    if (sourceRef.current && layerRef.current) {
      if (map.getLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      if (map.getSource(sourceRef.current)) {
        map.removeSource(sourceRef.current);
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
    console.log('VisualizationMode:', visualizationMode);
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

          // Create patch polygon with similarity data
          const patchPolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
            type: "Feature",
            properties: {
              patchIndex,
              i,
              j,
              featureVector: features[patchIndex],
              // Pre-calculate similarities for this patch
              similarities: similarityMatrix[patchIndex],
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
        'fill-color': '#888888',
        'fill-opacity': 0.3,
      },
    });

    // Add hover functionality
    map.on('mouseenter', layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const patchIndex = feature.properties?.patchIndex;
        if (patchIndex !== undefined) {
          map.getCanvas().style.cursor = 'pointer';
          updateLayerStyling(patchIndex);
        }
      }
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
      updateLayerStyling(null);
    });

    console.log('✅ Single interactive layer created with', allPatches.length, 'patches');

    return () => {
      cleanupLayers();
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
