<template>
  <div style="height: 100vh; display: flex; flex-direction: column">
    <div
      :style="{
        padding: '16px',
        backgroundColor: status.color,
        color: 'white',
        fontSize: '20px',
        textAlign: 'center',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }"
    >
      <div style="flex: 1">{{ status.text }}</div>
      <button
        v-if="status.text.includes('Found')"
        @click="resetMap"
        style="
          padding: 8px 16px;
          background-color: rgba(255, 255, 255, 1);
          color: black;
          border: 1px solid white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-left: 16px;
        "
      >
        Reset
      </button>
    </div>
    <div ref="mapContainer" style="height: 100%; width: 100%" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { geoai, type ProviderParams } from 'geoai'
import MaplibreDraw from 'maplibre-gl-draw'
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css'

const mapProviderConfig = {
  provider: 'esri',
  serviceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services',
  serviceName: 'World_Imagery',
  tileSize: 256,
  attribution: 'ESRI World Imagery'
}
const inferenceZoomLevel = 15 // The zoom level at which the inference will be run

const mapContainer = ref<HTMLDivElement | null>(null)
const map = ref<maplibregl.Map | null>(null)
const drawRef = ref<MaplibreDraw | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipeline = ref<any>(null)
const status = ref({ color: '#9e9e9e', text: 'Waiting...' })

onMounted(async () => {
  if (!mapContainer.value) return

  // Initialize map
  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        satellite: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'ESRI World Imagery'
        }
      },
      layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
    },
    center: [56.35167998561383, 25.209461334530914],
    zoom: 15
  })

  const draw = new MaplibreDraw({
    displayControlsDefault: false,
    controls: { polygon: true, trash: true }
  })
  // @ts-expect-error - MaplibreDraw types don't match addControl signature
  map.value.addControl(draw)
  drawRef.value = draw

  // Make controls bigger
  const style = document.createElement('style')
  style.textContent =
    '.maplibregl-ctrl-group button { width: 50px !important; height: 50px !important; font-size: 20px !important; } .maplibregl-ctrl-group { border-radius: 8px !important; }'
  document.head.appendChild(style)



  // Initialize pipeline
  try {
    status.value = { color: '#ffa500', text: 'Initializing AI Model...' }

    // Initialize pipeline
    const newPipeline = await geoai.pipeline(
      [{ task: 'oil-storage-tank-detection' }],
      mapProviderConfig as ProviderParams
    )
    pipeline.value = newPipeline
    status.value = {
      color: '#4caf50',
      text: 'AI Model Ready! Draw a polygon to detect oil storage tanks using the controls on the right.'
    }

    // Set up draw event listener after pipeline is ready
    map.value?.on('draw.create', async (e) => {
      status.value = { color: '#2196f3', text: 'Processing detection...' }
      try {
        // Run inference with fixed optimal zoom level
        const result = await newPipeline.inference({
          inputs: { polygon: e.features[0] },
          mapSourceParams: { zoomLevel: inferenceZoomLevel },
          postProcessingParams: {
            confidenceThreshold: 0.5,
            nmsThreshold: 0.3,
          }
        })

        // Remove existing detections (using same naming as live examples)
        if (map.value?.getSource('detections')) {
          map.value.removeLayer('detections-layer')
          if (map.value?.getLayer('detections-outline')) {
            map.value.removeLayer('detections-outline')
          }
          map.value.removeSource('detections')
        }

        // Add detections using same approach as live examples
        map.value?.addSource('detections', {
          type: 'geojson',
          data: result.detections
        })
        
        // Use bright yellow like live examples for better visibility
        map.value?.addLayer({
          id: 'detections-layer',
          type: 'fill',
          source: 'detections',
          paint: { 
            'fill-color': '#FFFF00',     // Bright yellow (like live examples)
            'fill-opacity': 0.4,
            'fill-outline-color': '#FF8C00'  // Dark orange outline
          }
        })
        
        // Add detection outline for better visibility
        map.value?.addLayer({
          id: 'detections-outline',
          type: 'line',
          source: 'detections',
          paint: { 
            'line-color': '#FF8C00',    // Dark orange outline 
            'line-width': 2,
            'line-opacity': 0.8 
          }
        })

        status.value = {
          color: '#4caf50',
          text: `Found ${result.detections.features?.length || 0} oil storage tank${
            (result.detections.features?.length || 0) !== 1 ? 's' : ''
          }!`
        }
      } catch (error) {
        console.error('Detection error:', error)
        status.value = { color: '#f44336', text: 'Error during detection' }
      }
    })
  } catch (error) {
    console.error('Pipeline initialization error:', error)
    status.value = { color: '#f44336', text: 'Failed to Initialize Model' }
  }
})

onUnmounted(() => {
  map.value?.remove()
})

const resetMap = () => {
  // Clear drawn features using the draw reference
  drawRef.value?.deleteAll()

  // Clear detections (using correct layer IDs)
  if (map.value?.getSource('detections')) {
    map.value.removeLayer('detections-layer')
    if (map.value?.getLayer('detections-outline')) {
      map.value.removeLayer('detections-outline')
    }
    map.value.removeSource('detections')
  }

  status.value = {
    color: '#4caf50',
    text: 'AI Model Ready! Draw a polygon to detect oil storage tanks using the controls on the right.'
  }
}
</script>

<style scoped></style>