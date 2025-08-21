import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoai, ProviderParams } from 'geoai';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';

const mapProviderConfig = {
  provider: "esri",
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery",
  tileSize: 256,
  attribution: "ESRI World Imagery",
};
const inferenceZoomLevel = 15; // The zoom level at which the inference will be run

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MaplibreDraw | null>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [status, setStatus] = useState({ color: '#9e9e9e', text: 'Waiting...' });

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "ESRI World Imagery",
          },
        },
        layers: [{ id: "satellite", type: "raster", source: "satellite" }],
      },
      center: [54.690310447932006, 24.75763471820723],
      zoom: 15,
    });

    const draw = new MaplibreDraw({ displayControlsDefault: false, controls: { polygon: true, trash: true } });
    // @ts-ignore
    map.current.addControl(draw);
    drawRef.current = draw;

    // Make controls bigger
    const style = document.createElement('style');
    style.textContent = '.maplibregl-ctrl-group button { width: 50px !important; height: 50px !important; font-size: 20px !important; } .maplibregl-ctrl-group { border-radius: 8px !important; }';
    document.head.appendChild(style);

    // Initialize pipeline
    (async () => {
      setStatus({ color: '#ffa500', text: 'Initializing AI Model...' });
      try {
        // Initialize pipeline
        const newPipeline = await geoai.pipeline(
          [{ task: "oil-storage-tank-detection" }],
          mapProviderConfig as ProviderParams
        );
        setPipeline(newPipeline);
        setStatus({ color: '#4caf50', text: 'AI Model Ready! Draw a polygon to detect oil storage tanks using the controls on the right.' });
        
        // Set up draw event listener after pipeline is ready
        map.current?.on('draw.create', async (e) => {
          console.log('Draw event triggered', e.features[0]);
          setStatus({ color: '#2196f3', text: 'Processing detection...' });
          try {
            // Run inference
            const result = await newPipeline.inference({
              inputs: { polygon: e.features[0] },
              mapSourceParams: { zoomLevel: inferenceZoomLevel }
            });

            if (map.current?.getSource('detections')) {
              map.current.removeLayer('detections');
              map.current.removeSource('detections');
            }

            map.current?.addSource("detections", {
              type: "geojson",
              data: result.detections,
            });
            map.current?.addLayer({
              id: 'detections',
              type: 'fill',
              source: 'detections',
              paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.5 }
            });

            setStatus({
              color: '#4caf50',
              text: `Found ${result.detections.features?.length || 0} oil storage tank${(result.detections.features?.length || 0) !== 1 ? 's' : ''}!`,
            });
          } catch (error) {
            console.error('Detection error:', error);
            setStatus({ color: '#f44336', text: 'Error during detection' });
          }
        });
      } catch (error) {
        console.error('Pipeline initialization error:', error);
        setStatus({ color: '#f44336', text: 'Failed to Initialize Model' });
      }
    })();

    return () => map.current?.remove();
  }, []);

  const resetMap = () => {
    // Clear drawn features using the draw reference
    drawRef.current?.deleteAll();
    
    // Clear detections
    if (map.current?.getSource('detections')) {
      map.current.removeLayer('detections');
      map.current.removeSource('detections');
    }
    
    setStatus({ color: '#4caf50', text: 'AI Model Ready! Draw a polygon to detect oil storage tanks using the controls on the right.' });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', backgroundColor: status.color, color: 'white', fontSize: '20px', textAlign: 'center', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>{status.text}</div>
        {status.text.includes('Found') && (
          <button onClick={resetMap} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,1)', color: 'black', border: '1px solid white', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', marginLeft: '16px' }}>
            Reset
          </button>
        )}
      </div>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

export default App;