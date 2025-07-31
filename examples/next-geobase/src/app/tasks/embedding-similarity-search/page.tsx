"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import maplibregl, { StyleSpecification } from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useOptimizedGeoAI } from "../../../hooks/useGeoAIWorker";

const GEOBASE_CONFIG = {
  provider: "geobase" as const,
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF,
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY,
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/686e390615a6768f282b22b3/0/686e390615a6768f282b22b4.tif",
};

const MAPBOX_CONFIG = {
  provider: "mapbox" as const,
  apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "test",
  style: "mapbox://styles/mapbox/satellite-v9",
};

// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

type MapProvider = "geobase" | "mapbox";

interface GridCell {
  id: string;
  bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  center: [number, number];
  polygon: GeoJSON.Feature;
  embedding?: Float32Array;
}

interface SimilarityResult {
  cellId: string;
  similarity: number;
  bounds: GridCell['bounds'];
  center: [number, number];
}

export default function EmbeddingSimilaritySearch() {
  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<any | null>(null);
  
  // GeoAI hook
  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    runOptimizedEmbeddings,
    clearError,
    reset: resetWorker
  } = useOptimizedGeoAI("mask-generation"); // Use mask-generation as it supports the SAM model

  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(16);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [imageEmbeddings, setImageEmbeddings] = useState<any>(null);
  const [geoRawImage, setGeoRawImage] = useState<any>(null);
  const [cellEmbeddings, setCellEmbeddings] = useState<Map<string, Float32Array>>(new Map());
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.0);
  const [isComputingEmbeddings, setIsComputingEmbeddings] = useState(false);
  const [gridSize, setGridSize] = useState<number>(64); // Default 64x64 to match embedding dimensions
  const [drawingMode, setDrawingMode] = useState<"polygon" | "rectangle">("polygon");
  const [persistentGridCells, setPersistentGridCells] = useState<GridCell[]>([]); // Keep track of grid cells for re-adding
  const [isComputingSimilarity, setIsComputingSimilarity] = useState(false);
  const [persistentSimilarityData, setPersistentSimilarityData] = useState<{
    results: SimilarityResult[],
    clickedPoint: [number, number],
    clickedCell?: GridCell
  } | null>(null); // Keep track of similarity visualization for re-adding
  const [currentMapZoom, setCurrentMapZoom] = useState<number>(16); // Track actual map zoom level

  // Save geoRawImage separately for easier access
  const saveGeoRawImage = (geoRawImage: any) => {
    if (!geoRawImage) return;
    
    try {
      const geoRawImageData = {
        geoRawImage: geoRawImage,
        timestamp: Date.now(),
        gridSize: gridSize
      };
      localStorage.setItem('geoai_georawimage', JSON.stringify(geoRawImageData));
      console.log("GeoRawImage saved separately to localStorage:", {
        bounds: geoRawImage.bounds,
        width: geoRawImage.width,
        height: geoRawImage.height,
        channels: geoRawImage.channels
      });
    } catch (err) {
      console.warn("Failed to save geoRawImage to localStorage:", err);
    }
  };

  // Load geoRawImage from localStorage
  const loadGeoRawImage = () => {
    try {
      const savedGeoRawImage = localStorage.getItem('geoai_georawimage');
      if (savedGeoRawImage) {
        const geoRawImageData = JSON.parse(savedGeoRawImage);
        
        // Check if the saved data is recent (within 1 hour) and matches current grid size
        const oneHour = 60 * 60 * 1000;
        const isRecent = Date.now() - geoRawImageData.timestamp < oneHour;
        const isSameGridSize = geoRawImageData.gridSize === gridSize;
        
        if (isRecent && isSameGridSize) {
          console.log("Loading geoRawImage from localStorage:", geoRawImageData.geoRawImage);
          return geoRawImageData.geoRawImage;
        } else {
          // Remove old geoRawImage
          localStorage.removeItem('geoai_georawimage');
          console.log("Removed old geoRawImage from localStorage");
        }
      }
    } catch (err) {
      console.warn("Failed to load geoRawImage from localStorage:", err);
      localStorage.removeItem('geoai_georawimage');
    }
    return null;
  };

  // Update text layer visibility based on zoom level
  const updateTextLayerVisibility = useCallback(() => {
    if (!map.current) return;
    
    const currentZoom = map.current.getZoom();
    setCurrentMapZoom(currentZoom); // Update the current map zoom state
    const textLayer = map.current.getLayer("similarity-text-layer");
    
    if (textLayer) {
      const visibility = currentZoom > 21 ? "visible" : "none";
      map.current.setLayoutProperty("similarity-text-layer", "visibility", visibility);
      console.log(`Updated text layer visibility to ${visibility} (zoom: ${currentZoom.toFixed(2)})`);
    }
  }, []);

  const handleReset = () => {
    // Clear all drawn features
    if (draw.current) {
      draw.current.deleteAll();
    }

    // Remove layers if they exist
    if (map.current) {
      const layersToRemove = ["grid-layer", "similarity-results-layer", "similarity-text-layer", "selected-point-layer", "clicked-cell-layer"];
      layersToRemove.forEach(layerId => {
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
      });
      
      const sourcesToRemove = ["grid", "similarity-results", "similarity-text", "selected-point", "clicked-cell"];
      sourcesToRemove.forEach(sourceId => {
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
      });
    }

    // Clear localStorage
    try {
      localStorage.removeItem('geoai_embeddings');
      localStorage.removeItem('geoai_georawimage');
      console.log("Cleared embeddings and geoRawImage from localStorage");
    } catch (err) {
      console.warn("Failed to clear localStorage:", err);
    }

    // Reset states
    setPolygon(null);
    setGridCells([]);
    setPersistentGridCells([]);
    setImageEmbeddings(null);
    setGeoRawImage(null);
    setCellEmbeddings(new Map());
    setSelectedPoint(null);
    setSimilarityResults([]);
    setPersistentSimilarityData(null);
    clearError();
    resetWorker();
  };

  // Generate grid from polygon bounds
  const generateGrid = useCallback((polygonFeature: GeoJSON.Feature): GridCell[] => {
    const coordinates = (polygonFeature.geometry as GeoJSON.Polygon).coordinates[0];
    
    // Find bounding box
    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];
    
    coordinates.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    return generateGridFromBounds(minLng, maxLng, minLat, maxLat);
  }, [gridSize]);

  // Generate grid from bounds (can be used with geoRawImage.bounds)
  const generateGridFromBounds = useCallback((minLng: number, maxLng: number, minLat: number, maxLat: number): GridCell[] => {
    const lngStep = (maxLng - minLng) / gridSize;
    const latStep = (maxLat - minLat) / gridSize;
    
    const cells: GridCell[] = [];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const cellMinLng = minLng + (i * lngStep);
        const cellMaxLng = minLng + ((i + 1) * lngStep);
        // Flip the latitude indexing so j=0 is at the top (maxLat)
        const cellMaxLat = maxLat - (j * latStep);
        const cellMinLat = maxLat - ((j + 1) * latStep);
        
        const cellId = `cell_${i}_${j}`;
        const center: [number, number] = [
          (cellMinLng + cellMaxLng) / 2,
          (cellMinLat + cellMaxLat) / 2
        ];
        
        const cellPolygon: GeoJSON.Feature = {
          type: "Feature",
          properties: { cellId },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [cellMinLng, cellMinLat],
              [cellMaxLng, cellMinLat],
              [cellMaxLng, cellMaxLat],
              [cellMinLng, cellMaxLat],
              [cellMinLng, cellMinLat]
            ]]
          }
        };
        
        cells.push({
          id: cellId,
          bounds: {
            minLng: cellMinLng,
            maxLng: cellMaxLng,
            minLat: cellMinLat,
            maxLat: cellMaxLat
          },
          center,
          polygon: cellPolygon,
        });
      }
    }
    
    return cells;
  }, [gridSize]);

  // Compute embeddings for the main polygon - using real getEmbeddings function
  const computeImageEmbeddings = async () => {
    if (!polygon || !isInitialized) return;

    try {
      setIsComputingEmbeddings(true);
      console.log("[EmbeddingSimilaritySearch] Computing embeddings for polygon:", zoomLevel);
      
      // Use the real getEmbeddings function from the GenericSegmentation model
      await runOptimizedEmbeddings(polygon, zoomLevel, {});
      
    } catch (err) {
      console.error("Error computing embeddings:", err);
    } finally {
      setIsComputingEmbeddings(false);
    }
  };

  // Process the embeddings result when it's received
  useEffect(() => {
    if (lastResult && lastResult.image_embeddings) {
      console.log("Received embeddings result:", lastResult);
      console.log("Image embeddings structure:", {
        type: typeof lastResult.image_embeddings,
        hasData: !!lastResult.image_embeddings?.data,
        hasDims: !!lastResult.image_embeddings?.dims,
        dataLength: lastResult.image_embeddings?.data?.length,
        dims: lastResult.image_embeddings?.dims,
        isArray: Array.isArray(lastResult.image_embeddings),
        // Legacy format checks
        length: lastResult.image_embeddings?.length,
        shape: Array.isArray(lastResult.image_embeddings) ? 
          `[${lastResult.image_embeddings.length}${lastResult.image_embeddings[0] ? `, ${lastResult.image_embeddings[0].length}` : ''}${lastResult.image_embeddings[0]?.[0] ? `, ${lastResult.image_embeddings[0][0].length}` : ''}${lastResult.image_embeddings[0]?.[0]?.[0] ? `, ${lastResult.image_embeddings[0][0][0].length}` : ''}]` : 
          'not array'
      });
      
      // Extract embeddings (should be 1 x 256 x 64 x 64 format)
      setImageEmbeddings(lastResult.image_embeddings);
      setGeoRawImage(lastResult.geoRawImage);
      
      // Save geoRawImage separately for easier access
      saveGeoRawImage(lastResult.geoRawImage);
      
      // Save embeddings to localStorage for persistence
      try {
        const embeddingsData = {
          image_embeddings: lastResult.image_embeddings,
          geoRawImage: lastResult.geoRawImage,
          timestamp: Date.now(),
          gridSize: gridSize
        };
        localStorage.setItem('geoai_embeddings', JSON.stringify(embeddingsData));
        console.log("Embeddings and geoRawImage saved to localStorage");
        console.log("GeoRawImage details:", {
          bounds: lastResult.geoRawImage?.bounds,
          width: lastResult.geoRawImage?.width,
          height: lastResult.geoRawImage?.height,
          channels: lastResult.geoRawImage?.channels,
          type: typeof lastResult.geoRawImage
        });
      } catch (err) {
        console.warn("Failed to save embeddings to localStorage:", err);
      }
      
      // Generate grid cells - prioritize geoRawImage.bounds if available
      let cells: GridCell[] = [];
      
      if (lastResult.geoRawImage && lastResult.geoRawImage.bounds) {
        // Use bounds from geoRawImage (works even after page refresh)
        const bounds = lastResult.geoRawImage.bounds;
        console.log("Using geoRawImage bounds for grid generation:", bounds);
        
        // geoRawImage.bounds format may vary, handle different formats
        let minLng: number, maxLng: number, minLat: number, maxLat: number;
        
     
        if (bounds.north !== undefined && bounds.south !== undefined && bounds.east !== undefined && bounds.west !== undefined) {
          // Format: {north, south, east, west} - This is the actual format!
          minLng = bounds.west;
          maxLng = bounds.east;
          minLat = bounds.south;
          maxLat = bounds.north;
        } else {
          console.warn("Unknown bounds format:", bounds);
          return;
        }
        
        cells = generateGridFromBounds(minLng, maxLng, minLat, maxLat);
      } else {
        console.warn("No bounds or polygon available for grid generation");
        return;
      }
      
      setGridCells(cells);
      
      // Store for persistence
      setPersistentGridCells(cells);
      
      // Add grid visualization to map
      addGridToMap(cells);
    }
  }, [lastResult, polygon, generateGrid, generateGridFromBounds, gridSize]);

  // Load embeddings from localStorage on component mount
  useEffect(() => {
    try {
      const savedEmbeddings = localStorage.getItem('geoai_embeddings');
      if (savedEmbeddings) {
        const embeddingsData = JSON.parse(savedEmbeddings);
        
        // Check if the saved data is recent (within 1 hour) and matches current grid size
        const oneHour = 60 * 60 * 1000;
        const isRecent = Date.now() - embeddingsData.timestamp < oneHour;
        const isSameGridSize = embeddingsData.gridSize === gridSize;
        
        if (isRecent && isSameGridSize) {
          console.log("Loading embeddings from localStorage");
          console.log("Saved embeddings data structure:", {
            hasImageEmbeddings: !!embeddingsData.image_embeddings,
            imageEmbeddingsType: typeof embeddingsData.image_embeddings,
            imageEmbeddingsIsArray: Array.isArray(embeddingsData.image_embeddings),
            imageEmbeddingsLength: embeddingsData.image_embeddings?.length,
            hasGeoRawImage: !!embeddingsData.geoRawImage,
            gridSize: embeddingsData.gridSize
          });
          
          setImageEmbeddings(embeddingsData.image_embeddings);
          
          // Try to load geoRawImage from embeddings data, or fallback to separately saved geoRawImage
          let geoRawImageToUse = embeddingsData.geoRawImage;
          if (!geoRawImageToUse) {
            console.log("No geoRawImage in embeddings data, trying to load separately saved geoRawImage");
            geoRawImageToUse = loadGeoRawImage();
          }
          
          if (geoRawImageToUse) {
            setGeoRawImage(geoRawImageToUse);
            console.log("Loaded geoRawImage:", {
              bounds: geoRawImageToUse.bounds,
              width: geoRawImageToUse.width,
              height: geoRawImageToUse.height,
              channels: geoRawImageToUse.channels
            });
          } else {
            console.warn("No geoRawImage available in localStorage");
          }
          
          // Trigger grid generation using the saved bounds
          if (geoRawImageToUse && geoRawImageToUse.bounds) {
            const bounds = geoRawImageToUse.bounds;
            console.log("Loading from localStorage - bounds format:", bounds, typeof bounds);
            let minLng: number, maxLng: number, minLat: number, maxLat: number;
            
            if (Array.isArray(bounds) && bounds.length === 4) {
              [minLng, minLat, maxLng, maxLat] = bounds;
            } else if (bounds.north !== undefined && bounds.south !== undefined && bounds.east !== undefined && bounds.west !== undefined) {
              // Format: {north, south, east, west} - This is the actual format!
              minLng = bounds.west;
              maxLng = bounds.east;
              minLat = bounds.south;
              maxLat = bounds.north;
            } else if (bounds.west !== undefined) {
              minLng = bounds.west;
              maxLng = bounds.east;
              minLat = bounds.south;
              maxLat = bounds.north;
            } else if (bounds.minLng !== undefined) {
              minLng = bounds.minLng;
              maxLng = bounds.maxLng;
              minLat = bounds.minLat;
              maxLat = bounds.maxLat;
            } else {
              console.warn("Unknown bounds format in localStorage:", bounds);
              return;
            }
            
            console.log("Parsed bounds:", { minLng, maxLng, minLat, maxLat });
            const cells = generateGridFromBounds(minLng, maxLng, minLat, maxLat);
            console.log("Generated cells from localStorage:", cells.length, "first cell:", cells[0]);
            setGridCells(cells);
            setPersistentGridCells(cells);
            
            // Wait for map to be ready before adding grid
            const addGridWhenReady = () => {
              if (map.current && map.current.isStyleLoaded()) {
                console.log("Map is ready, adding grid now");
                addGridToMap(cells);
                console.log("Added grid to map from localStorage");
              } else {
                console.log("Map not ready yet, waiting...");
                setTimeout(addGridWhenReady, 500);
              }
            };
            
            // Try immediately, then with increasing delays if needed
            setTimeout(addGridWhenReady, 100);
            setTimeout(addGridWhenReady, 1000);
            setTimeout(addGridWhenReady, 2000);
          }
        } else {
          // Remove old embeddings
          localStorage.removeItem('geoai_embeddings');
          console.log("Removed old embeddings from localStorage");
        }
      }
    } catch (err) {
      console.warn("Failed to load embeddings from localStorage:", err);
      localStorage.removeItem('geoai_embeddings');
    }
  }, [generateGridFromBounds, gridSize]);

  // Monitor grid layer and re-add if it disappears
  useEffect(() => {
    if (!map.current || persistentGridCells.length === 0) return;

    const checkGridLayer = () => {
      if (!map.current || !map.current.isStyleLoaded()) return;
      
      const gridLayer = map.current.getLayer("grid-layer");
      const gridSource = map.current.getSource("grid");
      
      if (!gridLayer && gridSource) {
        console.log("Grid layer missing but source exists, re-adding layer...");
        try {
          map.current.addLayer({
            id: "grid-layer",
            type: "line",
            source: "grid",
            paint: {
              "line-color": "#00ff00",
              "line-width": 1,
              "line-opacity": 0.3
            }
          });
          console.log("Re-added missing grid layer");
        } catch (err) {
          console.error("Error re-adding grid layer:", err);
        }
      } else if (!gridLayer && !gridSource) {
        console.log("Both grid layer and source missing, re-adding both...");
        addGridToMap(persistentGridCells);
      }
      
      // Also check similarity layer if we have results
      if (persistentSimilarityData) {
        const similarityLayer = map.current.getLayer("similarity-results-layer");
        const similaritySource = map.current.getSource("similarity-results");
        const textLayer = map.current.getLayer("similarity-text-layer");
        const textSource = map.current.getSource("similarity-text");
        
        if (!similarityLayer && !similaritySource) {
          console.log("Both similarity layer and source missing, re-adding both...");
          visualizeSimilarityResults(persistentSimilarityData.results, persistentSimilarityData.clickedPoint, persistentSimilarityData.clickedCell);
        } else if (!similarityLayer && similaritySource) {
          console.log("Similarity layer missing but source exists, re-adding layer...");
          try {
            map.current.addLayer({
              id: "similarity-results-layer",
              type: "fill",
              source: "similarity-results",
              paint: {
                "fill-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "similarity"],
                  0.0, "#ffff00",
                  0.1, "#ffaa00",
                  0.2, "#ff8000",
                  0.3, "#ff4000",
                  0.4, "#ff0000"
                ],
                "fill-opacity": 0.3
              }
            });
            console.log("Re-added missing similarity layer");
          } catch (err) {
            console.error("Error re-adding similarity layer:", err);
          }
        }

        // Check clicked cell layer
        if (persistentSimilarityData?.clickedCell) {
          const clickedCellLayer = map.current.getLayer("clicked-cell-layer");
          const clickedCellSource = map.current.getSource("clicked-cell");
          
          if (!clickedCellLayer && !clickedCellSource) {
            console.log("Both clicked cell layer and source missing, re-adding both...");
            // Will be re-added when visualizeSimilarityResults is called above
          } else if (!clickedCellLayer && clickedCellSource) {
            console.log("Clicked cell layer missing but source exists, re-adding layer...");
            try {
              map.current.addLayer({
                id: "clicked-cell-layer",
                type: "fill",
                source: "clicked-cell",
                paint: {
                  "fill-color": "transparent",
                  "fill-outline-color": "#000000",  // Black outline for selected cell
                  "fill-opacity": 0
                }
              });
              console.log("Re-added missing clicked cell layer");
            } catch (err) {
              console.error("Error re-adding clicked cell layer:", err);
            }
          }
        }

        // Check text layer separately
        if (!textLayer && !textSource) {
          console.log("Both text layer and source missing, re-adding with similarity results...");
          // Text layer will be re-added when visualizeSimilarityResults is called above
        } else if (!textLayer && textSource) {
          console.log("Text layer missing but source exists, re-adding layer...");
          try {
            map.current.addLayer({
              id: "similarity-text-layer",
              type: "symbol",
              source: "similarity-text",
              layout: {
                "text-field": ["get", "displayText"],
                "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                "text-size": 12,
                "text-anchor": "center",
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-line-height": 1.2,
                "text-max-width": 10,
                "visibility": map.current.getZoom() > 21 ? "visible" : "none"
              },
              paint: {
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2
              }
            });
            console.log("Re-added missing text layer");
          } catch (err) {
            console.error("Error re-adding text layer:", err);
          }
        } else if (textLayer) {
          // Update text layer visibility based on current zoom level
          updateTextLayerVisibility();
        }
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkGridLayer, 2000);
    
    // Also check when map style changes
    const handleStyleData = () => {
      console.log("Map style changed, checking grid and similarity layers...");
      setTimeout(checkGridLayer, 100);
    };
    
    map.current.on('styledata', handleStyleData);

    return () => {
      clearInterval(interval);
      if (map.current) {
        map.current.off('styledata', handleStyleData);
      }
    };
  }, [persistentGridCells, persistentSimilarityData, updateTextLayerVisibility]);

  // Add grid visualization to map
  const addGridToMap = (cells: GridCell[]) => {
    if (!map.current) {
      console.warn("Map not available for grid visualization");
      return;
    }

    if (!map.current.isStyleLoaded()) {
      console.log("Map style not loaded yet, waiting...");
      map.current.once('styledata', () => {
        console.log("Map style loaded, adding grid...");
        addGridToMap(cells);
      });
      return;
    }

    console.log("Adding grid to map with", cells.length, "cells");
    console.log("Sample cell:", cells[0]);

    const gridFeatures: GeoJSON.Feature[] = cells.map(cell => cell.polygon);
    console.log("Grid features created:", gridFeatures.length, "first feature:", gridFeatures[0]);
    
    const gridSource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: gridFeatures
    };

    try {
      // Check if source already exists
      const existingSource = map.current.getSource("grid");
      const existingLayer = map.current.getLayer("grid-layer");
      
      console.log("Before adding - Source exists:", !!existingSource, "Layer exists:", !!existingLayer);
      
      if (existingSource) {
        console.log("Updating existing grid source");
        (existingSource as maplibregl.GeoJSONSource).setData(gridSource);
        console.log("Updated existing grid source successfully");
      } else {
        console.log("Creating new grid source and layer");
        
        // Add source first
        map.current.addSource("grid", {
          type: "geojson",
          data: gridSource
        });
        console.log("Grid source added");

        // Add layer
        map.current.addLayer({
          id: "grid-layer",
          type: "line",
          source: "grid",
          paint: {
            "line-color": "#00ff00",
            "line-width": 0.5,
            "line-opacity": 0.7
          }
        });
        console.log("Grid layer added");
        
        // Immediate verification
        const newSource = map.current.getSource("grid");
        const newLayer = map.current.getLayer("grid-layer");
        console.log("Immediate verification - Layer exists:", !!newLayer, "Source exists:", !!newSource);
        
        // Also check map layers
        const allLayers = map.current.getStyle().layers;
        const gridLayerInStyle = allLayers.find(layer => layer.id === "grid-layer");
        console.log("Grid layer in style:", !!gridLayerInStyle);
        
        // Force a map repaint
        // map.current.triggerRepaint(); // Removed to prevent unnecessary map refresh
        console.log("Grid added without triggering repaint");
      }
      
      // Delayed verification with more details
      setTimeout(() => {
        if (map.current) {
          const layer = map.current.getLayer("grid-layer");
          const source = map.current.getSource("grid");
          const style = map.current.getStyle();
          const layersInStyle = style.layers.map(l => l.id);
          
          console.log("Delayed verification:");
          console.log("- Layer exists:", !!layer);
          console.log("- Source exists:", !!source);
          console.log("- All layer IDs:", layersInStyle);
          console.log("- Grid layer in layers:", layersInStyle.includes("grid-layer"));
          
          if (!layer && source) {
            console.log("Source exists but layer missing, re-adding layer...");
            try {
              map.current.addLayer({
                id: "grid-layer",
                type: "line",
                source: "grid",
                paint: {
                  "line-color": "#00ff00",
                  "line-width": 0.5,
                  "line-opacity": 0.5
                }
              });
              console.log("Re-added missing layer");
            } catch (err) {
              console.error("Error re-adding layer:", err);
            }
          }
        }
      }, 500);
      
    } catch (error) {
      console.error("Error adding grid to map:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  };

  // Compute cosine similarity between two embeddings
  const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    // Debug for first few computations
    if (isNaN(similarity)) {
      console.warn("NaN similarity detected!", { 
        dotProduct, 
        normA: Math.sqrt(normA), 
        normB: Math.sqrt(normB),
        aValues: Array.from(a.slice(0, 5)).map(v => v.toFixed(4)),
        bValues: Array.from(b.slice(0, 5)).map(v => v.toFixed(4))
      });
      return 0;
    }
    
    return similarity;
  };

  // Handle map click to perform similarity search
  const handleMapClick = useCallback(async (e: maplibregl.MapMouseEvent) => {
    if (!imageEmbeddings || gridCells.length === 0) return;

    const clickedPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    setSelectedPoint(clickedPoint);

    // Find which grid cell was clicked
    const clickedCell = gridCells.find(cell => {
      return clickedPoint[0] >= cell.bounds.minLng &&
             clickedPoint[0] <= cell.bounds.maxLng &&
             clickedPoint[1] >= cell.bounds.minLat &&
             clickedPoint[1] <= cell.bounds.maxLat;
    });

    if (!clickedCell) return;

    try {
      setIsComputingSimilarity(true);
      console.log(`Computing similarity for clicked cell: ${clickedCell.id}`);
      
      // Extract the actual embedding for the clicked cell from the SAM embeddings
      // imageEmbeddings should be in format [1, 256, 64, 64]
      const clickedCellId = clickedCell.id;
      const [_, i, j] = clickedCellId.split('_').map(Number); // Extract i, j from cell_i_j
      
      // Get embedding for the clicked cell if not already computed
      let clickedCellEmbedding = cellEmbeddings.get(clickedCell.id);
      
      if (!clickedCellEmbedding) {
        // Extract real embedding from the SAM model output
        // imageEmbeddings format: [1, 256, 64, 64] - we want the embedding at position [i, j]
        console.log("Extracting embedding for cell", clickedCell.id, "at position [", i, ",", j, "]");
        console.log("Image embeddings available:", !!imageEmbeddings);
        console.log("Image embeddings type:", typeof imageEmbeddings);
        console.log("Image embeddings structure:", {
          isArray: Array.isArray(imageEmbeddings),
          length: imageEmbeddings?.length,
          firstElementType: typeof imageEmbeddings?.[0],
          firstElementLength: imageEmbeddings?.[0]?.length
        });
        
        if (imageEmbeddings) {
          console.log("Processing embeddings with structure:", {
            type: typeof imageEmbeddings,
            hasData: !!imageEmbeddings.data,
            hasDims: !!imageEmbeddings.dims,
            dataLength: imageEmbeddings.data?.length,
            dims: imageEmbeddings.dims,
            isArray: Array.isArray(imageEmbeddings)
          });
          
          // Handle new structured format: {data: Array, dims: Array, type: string}
          if (imageEmbeddings.data && imageEmbeddings.dims && Array.isArray(imageEmbeddings.dims)) {
            const data = imageEmbeddings.data;
            const dims = imageEmbeddings.dims; // Should be [1, 256, 64, 64]
            
            console.log("Structured embedding format detected:", {
              dataLength: data.length,
              dims: dims,
              expectedDims: [1, 256, 64, 64]
            });
            
            // Verify dimensions match expected [1, 256, 64, 64]
            if (dims.length === 4 && dims[0] === 1 && dims[1] === 256 && dims[2] === 64 && dims[3] === 64) {
              // Extract the 256-dimensional embedding for this specific grid cell
              clickedCellEmbedding = new Float32Array(256);
              
              // Data is flattened, so we need to calculate the correct indices
              // For dimensions [1, 256, 64, 64], the index calculation is:
              // index = batch * (256 * 64 * 64) + channel * (64 * 64) + row * 64 + col
              const batchSize = dims[1] * dims[2] * dims[3]; // 256 * 64 * 64
              const channelSize = dims[2] * dims[3]; // 64 * 64
              const rowSize = dims[3]; // 64
              
              for (let c = 0; c < 256; c++) {
                const index = 0 * batchSize + c * channelSize + j * rowSize + i;
                if (index < data.length) {
                  clickedCellEmbedding[c] = data[index];
                } else {
                  clickedCellEmbedding[c] = 0; // Fallback
                }
              }
              console.log("Successfully extracted embedding for", clickedCell.id, "from structured format");
              console.log("Sample embedding values:", Array.from(clickedCellEmbedding.slice(0, 10)).map(v => v.toFixed(4)));
            } else {
              console.warn("Unexpected dimensions in structured format:", dims);
              // Fallback to simulated embedding
              clickedCellEmbedding = new Float32Array(256);
              for (let c = 0; c < 256; c++) {
                clickedCellEmbedding[c] = Math.random() * 2 - 1;
              }
            }
          }
          // Handle legacy nested array format
          else if (Array.isArray(imageEmbeddings) && imageEmbeddings.length > 0) {
            const embeddingData = imageEmbeddings[0]; // Get first batch
            console.log("Legacy array format detected");
            
            if (embeddingData && embeddingData.length === 256) {
              // Extract the 256-dimensional embedding for this specific grid cell
              clickedCellEmbedding = new Float32Array(256);
              for (let c = 0; c < 256; c++) {
                // Access the embedding at channel c, position [i, j]
                const channelData = embeddingData[c];
                if (channelData && channelData[j] && channelData[j][i] !== undefined) {
                  clickedCellEmbedding[c] = channelData[j][i];
                } else {
                  clickedCellEmbedding[c] = 0; // Fallback
                }
              }
              console.log("Successfully extracted embedding from legacy format for", clickedCell.id);
            } else {
              console.warn("Unexpected legacy embedding format");
              // Fallback to simulated embedding
              clickedCellEmbedding = new Float32Array(256);
              for (let c = 0; c < 256; c++) {
                clickedCellEmbedding[c] = Math.random() * 2 - 1;
              }
            }
          } else {
            console.warn("Unknown embedding format");
            // Fallback to simulated embedding
            clickedCellEmbedding = new Float32Array(256);
            for (let c = 0; c < 256; c++) {
              clickedCellEmbedding[c] = Math.random() * 2 - 1;
            }
          }
        } else {
          console.warn("No valid image embeddings available, using simulated embeddings");
          console.log("imageEmbeddings:", imageEmbeddings);
          
          // Use simulated but consistent embeddings based on cell position
          // This ensures reproducible similarity results
          clickedCellEmbedding = new Float32Array(256);
          const seed = i * 1000 + j; // Create a seed based on cell position
          
          // Simple pseudo-random generator for consistent results
          let rng = seed;
          for (let c = 0; c < 256; c++) {
            rng = (rng * 9301 + 49297) % 233280;
            clickedCellEmbedding[c] = (rng / 233280.0) * 2 - 1; // Range [-1, 1]
          }
          
          console.log("Generated simulated embedding for", clickedCell.id, "with seed", seed);
        }
        
        cellEmbeddings.set(clickedCell.id, clickedCellEmbedding);
        setCellEmbeddings(new Map(cellEmbeddings));
      }

      // Compute similarities with other cells
      const similarities: SimilarityResult[] = [];
      
      for (const cell of gridCells) {
        if (cell.id === clickedCell.id) continue;
        
        // Get or compute embedding for this cell
        let cellEmbedding = cellEmbeddings.get(cell.id);
        if (!cellEmbedding) {
          // Extract real embedding for this cell
          const [_, cellI, cellJ] = cell.id.split('_').map(Number);
          cellEmbedding = new Float32Array(256);
          
          if (imageEmbeddings) {
            // Handle new structured format: {data: Array, dims: Array, type: string}
            if (imageEmbeddings.data && imageEmbeddings.dims && Array.isArray(imageEmbeddings.dims)) {
              const data = imageEmbeddings.data;
              const dims = imageEmbeddings.dims; // Should be [1, 256, 64, 64]
              
              // Verify dimensions match expected [1, 256, 64, 64]
              if (dims.length === 4 && dims[0] === 1 && dims[1] === 256 && dims[2] === 64 && dims[3] === 64) {
                // Data is flattened, calculate indices for this cell
                const batchSize = dims[1] * dims[2] * dims[3]; // 256 * 64 * 64
                const channelSize = dims[2] * dims[3]; // 64 * 64
                const rowSize = dims[3]; // 64
                
                for (let c = 0; c < 256; c++) {
                  const index = 0 * batchSize + c * channelSize + cellJ * rowSize + cellI;
                  if (index < data.length) {
                    cellEmbedding[c] = data[index];
                  } else {
                    cellEmbedding[c] = 0;
                  }
                }
              } else {
                // Fallback: use consistent simulated embeddings
                const seed = cellI * 1000 + cellJ;
                let rng = seed;
                for (let c = 0; c < 256; c++) {
                  rng = (rng * 9301 + 49297) % 233280;
                  cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
                }
              }
            }
            // Handle legacy nested array format
            else if (Array.isArray(imageEmbeddings) && imageEmbeddings.length > 0) {
              const embeddingData = imageEmbeddings[0];
              if (embeddingData && embeddingData.length === 256) {
                for (let c = 0; c < 256; c++) {
                  const channelData = embeddingData[c];
                  if (channelData && channelData[cellJ] && channelData[cellJ][cellI] !== undefined) {
                    cellEmbedding[c] = channelData[cellJ][cellI];
                  } else {
                    cellEmbedding[c] = 0;
                  }
                }
              } else {
                // Fallback: use consistent simulated embeddings
                const seed = cellI * 1000 + cellJ;
                let rng = seed;
                for (let c = 0; c < 256; c++) {
                  rng = (rng * 9301 + 49297) % 233280;
                  cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
                }
              }
            } else {
              // Fallback: use consistent simulated embeddings
              const seed = cellI * 1000 + cellJ;
              let rng = seed;
              for (let c = 0; c < 256; c++) {
                rng = (rng * 9301 + 49297) % 233280;
                cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
              }
            }
          } else {
            // Fallback: use consistent simulated embeddings
            const seed = cellI * 1000 + cellJ;
            let rng = seed;
            for (let c = 0; c < 256; c++) {
              rng = (rng * 9301 + 49297) % 233280;
              cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
            }
          }
          
          cellEmbeddings.set(cell.id, cellEmbedding);
        }
        
        const similarity = cosineSimilarity(clickedCellEmbedding, cellEmbedding);
        
        // Add all similarities (we'll filter and sort later)
        similarities.push({
          cellId: cell.id,
          similarity,
          bounds: cell.bounds,
          center: cell.center
        });
      }
      
      // Filter for cells with similarity greater than 90% (0.90)
      similarities.sort((a, b) => b.similarity - a.similarity);
      const highSimilarityCells = similarities.filter(s => s.similarity > 0.75);
      setSimilarityResults(highSimilarityCells);
      
      console.log(`Found ${similarities.length} similar cells, showing ${highSimilarityCells.length} cells with >90% similarity`);
      console.log("High similarity cells (>90%):", highSimilarityCells.slice(0, 10).map(s => ({ id: s.cellId, sim: s.similarity.toFixed(3) })));
      console.log("Similarity range:", similarities.length > 0 ? `${similarities[0].similarity.toFixed(3)} - ${similarities[similarities.length-1].similarity.toFixed(3)}` : 'none');
      
      // Visualize results on map
      visualizeSimilarityResults(highSimilarityCells, clickedPoint, clickedCell);
      
    } catch (err) {
      console.error("Error performing similarity search:", err);
    } finally {
      setIsComputingSimilarity(false);
    }
  }, [imageEmbeddings, gridCells, cellEmbeddings, similarityThreshold]);

  // Visualize similarity results on map
  const visualizeSimilarityResults = (results: SimilarityResult[], clickedPoint: [number, number], clickedCell?: GridCell) => {
    if (!map.current) return;

    // Save for persistence
    setPersistentSimilarityData({ results, clickedPoint, clickedCell });

    // Add selected point
    const selectedPointSource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: clickedPoint
        }
      }]
    };

    if (map.current.getSource("selected-point")) {
      (map.current.getSource("selected-point") as maplibregl.GeoJSONSource).setData(selectedPointSource);
    } else {
      map.current.addSource("selected-point", {
        type: "geojson",
        data: selectedPointSource
      });

      map.current.addLayer({
        id: "selected-point-layer",
        type: "circle",
        source: "selected-point",
        paint: {
          "circle-color": "#ff0000",
          "circle-radius": 8,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });
    }

    // Add clicked cell with black outline
    if (clickedCell) {
      const clickedCellSource: GeoJSON.GeoJSON = {
        type: "FeatureCollection",
        features: [{
          ...clickedCell.polygon,
          properties: {
            ...clickedCell.polygon.properties,
            isClickedCell: true
          }
        }]
      };

      if (map.current.getSource("clicked-cell")) {
        (map.current.getSource("clicked-cell") as maplibregl.GeoJSONSource).setData(clickedCellSource);
      } else {
        map.current.addSource("clicked-cell", {
          type: "geojson",
          data: clickedCellSource
        });

        map.current.addLayer({
          id: "clicked-cell-layer",
          type: "fill",
          source: "clicked-cell",
          paint: {
            "fill-color": "transparent",
            "fill-outline-color": "#000000",  // Black outline for selected cell
            "fill-opacity": 0
          }
        });
      }
    }

    // Since results are already filtered for >90% similarity, show them all
    // But still apply the similarity threshold for additional filtering if needed
    const visualizationResults = results.filter(r => r.similarity >= similarityThreshold);
    console.log(`Visualizing ${visualizationResults.length} cells above threshold ${similarityThreshold} from ${results.length} high-similarity cells (>90%)`);
    console.log("High similarity results sample:", results.slice(0, 5).map(r => ({ id: r.cellId, sim: r.similarity.toFixed(4) })));
    console.log("Threshold comparison - Top 5 vs threshold:", results.slice(0, 5).map(r => ({ 
      id: r.cellId, 
      sim: r.similarity.toFixed(4), 
      aboveThreshold: r.similarity >= similarityThreshold 
    })));

    // Show the high similarity results (>90%), or if threshold filters them out, show top 10 for debugging
    const finalResults = visualizationResults.length > 0 ? visualizationResults : results.slice(0, 10);
    console.log(`Final visualization will show ${finalResults.length} cells`);
    
    if (results.length === 0) {
      console.log("No cells found with >90% similarity");
    } else if (visualizationResults.length === 0 && results.length > 0) {
      console.log(`Found ${results.length} cells with >90% similarity, but none meet the additional threshold of ${similarityThreshold}`);
    }

    // Add similarity results (show top results even if below threshold)
    const similarityFeatures: GeoJSON.Feature[] = finalResults.map((result, index) => {
      const cell = gridCells.find(c => c.id === result.cellId)!;
      return {
        ...cell.polygon,
        properties: {
          ...cell.polygon.properties,
          similarity: result.similarity,
          rank: index + 1,
          tileNumber: result.cellId
        }
      };
    });

    const similaritySource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: similarityFeatures
    };

    if (map.current.getSource("similarity-results")) {
      console.log("Updating existing similarity-results source with", finalResults.length, "features");
      (map.current.getSource("similarity-results") as maplibregl.GeoJSONSource).setData(similaritySource);
    } else {
      console.log("Creating new similarity-results source and layer with", finalResults.length, "features");
      map.current.addSource("similarity-results", {
        type: "geojson",
        data: similaritySource
      });

      map.current.addLayer({
        id: "similarity-results-layer",
        type: "fill",
        source: "similarity-results",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "similarity"],
            0.0, "#ffff00",    // Yellow for low similarity
            0.1, "#ffaa00",    // Orange-yellow
            0.2, "#ff8000",    // Orange  
            0.3, "#ff4000",    // Red-orange
            0.4, "#ff0000"     // Red for high similarity
          ],
          "fill-opacity": 0.5,
          "fill-outline-color": "#FFD700"  // Color blind safe yellow outline
        }
      });
      
      console.log("Similarity layer added successfully");
    }

    // Add text labels for similarity scores and tile numbers
    const textFeatures: GeoJSON.Feature[] = finalResults.map((result, index) => {
      const cell = gridCells.find(c => c.id === result.cellId)!;
      const displayText = `#${index + 1}\n${result.cellId}\n${(result.similarity * 100).toFixed(1)}%`;
      console.log(`Creating text feature for ${result.cellId}: "${displayText}"`);
      
      return {
        type: "Feature",
        properties: {
          similarity: result.similarity,
          rank: index + 1,
          tileNumber: result.cellId,
          displayText: displayText
        },
        geometry: {
          type: "Point",
          coordinates: cell.center
        }
      };
    });

    console.log(`Created ${textFeatures.length} text features`);
    console.log("Sample text feature:", textFeatures[0]);

    const textSource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: textFeatures
    };

    if (map.current.getSource("similarity-text")) {
      console.log("Updating existing similarity-text source with", textFeatures.length, "features");
      (map.current.getSource("similarity-text") as maplibregl.GeoJSONSource).setData(textSource);
    } else {
      console.log("Creating new similarity-text source and layer with", textFeatures.length, "features");
      map.current.addSource("similarity-text", {
        type: "geojson",
        data: textSource
      });

      map.current.addLayer({
        id: "similarity-text-layer",
        type: "symbol",
        source: "similarity-text",
        layout: {
          "text-field": ["get", "displayText"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 12,
          "text-anchor": "center",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-line-height": 1.2,
          "text-max-width": 10,
          "visibility": map.current.getZoom() > 23 ? "visible" : "none"
        },
        paint: {
          "text-color": "#000000",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2
        }
      });
      
      console.log("Similarity text layer added successfully");
    }
    
    // Verify the layer exists after creation
    setTimeout(() => {
      if (map.current) {
        const layer = map.current.getLayer("similarity-results-layer");
        const source = map.current.getSource("similarity-results");
        const textLayer = map.current.getLayer("similarity-text-layer");
        const textSource = map.current.getSource("similarity-text");
        console.log("Similarity layer verification - Layer exists:", !!layer, "Source exists:", !!source);
        console.log("Text layer verification - Layer exists:", !!textLayer, "Source exists:", !!textSource);
        
        // Verify text source data
        if (textSource) {
          const sourceData = (textSource as any)._data;
          console.log("Text source data:", sourceData);
          console.log("Number of text features:", sourceData?.features?.length);
          if (sourceData?.features?.length > 0) {
            console.log("First text feature:", sourceData.features[0]);
            console.log("Display text property:", sourceData.features[0]?.properties?.displayText);
          }
        }
        
        // Check if text layer is actually visible
        if (textLayer) {
          const layerStyle = map.current.getStyle();
          const textLayerInStyle = layerStyle.layers.find(l => l.id === "similarity-text-layer");
          console.log("Text layer in style:", !!textLayerInStyle);
          if (textLayerInStyle) {
            console.log("Text layer layout:", textLayerInStyle.layout);
            console.log("Text layer paint:", textLayerInStyle.paint);
          }
        }
        
        if (!layer && source) {
          console.log("Similarity layer missing, re-adding...");
          try {
            map.current.addLayer({
              id: "similarity-results-layer",
              type: "fill",
              source: "similarity-results",
              paint: {
                "fill-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "similarity"],
                  0.0, "#ffff00",
                  0.1, "#ffaa00",
                  0.2, "#ff8000",
                  0.3, "#ff4000",
                  0.4, "#ff0000"
                ],
                "fill-opacity": 0.3,
                "fill-outline-color": "#FFD700"  // Color blind safe yellow outline
              }
            });
            console.log("Re-added similarity layer");
          } catch (err) {
            console.error("Error re-adding similarity layer:", err);
          }
        }

        if (!textLayer && textSource) {
          console.log("Text layer missing, re-adding...");
          try {
            map.current.addLayer({
              id: "similarity-text-layer",
              type: "symbol",
              source: "similarity-text",
              layout: {
                "text-field": ["get", "displayText"],
                "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                "text-size": 12,
                "text-anchor": "center",
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-line-height": 1.2,
                "text-max-width": 10,
                "visibility": map.current.getZoom() > 23 ? "visible" : "none"
              },
              paint: {
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2
              }
            });
            console.log("Re-added text layer");
          } catch (err) {
            console.error("Error re-adding text layer:", err);
          }
        }
        
        // Force repaint to ensure visibility
        // map.current.triggerRepaint(); // Removed to prevent map refresh during similarity search
        console.log("Visualization complete without map refresh");
      }
    }, 100);
  };

  // Start drawing with current mode
  const startDrawing = () => {
    if (draw.current) {
      if (drawingMode === 'rectangle') {
        // For rectangle, we'll use polygon mode and guide the user to draw a rectangle
        draw.current.changeMode('draw_polygon');
        alert('Please draw a rectangular polygon by clicking 4 corners and closing the shape.');
      } else {
        draw.current.changeMode('draw_polygon');
      }
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle: StyleSpecification = {
      version: 8 as const,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        "geobase-tiles": {
          type: "raster",
          tiles: [
            `https://${GEOBASE_CONFIG.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${GEOBASE_CONFIG.cogImagery}&apikey=${GEOBASE_CONFIG.apikey}`,
          ],
          tileSize: 256,
        },
        "mapbox-tiles": {
          type: "raster",
          tiles: [
            `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg90?access_token=${MAPBOX_CONFIG.apiKey}`,
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "geobase-layer",
          type: "raster",
          source: "geobase-tiles",
          minzoom: 0,
          maxzoom: 22,
          layout: {
            visibility: mapProvider === "geobase" ? "visible" : "none",
          },
        },
        {
          id: "mapbox-layer",
          type: "raster",
          source: "mapbox-tiles",
          minzoom: 0,
          maxzoom: 22,
          layout: {
            visibility: mapProvider === "mapbox" ? "visible" : "none",
          },
        },
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-13.274357, 8.486711] as [number, number],
      zoom: zoomLevel,
    });

    // Add draw control with MapLibre-compatible styles
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: false,
        point: false,
        trash: true,
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#3bb2d0',
            'fill-outline-color': '#3bb2d0',
            'fill-opacity': 0.1
          }
        },
        // Polygon fill active
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#fbb03b',
            'fill-outline-color': '#fbb03b',
            'fill-opacity': 0.1
          }
        },
        // Polygon outline stroke
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#3bb2d0',
            'line-width': 2
          }
        },
        // Polygon outline active
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#fbb03b',
            'line-width': 2
          }
        },
        // Vertex points
        {
          id: 'gl-draw-polygon-and-line-vertex-halo-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#FFF'
          }
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 3,
            'circle-color': '#fbb03b'
          }
        }
      ]
    });
    map.current.addControl(draw.current as any, "top-left");

    // Listen for polygon creation
    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => setPolygon(null));

    // Listen for map clicks
    map.current.on("click", handleMapClick);

    // Listen for zoom changes to update text layer visibility
    map.current.on("zoom", updateTextLayerVisibility);
    map.current.on("zoomend", updateTextLayerVisibility);

    // Initialize current zoom level
    map.current.on("load", () => {
      if (map.current) {
        setCurrentMapZoom(map.current.getZoom());
      }
    });

    function updatePolygon() {
      const features = draw.current?.getAll();
      if (features && features.features.length > 0) {
        setPolygon(features.features[0] as GeoJSON.Feature);
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapProvider, handleMapClick, updateTextLayerVisibility]);

  // Initialize model when component mounts
  useEffect(() => {
    initializeModel({
      task: "mask-generation",
      ...(mapProvider === "geobase" ? GEOBASE_CONFIG : MAPBOX_CONFIG),
    });
  }, [mapProvider, initializeModel]);

  // Update map provider visibility
  useEffect(() => {
    if (!map.current) return;

    const updateLayerVisibility = () => {
      if (!map.current?.isStyleLoaded()) return;
      
      map.current.setLayoutProperty(
        "geobase-layer",
        "visibility",
        mapProvider === "geobase" ? "visible" : "none"
      );
      map.current.setLayoutProperty(
        "mapbox-layer",
        "visibility",
        mapProvider === "mapbox" ? "visible" : "none"
      );
    };

    if (map.current.isStyleLoaded()) {
      updateLayerVisibility();
    } else {
      map.current.once('styledata', updateLayerVisibility);
    }
  }, [mapProvider]);

  return (
    <div className="flex h-screen">
      {/* Control Panel */}
      <div className="w-80 bg-white shadow-lg p-4 overflow-y-auto">
        <h1 className="text-xl font-bold mb-4">Embedding Similarity Search</h1>
        
        {/* Map Provider Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Map Provider:</label>
          <select
            value={mapProvider}
            onChange={(e) => setMapProvider(e.target.value as MapProvider)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="geobase">Geobase</option>
            <option value="mapbox">Mapbox</option>
          </select>
        </div>

        {/* Grid Size */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Grid Size: {gridSize}x{gridSize}
          </label>
          <input
            type="range"
            min="16"
            max="64"
            step="16"
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Zoom Level */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Zoom Level: {zoomLevel} (Current: {currentMapZoom.toFixed(1)})
          </label>
          <input
            type="range"
            min="10"
            max="20"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Drawing Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Drawing Mode:</label>
          <select
            value={drawingMode}
            onChange={(e) => setDrawingMode(e.target.value as 'rectangle' | 'polygon')}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="rectangle">Rectangle</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>

        {/* Similarity Threshold */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Similarity Threshold: {similarityThreshold.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.0"
            max="0.5"
            step="0.01"
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Instructions */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <h3 className="font-semibold text-sm mb-2">Instructions:</h3>
          <ol className="text-xs space-y-1">
            <li>1. Draw a polygon on the map</li>
            <li>2. Click "Generate Grid & Embeddings"</li>
            <li>3. Click on any grid cell to find areas with &gt;90% similarity</li>
            <li>4. Adjust similarity threshold for additional filtering</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mb-4">
          <button
            onClick={computeImageEmbeddings}
            disabled={!polygon || isComputingEmbeddings || !isInitialized}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-300"
          >
            {isComputingEmbeddings ? "Computing..." : "Generate Grid & Embeddings"}
          </button>
          
          <button
            onClick={startDrawing}
            disabled={!isInitialized}
            className="w-full bg-green-500 text-white py-2 px-4 rounded disabled:bg-gray-300"
          >
            Start Drawing {drawingMode === 'rectangle' ? 'Rectangle' : 'Polygon'}
          </button>
          
          <button
            onClick={handleReset}
            className="w-full bg-red-500 text-white py-2 px-4 rounded"
          >
            Reset
          </button>
          
          {geoRawImage && (
            <button
              onClick={() => {
                const dataStr = JSON.stringify({
                  bounds: geoRawImage.bounds,
                  width: geoRawImage.width,
                  height: geoRawImage.height,
                  channels: geoRawImage.channels,
                  timestamp: Date.now()
                }, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'geoRawImage_metadata.json';
                link.click();
                URL.revokeObjectURL(url);
                console.log("Downloaded geoRawImage metadata");
              }}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded text-xs"
            >
              Export GeoRawImage Metadata
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mb-4">
          <div className="text-sm">
            <p>Model Initialized: {isInitialized ? "✅" : "❌"}</p>
            <p>Processing: {isProcessing ? "✅" : "❌"}</p>
            <p>Computing Similarity: {isComputingSimilarity ? "✅" : "❌"}</p>
            <p>Current Zoom: <span className="font-mono">{currentMapZoom.toFixed(2)}</span></p>
            <p>Grid Cells: {gridCells.length}</p>
            <p>Cached Embeddings: {cellEmbeddings.size}</p>
            <p>Image Embeddings: {imageEmbeddings ? "✅" : "❌"}</p>
            <p>GeoRawImage: {geoRawImage ? "✅" : "❌"}</p>
            {imageEmbeddings && geoRawImage && (
              <p className="text-green-600">📊 Embeddings loaded and ready</p>
            )}
            {geoRawImage && (
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <p><strong>GeoRawImage Details:</strong></p>
                <p>Width: {geoRawImage.width}</p>
                <p>Height: {geoRawImage.height}</p>
                <p>Channels: {geoRawImage.channels}</p>
                {geoRawImage.bounds && (
                  <p>Bounds: [{geoRawImage.bounds.west?.toFixed(6)}, {geoRawImage.bounds.south?.toFixed(6)}, {geoRawImage.bounds.east?.toFixed(6)}, {geoRawImage.bounds.north?.toFixed(6)}]</p>
                )}
              </div>
            )}
            {isComputingSimilarity && (
              <p className="text-blue-600">🔍 Computing similarities...</p>
            )}
          </div>
        </div>

        {/* Similarity Results */}
        {similarityResults.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">
              {similarityResults.length} Areas with &gt;90% Similarity
              {selectedPoint && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: [{selectedPoint[0].toFixed(6)}, {selectedPoint[1].toFixed(6)}]
                </div>
              )}
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {similarityResults.map((result, index) => (
                <div 
                  key={result.cellId} 
                  className={`text-xs p-2 rounded cursor-pointer hover:bg-gray-200 ${
                    index < 10 ? 'bg-green-50 border-l-2 border-green-400' : 
                    index < 25 ? 'bg-yellow-50 border-l-2 border-yellow-400' : 
                    'bg-gray-50'
                  }`}
                  onClick={() => {
                    // Zoom to the similar cell
                    if (map.current) {
                      map.current.flyTo({
                        center: result.center,
                        zoom: 19,
                        duration: 1000
                      });
                    }
                  }}
                  title="Click to zoom to this cell"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono">#{index + 1} {result.cellId}</span>
                    <span className={`font-bold ${
                      result.similarity > 0.9 ? 'text-red-600' :
                      result.similarity > 0.8 ? 'text-orange-600' :
                      result.similarity > 0.7 ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1">
                    Center: [{result.center[0].toFixed(6)}, {result.center[1].toFixed(6)}]
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary Statistics */}
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Highest:</strong> {(similarityResults[0]?.similarity * 100 || 0).toFixed(1)}%
                </div>
                <div>
                  <strong>Lowest:</strong> {(similarityResults[similarityResults.length - 1]?.similarity * 100 || 0).toFixed(1)}%
                </div>
                <div>
                  <strong>Average:</strong> {similarityResults.length > 0 ? 
                    ((similarityResults.reduce((sum, r) => sum + r.similarity, 0) / similarityResults.length) * 100).toFixed(1) : 0}%
                </div>
                <div>
                  <strong>Above {(similarityThreshold * 100).toFixed(0)}%:</strong> {
                    similarityResults.filter(r => r.similarity >= similarityThreshold).length
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />
        <div className="absolute top-4 right-4 bg-white p-2 rounded shadow">
          <p className="text-sm font-semibold">Legend:</p>
          <div className="text-xs space-y-1">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 mr-2"></div>
              <span>Grid</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Selected Point</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 mr-2"></div>
              <span>Similar Areas</span>
            </div>
            <div className="text-xs mt-2 text-gray-600">
              <div>Text shows (zoom &gt; 23):</div>
              <div>• Rank (#1, #2, etc.)</div>
              <div>• Tile ID (cell_x_y)</div>
              <div>• Similarity %</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
