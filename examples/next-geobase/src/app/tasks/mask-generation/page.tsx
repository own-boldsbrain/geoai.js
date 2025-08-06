"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import type { StyleSpecification } from "maplibre-gl";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { ESRI_CONFIG } from "../../../config";

const GEOBASE_CONFIG = {
  provider: "geobase" as const,
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF ?? "",
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY ?? "",
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

type MapProvider = "geobase" | "mapbox" | "esri";

export default function MaskGeneration() {
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
    reset: resetWorker
  } = useGeoAIWorker();

  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [input, setInput] = useState<{
    type: "points" | "boxes";
    coordinates: number[];
  } | null>(null);
  const [detections, setDetections] = useState<GeoJSON.FeatureCollection>();
  const [zoomLevel, setZoomLevel] = useState<number>(22);
  const [maxMasks, setMaxMasks] = useState<number>(1);
  const [drawing, setDrawing] = useState<"points" | "boxes" | "polygon" | "bounds-point">("polygon");
  const drawingRef = useRef(drawing);
    useEffect(() => {
      drawingRef.current = drawing;
    }, [drawing]);
  const [inputType, setInputType] = useState<"points" | "boxes">("points");
  const [selectedModel, setSelectedModel] = useState<string>(
    "Xenova/slimsam-77-uniform"
  );
  const [customModelId, setCustomModelId] = useState<string>("");
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const models = ["Xenova/slimsam-77-uniform"];
  const [showSaveMessage, setShowSaveMessage] = useState<boolean>(false);
  const [savedData, setSavedData] = useState<any>(null);
  const [showJsonViewer, setShowJsonViewer] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("");
  const [boundsPolygon, setBoundsPolygon] = useState<GeoJSON.Feature | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{
    coordinates: number[];
  } | null>(null);

  // Convert bounds to GeoJSON polygon
  const boundsToPolygon = (bounds: {east: number, west: number, north: number, south: number}): GeoJSON.Feature => {
    const { east, west, north, south } = bounds;
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south]
        ]]
      },
      properties: {
        type: "bounds"
      }
    };
  };

  // Save functionality
  const handleSave = async () => {
    if (!polygon || !map.current) {
      console.error("Cannot save: Missing polygon or map instance");
      return;
    }

    // Get bounds from geoRawImage if available, otherwise fallback to map bounds
    let bounds;
    if (lastResult?.geoRawImage?.bounds) {
      bounds = lastResult.geoRawImage.bounds;
    }

    // Create a unique session ID based on polygon and bounds
    const polygonString = JSON.stringify(polygon);
    const boundsString = JSON.stringify(bounds);
    const sessionId = btoa(polygonString + boundsString).slice(0, 16);

    // Prepare mask entry for this generation
    const maskEntry = {
      sessionId,
      label: label.trim() || `${new Date().toLocaleString()}`, // Use provided label or default
      cog : mapProvider === "geobase" ? GEOBASE_CONFIG.cogImagery : mapProvider,
      bounds,
      timestamp: new Date().toISOString(),
      masks: lastResult?.masks?.features || [],
    };

    let newSavedData;
    // Add to existing session
    newSavedData = [
      ...(savedData ?? []),
      maskEntry
    ];
    
    setCurrentSessionId(sessionId);


    try {
      // TODO: Replace this with your actual save implementation
      console.log("Save data:", newSavedData);
      
      // Store the data in state for visualization
      setSavedData(newSavedData);
      setShowJsonViewer(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
      
      // Clear the label after successful save
      // setLabel("");
      
      // Your save code will go here
      // Example: await saveToDatabase(newSavedData);
      
    } catch (error) {
      console.error("Save failed:", error);
      // You can add error handling UI here
    }
  };

  // Copy JSON to clipboard
  const handleCopyJson = async () => {
    if (savedData) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(savedData, null, 2));
        // You could add a toast notification here
        console.log("JSON copied to clipboard");
      } catch (err) {
        console.error("Failed to copy JSON:", err);
      }
    }
  };

  // Download JSON as file
  const handleDownloadJson = () => {
    if (savedData) {
      const jsonString = JSON.stringify(savedData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mask-generation-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    // Clear all drawn features
    if (draw.current) {
      draw.current.deleteAll();
    }

    // Remove detection layer if it exists
    if (map.current) {
      if (map.current.getSource("detections")) {
        map.current.removeLayer("detections-layer");
        map.current.removeSource("detections");
      }
    }

    // Reset states
    setPolygon(null);
    setInput(null);
    setDetections(undefined);
    setBoundsPolygon(null);
    setSelectedPoint(null);
    clearError();
    resetWorker();
  };

  const handleClearInput = () => {
    if (draw.current) {
      // Get all features
      const allFeatures = draw.current.getAll();
      
      // Keep only the main polygon and bounds polygon, remove points/boxes
      const featuresToKeep = allFeatures.features.filter(f => {
        if (f.geometry.type === "Polygon") {
          // Keep if it's the main polygon or bounds polygon
          return f === polygon || 
                 f === boundsPolygon || 
                 f.properties?.type === "bounds";
        }
        return false;
      });
      
      if (featuresToKeep.length > 0) {
        // Clear all and re-add only the polygons we want to keep
        draw.current.deleteAll();
        featuresToKeep.forEach(feature => {
          draw.current?.add(feature);
        });
      }
    }
    
    // Clear input states
    setInput(null);
    setSelectedPoint(null);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle: StyleSpecification = {
      version: 8 as const,
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
        {
          id: "esri-layer",
          type: "raster",
          source: "esri-tiles",
          minzoom: 0,
          maxzoom: 22,
          layout: {
            visibility: mapProvider === "esri" ? "visible" : "none",
          },
        },
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-13.274357, 8.486711],

      zoom: 18,
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

    function updatePolygon() {
      console.log('updatePolygon called, drawing mode:', drawingRef.current);
      const features = draw.current?.getAll();
      console.log('Features from draw:', features);
      if (features && features.features.length > 0) {
        console.log('Number of features:', features.features.length);
        console.log('First feature:', features.features[0]);
        
        if(drawingRef.current === "polygon"){
          console.log('Setting polygon from feature:', features.features[0]);
          setPolygon(features.features[0]);
          // Clear any existing input when drawing a new polygon
          setInput(null);
        }
        else if (drawingRef.current === "points") {
          // Find the most recent point feature (last one added)
          const pointFeatures = features.features.filter(f => f.geometry.type === "Point");
          if (pointFeatures.length > 0) {
            const pointFeature = pointFeatures[pointFeatures.length - 1];
            if (pointFeature.geometry.type === "Point") {
              setInput({
                type: "points",
                coordinates: pointFeature.geometry.coordinates as number[],
              });
            }
          } else {
            console.error("Expected a Point geometry for points input");
            setInput(null);
          }
        } else if (drawingRef.current === "boxes") {
          // Find the most recent polygon feature that's not the main polygon
          const polygonFeatures = features.features.filter(f => f.geometry.type === "Polygon");
          if (polygonFeatures.length > 1) {
            // Use the last polygon as the box (assuming first is the main polygon)
            const boxFeature = polygonFeatures[polygonFeatures.length - 1];
            if (boxFeature.geometry.type === "Polygon") {
              const coordinates = boxFeature.geometry.coordinates[0];
              if (coordinates.length >= 4) {
                // Convert to bounding box format [x1, y1, x2, y2]
                const [x1, y1] = coordinates[0];
                const [x2, y2] = coordinates[2];
                setInput({
                  type: "boxes",
                  coordinates: [x1, y1, x2, y2],
                });
              } else {
                console.error("Expected a bounding box with at least 4 corners");
                setInput(null);
              }
            }
          } else {
            console.error("Expected a Polygon geometry for boxes input");
            setInput(null);
          }
        } else if (drawingRef.current === "bounds-point") {
          // Find the most recent point feature (last one added)
          const pointFeatures = features.features.filter(f => f.geometry.type === "Point");
          if (pointFeatures.length > 0) {
            const pointFeature = pointFeatures[pointFeatures.length - 1];
            if (pointFeature.geometry.type === "Point") {
              setSelectedPoint({
                coordinates: pointFeature.geometry.coordinates as number[],
              });
            }
          } else {
            console.error("Expected a Point geometry for bounds point selection");
            setSelectedPoint(null);
          }
        }
      } else {
        console.log('No features found, clearing polygon and input');
        setPolygon(null);
        setInput(null);
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
        task: "mask-generation",
        modelId: customModelId || selectedModel,
      }],
      providerParams,
    });
  }, [mapProvider, initializeModel, customModelId, selectedModel]);

  // Handle results from the worker
  useEffect(() => {
    if (lastResult?.masks) {
      displayDetections(lastResult.masks);
      
      // Create bounds polygon from geoRawImage bounds if available
      if (lastResult?.geoRawImage?.bounds && !boundsPolygon) {
        const boundsFeature = boundsToPolygon(lastResult.geoRawImage.bounds);
        setBoundsPolygon(boundsFeature);
        
        // Add the bounds polygon to the draw control
        if (draw.current) {
          draw.current.add(boundsFeature);
        }
      }
    }
  }, [lastResult, boundsPolygon]);

  // Function to display detections on the map
  const displayDetections = (masks: GeoJSON.FeatureCollection) => {
    if (!map.current) return;

    // Remove existing detection layer if it exists
    if (map.current.getSource("detections")) {
      map.current.removeLayer("detections-layer");
      map.current.removeSource("detections");
    }

    // Add the new detections as a source
    map.current.addSource("detections", {
      type: "geojson",
      data: masks,
    });

    // Add a layer to display the detections
    map.current.addLayer({
      id: "detections-layer",
      type: "fill",
      source: "detections",
      paint: {
        "fill-color": "#ff0000ff",
        "fill-opacity": 0.5,
        "fill-outline-color": "#fff200ff",
      },
    });

    // Add hover functionality
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.current.on("mouseenter", "detections-layer", () => {
      map.current!.getCanvas().style.cursor = "pointer";
    });

    map.current.on("mouseleave", "detections-layer", () => {
      map.current!.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.current.on("mousemove", "detections-layer", e => {
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

    setDetections(masks);
  };

  const handleMaskGeneration = () => {
    if (!polygon) return;
    
    // Use selectedPoint if available, otherwise use regular input
    const inputPoint = selectedPoint ? {
      type: "points" as const,
      coordinates: selectedPoint.coordinates
    } : input;
    
    runInference({
      inputs : {
        polygon: polygon,
        input: inputPoint,
      },
      mapSourceParams : {
        zoomLevel
      },
      postProcessingParams:{
        maxMasks
      }
    })
  };

  const handleStartDrawing = () => {
    setDrawing("polygon");
    drawingRef.current = "polygon";
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
    }
  };
  
  const handleStartDrawingInput = () => {
    // If bounds polygon is available and we're in points mode, use bounds-point mode
    if (boundsPolygon && inputType === "points") {
      setDrawing("bounds-point");
      drawingRef.current = "bounds-point";
    } else {
      setDrawing(inputType);
      drawingRef.current = inputType;
    }
    
    if (draw.current) {
      if (inputType === "points") {
        draw.current.changeMode("draw_point");
      } else if (inputType === "boxes") {
        draw.current.changeMode("draw_rectangle");
      }
    }
  };

  return (
    <main className="w-full h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-96 bg-white border-r border-gray-200 h-full flex flex-col overflow-hidden">
        <div className="p-6 flex flex-col gap-6 text-black shadow-lg overflow-y-auto">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">Mask Generation</h2>
            <p className="text-sm text-gray-600">
              Draw a polygon and point or box on the map and run mask generation within the
              selected area.
            </p>
          </div>

          {!polygon && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
              Draw a polygon on the map to enable detection.
            </div>
          )}

          {polygon && !input && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
              Now draw a {inputType === 'points' ? 'point' : 'bounding box'} inside the polygon area to specify where to generate the mask.
            </div>
          )}

          {polygon && input && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
              ✓ {inputType === 'points' ? 'Point' : 'Bounding box'} set. Ready to generate mask!
            </div>
          )}

          {boundsPolygon && !selectedPoint && (
            <div className="mt-2 p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-sm">
              🎯 Bounds polygon is available! You can now select a point within the bounds to refine your mask generation.
            </div>
          )}

          {boundsPolygon && selectedPoint && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
              ✓ Point selected within bounds! You can generate additional masks using this point.
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Map Provider</h3>
              <div className="space-y-4">
                <div>
                  <select
                    id="mapProvider"
                    value={mapProvider}
                    onChange={(e) => setMapProvider(e.target.value as MapProvider)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  >
                    <option value="geobase">Geobase</option>
                    <option value="mapbox">Mapbox</option>
                    <option value="esri">ESRI</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleStartDrawing}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Draw Area of Interest
              </button>

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2 cursor-pointer"
                  onClick={handleStartDrawingInput}
                  disabled={!polygon || !isInitialized || isProcessing}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {inputType === 'points' ? (boundsPolygon ? 'Draw Point in Bounds' : 'Draw Point') : 'Draw Box'}
                </button>
                
                {(input || selectedPoint) && (
                  <button
                    className="px-3 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
                    onClick={handleClearInput}
                    title="Clear point/box and redraw"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
              
              <button
                className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={!polygon || (!input && !selectedPoint) || !isInitialized || isProcessing}
                onClick={handleMaskGeneration}
              >
                {!isInitialized || isProcessing ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {!isInitialized ? "Initializing Model..." : "Detecting..."}
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Generate Mask
                  </>
                )}
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleReset}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Model Settings</h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="modelSelect"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Select Model
                  </label>
                  <select
                    id="modelSelect"
                    value={selectedModel}
                    onChange={e => {
                      setSelectedModel(e.target.value);
                      setCustomModelId("");
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  >
                    {models.map(model => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="customModel"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Or Enter Custom Model ID
                  </label>
                  <input
                    type="text"
                    id="customModel"
                    value={customModelId}
                    onChange={e => {
                      setCustomModelId(e.target.value);
                      setSelectedModel("");
                    }}
                    placeholder="Enter Hugging Face model ID"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Detection Settings</h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="zoomLevel"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Zoom Level (0-22)
                  </label>
                  <input
                    type="number"
                    id="zoomLevel"
                    min="0"
                    max="22"
                    value={zoomLevel}
                    onChange={e =>
                      setZoomLevel(
                        Math.min(22, Math.max(0, Number(e.target.value)))
                      )
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  />
                </div>

                
                <div>
                  <label
                    htmlFor="inputType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Input Type
                  </label>
                  <select
                    id="inputType"
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value as "points" | "boxes")}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  >
                    <option value="points">Points</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="maxMasks"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Max Masks (1-3)
                  </label>
                  <input
                    type="number"
                    id="maxMasks"
                    min="1"
                    max="3"
                    step="1"
                    value={maxMasks}
                    onChange={e =>
                      setMaxMasks(
                        Math.min(3, Math.max(1, Number(e.target.value)))
                      )
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Label Input Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-800">Save Settings</h3>
            <div>
              <label
                htmlFor="labelInput"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Label (optional)
              </label>
              <input
                type="text"
                id="labelInput"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Enter a label for this mask generation"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                Will default to timestamp if left empty
              </p>
            </div>
          </div>

          {lastResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              Mask Generation complete!
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              Error: {error}
            </div>
          )}
          
        </div>
      </aside>
      {/* Map */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Save Button - Top Right Corner */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSave}
            disabled={!polygon || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors duration-200"
            title="Save current session"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
            </svg>
            Save
          </button>
        </div>

        {/* JSON Viewer - Below Save Button */}
        {showJsonViewer && savedData && (
          <div className="absolute top-16 right-4 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">Session Data</h3>
                {savedData.length > 0 && (
                  <p className="text-xs text-gray-600">
                    {savedData.length} mask generation{savedData.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowJsonViewer(false)}
                className="text-gray-500 hover:text-gray-700"
                title="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleCopyJson}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center gap-1"
                title="Copy JSON to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center gap-1"
                title="Download JSON file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Download
              </button>
            </div>
            
            <div className="bg-gray-50 rounded p-2 max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(savedData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Save Success Message */}
        {showSaveMessage && (
          <div className="absolute top-16 right-4 z-10 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Session saved successfully!
          </div>
        )}
      </div>
    </main>
  );
}

