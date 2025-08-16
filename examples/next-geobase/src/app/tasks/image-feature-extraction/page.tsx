"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import type { StyleSpecification } from "maplibre-gl";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { useDebounce } from "../../../hooks/useDebounce";
import { 
  ImageFeatureExtractionControls,
  BackgroundEffects,
  ExportButton,
  FeatureVisualization
} from "../../../components";
import { MapUtils } from "../../../utils/mapUtils";
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { MapProvider } from "../../../types";

GEOBASE_CONFIG.cogImagery = "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif";

const mapInitConfig = {
  center: [114.84857638295142, -3.449805712621256] as [number, number],
  zoom: 20,
};

// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function ImageFeatureExtraction() {
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);
  
  // GeoAI hook
  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    runInference,
    clearError,
  } = useGeoAIWorker();

  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [features, setFeatures] = useState<any>();
  const [zoomLevel, setZoomLevel] = useState<number>(22);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.5);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);

  // Debounced handlers for performance optimization
  const debouncedZoomChange = useDebounce((newZoom: number) => {
    if (map.current) {
      MapUtils.setZoom(map.current, newZoom);
    }
  }, 150);

  const debouncedSimilarityThresholdChange = useDebounce((threshold: number) => {
    setSimilarityThreshold(threshold);
  }, 300);



  const debouncedMapProviderChange = useDebounce((provider: MapProvider) => {
    setMapProvider(provider);
  }, 200);

  const debouncedExtractFeatures = useDebounce(() => {
    if (!polygon) return;
    
    runInference({
      inputs: {
        polygon: polygon
      },
      mapSourceParams: {
        zoomLevel,
      },
      postProcessingParams: {
        similarityThreshold,
      }
    });
  }, 500);

  // Debounced zoom handler for map events
  const debouncedZoomHandler = useDebounce(() => {
    if (map.current) {
      const currentZoom = Math.round(map.current.getZoom());
      setZoomLevel(currentZoom);
    }
  }, 100);

  // Debounced polygon update to prevent excessive re-renders during drawing
  const debouncedUpdatePolygon = useDebounce(() => {
    const features = draw.current?.getAll();
    if (features && features.features.length > 0) {
      setPolygon(features.features[0]);
    } else {
      setPolygon(null);
    }
  }, 200);

  const handleReset = () => {
    // Clear all drawn features
    if (draw.current) {
      draw.current.deleteAll();
    }

    // Clear map layers using utility function
    if (map.current) {
      MapUtils.clearAllLayers(map.current);
    }

    // Reset states
    setPolygon(null);
    setFeatures(undefined);
    clearError();
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Use debounced map zoom update for better performance
    debouncedZoomChange(newZoom);
  };

  const handleExtractFeatures = () => {
    if (!polygon) return;
    
    // Use debounced feature extraction to prevent rapid successive calls
    debouncedExtractFeatures();
  };

  const handleStartDrawing = () => {
    if (draw.current) {
      console.log('Starting drawing mode...');
      draw.current.changeMode("draw_polygon");
      setIsDrawingMode(true);
      console.log('Drawing mode activated');
    } else {
      console.error('Draw control not initialized');
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle: StyleSpecification = {
      version: 8 as const,
      sources: {
        "mapbox-base": {
          type: "raster",
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_CONFIG.apiKey}`,
          ],
          tileSize: 512,
        },
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
            `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_CONFIG.apiKey}`,
          ],
          tileSize: 512,
        },
        "esri-tiles": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "ESRI World Imagery",
        },
      },
      layers: [
        {
          id: "mapbox-base-layer",
          type: "raster",
          source: "mapbox-base",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "geobase" ? "visible" : "none",
          },
        },
        {
          id: "geobase-layer",
          type: "raster",
          source: "geobase-tiles",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "geobase" ? "visible" : "none",
          },
        },
        {
          id: "mapbox-layer",
          type: "raster",
          source: "mapbox-tiles",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "mapbox" ? "visible" : "none",
          },
        },
        {
          id: "esri-layer",
          type: "raster",
          source: "esri-tiles",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "esri" ? "visible" : "none",
          },
        },
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: mapInitConfig.center,
      zoom: mapInitConfig.zoom,
    });

    // Add draw control
    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });
    map.current.addControl(draw.current as any, "top-left");

    // Ensure draw controls are visible with proper z-index
    setTimeout(() => {
      const drawControls = map.current?.getContainer().querySelector('.maplibregl-draw');
      if (drawControls) {
        (drawControls as HTMLElement).style.zIndex = '1000';
        (drawControls as HTMLElement).style.position = 'relative';
        console.log('Draw controls added successfully');
      } else {
        console.warn('Draw controls not found');
      }
    }, 100);

    // Listen for polygon creation
    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => setPolygon(null));
    
    // Listen for drawing mode changes
    map.current.on("draw.modechange", (e: any) => {
      console.log('Draw mode changed:', e.mode);
      setIsDrawingMode(e.mode === 'draw_polygon');
    });

    // Listen for zoom changes to sync with slider
    map.current.on("zoom", debouncedZoomHandler);

    // Initialize zoom level with current map zoom
    setZoomLevel(Math.round(map.current.getZoom()));

    function updatePolygon() {
      debouncedUpdatePolygon();
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
      // Clean up any pending debounced calls
      debouncedUpdatePolygon.cancel?.();
    };
  }, [mapProvider]);

  // Initialize the model when the map provider changes
  useEffect(() => {
    let providerParams;
    if (mapProvider === "geobase") {
      providerParams = GEOBASE_CONFIG;
    } else if (mapProvider === "esri") {
      providerParams = ESRI_CONFIG;
    } else {
      providerParams = MAPBOX_CONFIG;
    }

    initializeModel({
      tasks: [{
        task: "image-feature-extraction"
      }],
      providerParams,
    });
  }, [mapProvider, initializeModel]);

  // Handle results from the worker
  useEffect(() => {
    console.log('🔄 lastResult changed:', lastResult);
    
    if (lastResult?.features && map.current) {
      console.log('✅ Processing lastResult with features');
      console.log('Features count:', lastResult.features.length);
      console.log('Similarity matrix:', lastResult.similarityMatrix?.length);
      console.log('Patch size:', lastResult.patchSize);
      console.log('GeoRawImage type:', typeof lastResult.geoRawImage);
      console.log('GeoRawImage:', lastResult.geoRawImage);
      console.log('GeoRawImage methods:', lastResult.geoRawImage ? Object.getOwnPropertyNames(lastResult.geoRawImage) : 'null');
      console.log('GeoRawImage prototype:', lastResult.geoRawImage ? Object.getPrototypeOf(lastResult.geoRawImage) : 'null');
      
      // Display feature extraction results
      setFeatures(lastResult.features);
      
      // Display the inference bounds
      if (lastResult.geoRawImage?.bounds) {
        console.log('🗺️ Displaying inference bounds');
        MapUtils.displayInferenceBounds(map.current, lastResult.geoRawImage.bounds);
      }
    } else {
      console.log('❌ Missing features or map for result processing');
    }
  }, [lastResult]);

  return (
    <main className="w-full h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
      <BackgroundEffects />
      
      {/* Global styles for draw controls */}
      <style jsx global>{`
        .maplibregl-draw {
          z-index: 1000 !important;
          position: relative !important;
        }
        .maplibregl-draw .maplibregl-draw-polygon {
          background: #fff !important;
          border: 2px solid #007cbf !important;
          border-radius: 4px !important;
          color: #007cbf !important;
          font-weight: bold !important;
          padding: 8px 12px !important;
          margin: 4px !important;
          cursor: pointer !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        .maplibregl-draw .maplibregl-draw-polygon:hover {
          background: #007cbf !important;
          color: #fff !important;
        }
        .maplibregl-draw .maplibregl-draw-trash {
          background: #fff !important;
          border: 2px solid #dc3545 !important;
          border-radius: 4px !important;
          color: #dc3545 !important;
          font-weight: bold !important;
          padding: 8px 12px !important;
          margin: 4px !important;
          cursor: pointer !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        .maplibregl-draw .maplibregl-draw-trash:hover {
          background: #dc3545 !important;
          color: #fff !important;
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-96 h-full flex flex-col overflow-hidden relative">
        {/* Glassmorphism sidebar */}
        <div className="backdrop-blur-xl bg-white/80 border-r border-gray-200/30 h-full shadow-2xl">
          <ImageFeatureExtractionControls
            polygon={polygon}
            isInitialized={isInitialized}
            isProcessing={isProcessing}
            zoomLevel={zoomLevel}
            mapProvider={mapProvider}
            lastResult={lastResult}
            error={error}
            similarityThreshold={similarityThreshold}
            onExtractFeatures={handleExtractFeatures}
            onZoomChange={handleZoomChange}
            onMapProviderChange={debouncedMapProviderChange}
            onSimilarityThresholdChange={debouncedSimilarityThresholdChange}
          />
        </div>
      </aside>

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        {/* Map overlay with subtle border */}
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl">
          <div 
            ref={mapContainer} 
            className="w-full h-full relative" 
            style={{ zIndex: 1 }}
          />
        </div>
        
        {/* Feature Visualization */}
        {(() => {
          if (lastResult?.features && lastResult?.similarityMatrix) {
            console.log('🎨 Rendering FeatureVisualization component');
            return (
              <FeatureVisualization
                map={map.current}
                features={lastResult.features}
                similarityMatrix={lastResult.similarityMatrix}
                patchSize={lastResult.patchSize}
                geoRawImage={lastResult.geoRawImage}
                similarityThreshold={similarityThreshold}
              />
            );
          } else {
            console.log('❌ FeatureVisualization not rendered - missing features or similarity matrix');
            return null;
          }
        })()}
        
        {/* Export Button - Floating in top right corner */}
        <div className="absolute top-6 right-6 z-10">
          <ExportButton
            detections={features ? { type: "FeatureCollection", features: [] } : undefined}
            geoRawImage={lastResult?.geoRawImage}
            task="image-feature-extraction"
            provider={mapProvider}
            disabled={!features && !lastResult?.geoRawImage}
            className="shadow-2xl backdrop-blur-lg"
          />
        </div>
        
        {/* Drawing Mode Indicator */}
        {isDrawingMode && (
          <div className="absolute top-6 left-6 z-10 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="font-semibold">Drawing Mode Active</span>
            </div>
            <p className="text-sm opacity-90 mt-1">Click on the map to draw a polygon</p>
          </div>
        )}
        
        {/* Start Drawing / Reset Button - Top middle of map */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={isDrawingMode ? handleStartDrawing : (polygon ? handleReset : handleStartDrawing)}
            disabled={!isInitialized}
            className={`px-6 py-3 rounded-lg shadow-2xl backdrop-blur-lg font-semibold transition-all duration-200 ${
              isDrawingMode 
                ? 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50' 
                : polygon
                ? 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50'
                : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isDrawingMode 
              ? '🎯 Drawing Active' 
              : polygon 
              ? '🗑️ Reset' 
              : '✏️ Start Drawing'
            }
          </button>
        </div>
        
        {/* Corner decorations */}
        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>
      </div>
    </main>
  );
}
