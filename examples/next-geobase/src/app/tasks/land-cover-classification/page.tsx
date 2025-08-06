"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import type { StyleSpecification } from "maplibre-gl";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { 
  DetectionControls, 
  BackgroundEffects,
  ExportButton
} from "../../../components";
import { MapUtils } from "../../../utils/mapUtils";

type MapProvider = "geobase" | "mapbox";

const GEOBASE_CONFIG = {
  provider: "geobase" as const,
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF ?? "",
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY ?? "",
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
  center: [114.84857638295142, -3.449805712621256] as [number, number],
  zoom: 18,
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

export default function LandCoverClassification() {
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
  const [classifications, setClassifications] = useState<any>();
  const [zoomLevel, setZoomLevel] = useState<number>(18);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");

  const handleReset = () => {
    // Clear all drawn features
    if (draw.current) {
      draw.current.deleteAll();
    }

    // Clear map layers using utility function
    if (map.current) {
      MapUtils.clearAllLayers(map.current);
      // Also clear land cover specific layers
      for (let i = 0; i < 10; i++) {
        const layerId = `detections-layer-${i}`;
        const sourceId = `detections-source-${i}`;
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      }
    }

    // Reset states
    setPolygon(null);
    setClassifications(undefined);
    clearError();
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Also update the map zoom to match the slider
    if (map.current) {
      MapUtils.setZoom(map.current, newZoom);
    }
  };

  const handleStartDrawing = () => {
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
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
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: GEOBASE_CONFIG.center,
      zoom: GEOBASE_CONFIG.zoom,
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

    // Listen for polygon creation
    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => setPolygon(null));

    // Listen for zoom changes to sync with slider
    map.current.on("zoom", () => {
      if (map.current) {
        const currentZoom = Math.round(map.current.getZoom());
        setZoomLevel(currentZoom);
      }
    });

    // Initialize zoom level with current map zoom
    setZoomLevel(Math.round(map.current.getZoom()));

    function updatePolygon() {
      const features = draw.current?.getAll();
      if (features && features.features.length > 0) {
        setPolygon(features.features[0]);
      } else {
        setPolygon(null);
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapProvider]);

  // Initialize the model when the map provider changes
  useEffect(() => {
    initializeModel({
      tasks: [{
        task: "land-cover-classification"
      }],
      providerParams: {
        ...(mapProvider === "geobase" ? GEOBASE_CONFIG : MAPBOX_CONFIG),
      },
    });
  }, [mapProvider, initializeModel]);

  // Handle results from the worker
  useEffect(() => {
    if (lastResult?.detections && map.current) {
      displayDetections(lastResult.detections);
      setClassifications(lastResult.detections);
    }
    if (lastResult?.geoRawImage?.bounds && map.current) {
      MapUtils.displayInferenceBounds(map.current, lastResult.geoRawImage.bounds);
    }
  }, [lastResult]);

  // Function to display detections on the map
  const displayDetections = (detections: any) => {
    console.log("Received detections:", detections);
    
    // Validate that we have an array of FeatureCollections
    if (!Array.isArray(detections)) {
      console.error("Expected array of FeatureCollections:", detections);
      return;
    }

    setClassifications(detections);
    
    if (!map.current) return;

    // Remove existing detection layers if they exist
    detections.forEach((_: GeoJSON.FeatureCollection, index: number) => {
      const layerId = `detections-layer-${index}`;
      const sourceId = `detections-source-${index}`;
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Generate a color for each feature collection
    const colors = [
      '#FF0000', // Red
      '#00FF00', // Green
      '#0000FF', // Blue
      '#FFFF00', // Yellow
      '#FF00FF', // Magenta
      '#00FFFF', // Cyan
      '#FFA500', // Orange
      '#800080', // Purple
      '#008000', // Dark Green
      '#000080', // Navy
    ];

    // Add each feature collection as a separate layer
    detections.forEach((featureCollection: GeoJSON.FeatureCollection, index: number) => {
      const layerId = `detections-layer-${index}`;
      const sourceId = `detections-source-${index}`;
      const color = colors[index % colors.length];

      // Add the new detections as a source
      map.current?.addSource(sourceId, {
        type: "geojson",
        data: featureCollection,
      });

      // Add a layer to display the detections
      map.current?.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": color,
          "fill-opacity": 0.9,
          "fill-outline-color": color,
        },
      });

      // Add hover functionality for each layer
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.current?.on("mouseenter", layerId, () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });

      map.current?.on("mouseleave", layerId, () => {
        map.current!.getCanvas().style.cursor = "";
        popup.remove();
      });

      map.current?.on("mousemove", layerId, e => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;

          // Create HTML content for popup
          const content = Object.entries(properties)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join("<br/>");

          popup
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map.current!);
        }
      });
    });
  };

  const handleClassify = () => {
    if (!polygon) return;

    runInference(
      {
        inputs: {
          polygon,
        },
        mapSourceParams: {
          zoomLevel,
        },
        postProcessingParams: {
          minArea: 20
        }
      }
    );
  };

  return (
    <main className="w-full h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
      <BackgroundEffects />

      {/* Sidebar */}
      <aside className="w-96 h-full flex flex-col overflow-hidden relative">
        {/* Glassmorphism sidebar */}
        <div className="backdrop-blur-xl bg-white/80 border-r border-gray-200/30 h-full shadow-2xl">
          <DetectionControls
            polygon={polygon}
            isInitialized={isInitialized}
            isProcessing={isProcessing}
            zoomLevel={zoomLevel}
            mapProvider={mapProvider}
            lastResult={lastResult}
            error={error}
            title="Land Cover Classification"
            description="Advanced geospatial AI powered land cover classification system"
            onStartDrawing={handleStartDrawing}
            onDetect={handleClassify}
            onReset={handleReset}
            onZoomChange={handleZoomChange}
            onMapProviderChange={setMapProvider}
          />
        </div>
      </aside>

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        {/* Map overlay with subtle border */}
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl">
          <div ref={mapContainer} className="w-full h-full" />
        </div>
        
        {/* Export Button - Floating in top right corner */}
        <div className="absolute top-6 right-6 z-10">
          <ExportButton
            detections={classifications && Array.isArray(classifications) && classifications.length > 0 
              ? {
                  type: "FeatureCollection" as const,
                  features: classifications.flatMap((fc: GeoJSON.FeatureCollection) => fc.features)
                }
              : undefined
            }
            geoRawImage={lastResult?.geoRawImage}
            task="land-cover-classification"
            provider={mapProvider}
            disabled={(!classifications || !Array.isArray(classifications) || classifications.length === 0) && !lastResult?.geoRawImage}
            className="shadow-2xl backdrop-blur-lg"
          />
        </div>
        
        {/* Corner decorations */}
        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>
      </div>
    </main>
  );
}

