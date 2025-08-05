"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import GitHubButton from 'react-github-btn'

const GEOBASE_CONFIG = {
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF,
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY,
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
  provider: "geobase",
};

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    console.log("Initializing map...");
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
          "raster-tiles": {
            type: "raster",
            tiles: [
              `https://${GEOBASE_CONFIG.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${GEOBASE_CONFIG.cogImagery}&apikey=${GEOBASE_CONFIG.apikey}`,
            ],
            tileSize: 256,
            attribution:
              'Data &copy; <a href="https://openaerialmap.org/" target="_blank">OpenAerialMap</a> contributors',
          },
          "mapbox-satellite": {
            type: "raster",
            tiles: [
              "https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
          {
            id: "simple-tiles",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [114.84857638295142, -3.449805712621256],
      zoom: 18,
    });

    return () => {
      console.log("Cleaning up map...");
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // return (
  //   <main className="w-full h-screen flex">
  //     {/* Sidebar */}
  //     <Sidebar map={map} />
  //     {/* Map Container */}
  //     <div className="flex-1 h-full relative">
  //       <div ref={mapContainer} className="w-full h-full" />
  //     </div>
  //   </main>
  // );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="fixed w-full p-3 sm:p-5 z-50">
        <div className="bg-gray-800/80 border border-gray-600 rounded-2xl backdrop-blur-sm mx-auto max-w-6xl px-4 md:px-6 shadow-xl">
          <div className="flex items-center justify-between py-4 lg:py-6 relative">
            <a className="text-white lg:absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2" href="/">
              <h1 className="text-2xl font-bold text-white">geoai.js</h1>
            </a>
            <nav className="hidden lg:flex grow items-center justify-center">
              <ul className="flex gap-1 text-sm font-semibold">
                <li><a className="px-3 py-2 rounded-md hover:bg-white/10 hover:text-white transition" href="#features">Features</a></li>
                <li><a className="px-3 py-2 rounded-md hover:bg-white/10 hover:text-white transition" href="#pricing">Pricing</a></li>
                <li><a className="px-3 py-2 rounded-md hover:bg-white/10 hover:text-white transition" href="#docs">Docs</a></li>
                <li><a className="px-3 py-2 rounded-md hover:bg-white/10 hover:text-white transition" href="#about">About</a></li>
              </ul>
            </nav>
            <div className="hidden lg:flex items-center gap-2 lg:absolute lg:-right-1 lg:top-1/2 lg:-translate-y-1/2">
                <a
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm cursor-pointer min-h-[38px] bg-green-600 shadow-lg hover:bg-green-700 transition"
                href="#get-started"
                >
                Get Started
                </a>
                <a
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm cursor-pointer min-h-[38px] bg-gray-700 shadow-lg hover:bg-gray-600 transition"
                href="https://github.com/decision-labs/geobase-ai.js"
                target="_blank"
                rel="noopener noreferrer"
                >
                <svg width="18" height="18" fill="currentColor" className="mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                Star on GitHub
                </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center relative pt-20 pb-12 sm:pt-24 sm:pb-10 md:pt-32 xl:pt-48 overflow-hidden">
          {/* Background Animation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -mt-12 w-96 h-96 md:w-[32rem] md:h-[32rem] md:mt-12 xl:w-[50rem] xl:h-[50rem] xl:mt-24 pointer-events-none opacity-30">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
              <div className="absolute inset-0 h-full w-full opacity-50 animate-spin-slow">
                <div className="w-full h-full border border-gray-600 rounded-full"></div>
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%]">
              <div className="absolute inset-0 h-full w-full opacity-50 animate-spin-reverse-slow">
                <div className="w-full h-full border border-gray-500 rounded-full"></div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-3/4 bg-gradient-to-t from-gray-900 to-transparent"></div>
          </div>
          
          <div className="mt-10 lg:mt-14 flex flex-col gap-6 lg:gap-12 items-center justify-center p-4 z-[1] max-w-5xl mx-auto">
            {/* Announcement Banner */}
            <a className="flex gap-2 items-center justify-center rounded-full bg-gray-700/60 hover:bg-gray-600/60 border border-gray-500/50 text-sm font-medium px-4 py-2 cursor-pointer transition" href="https://mailchi.mp/ece911e44b4e/new-geoaijs-models">
              <span className="block mr-0.5">🚀</span>
              We're working on more models—stay tuned or join our newsletter
              <span className="text-green-400">→</span>
            </a>
            
            {/* Main Heading */}
            <div className="relative h-36 lg:h-40 w-full">
              <h1 className="absolute left-1/2 w-full lg:w-[150%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-tight">
                GeoAI for the modern
                <br/>
                <span className="text-green-500">JavaScript</span> developer
              </h1>
            </div>
            
            <p className="text-center font-normal text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl">
              Open-source GeoAI. No backend required. Run models right in your JavaScript apps or edge devices!
            </p>
            
            <div className="flex gap-4">
              <a className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-lg cursor-pointer min-h-[44px] bg-gray-600 shadow-lg hover:bg-gray-500 transition" href="#features">
                Explore Features
              </a>
              <a className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-lg cursor-pointer min-h-[44px] bg-green-700 shadow-lg hover:bg-green-600 transition" href="#get-started">
                Get Started
              </a>
            </div>
            
            {/* Works with section */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center items-center gap-8 rounded-full py-3 px-6 bg-gray-800 shadow-lg">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-28 flex items-center justify-center mb-2">
                    <img src="/provider-logos/geobase.svg" alt="Geobase" className="h-full object-contain filter grayscale opacity-70" />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-28 flex items-center justify-center mb-2">
                    <img src="/provider-logos/mapbox.svg" alt="Mapbox" className="h-full object-contain filter grayscale opacity-70" />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-28 flex items-center justify-center mb-2">
                    <img src="/provider-logos/esri.svg" alt="ESRI" className="h-full object-contain filter grayscale opacity-70" style={{ transform: 'scale(0.7)' }} />
                  </div>
                  <span className="mt-1 px-2 py-0.5 border border-dashed border-gray-500 rounded text-xs text-gray-400">coming soon</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-28 flex items-center justify-center mb-2">
                    <img src="/provider-logos/google-maps.svg" alt="Google Maps" className="h-full object-contain filter grayscale opacity-70" />
                  </div>
                  <span className="mt-1 px-2 py-0.5 border border-dashed border-gray-500 rounded text-xs text-gray-400">coming soon</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Example Section */}
        <section className="max-w-5xl mx-auto mb-16 px-4">
          <div className="mb-4">
            <SyntaxHighlighter
              language="shell"
              style={oneDark}
              customStyle={{
                borderRadius: 12,
                fontSize: 16,
                marginBottom: 16,
                backgroundColor: '#1f2937',
                userSelect: 'text', // allow normal text selection
                boxShadow: 'none', // remove any highlight shadow
                outline: 'none',   // remove outline highlight
              }}
            >
              pnpm add @geobase-js/geoai
            </SyntaxHighlighter>
          </div>
          <SyntaxHighlighter language="javascript" style={oneDark} customStyle={{ borderRadius: 12, fontSize: 16, backgroundColor: '#1f2937' }}>
            {`import { geoai } from "@geobase-js/geoai";

// mapProviderConfig can also accept Mapbox or other image tile endpoints
const mapProviderConfig = {
  provider: "geobase", projectRef, apikey, cogImagery
};

const pipeline = await geoai.pipeline(
  [{ task : "object-detection"}], mapProviderConfig
);

const result = await pipeline.inference(polygon);`}
          </SyntaxHighlighter>
        </section>

        {/* Features Grid */}
        <section id="features" className="mx-auto max-w-7xl pb-16 px-4">
          <div className="flex flex-col gap-5 mb-12 mx-auto text-center">
            <h2 className="font-semibold text-3xl md:text-4xl lg:text-5xl text-white leading-tight">
              Prototype a geo app in minutes, launch in days.
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto">
              Designed for developers, data analysts, GIS experts and anyone in between. Explore our features and guides to get started now.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

            <a
              href="/tasks/oil-storage-tank"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/oil-storage-tank-detection.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Oil Storage Tank Detection
              </h3>
              <p className="text-gray-300 text-base">
                Detects oil storage tanks in the imagery.
              </p>
            </a>

            
            <a
              href="/tasks/object-detection"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/object-detection.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Object Detection
              </h3>
              <p className="text-gray-300 text-base">
                Detects and highlights objects in the imagery using AI models.
              </p>
            </a>
            
            <a
              href="/tasks/mask-generation"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/mask-generation.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Mask Generation
              </h3>
              <p className="text-gray-300 text-base">
                Generates segmentation masks for features of interest in the image.
              </p>
            </a>
            
            <a
              href="/tasks/building-detection"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/building-detection.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Building Detection
              </h3>
              <p className="text-gray-300 text-base">
                Identifies and outlines buildings present in the imagery.
              </p>
            </a>
            
            <a
              href="/tasks/car-detection"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/car-detection-model.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Car Detection
              </h3>
              <p className="text-gray-300 text-base">
                Detects and marks cars and vehicles in the image.
              </p>
            </a>
            
            <a
              href="/tasks/wetland-segmentation"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/wetland-segmentation.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Wetland Detection
              </h3>
              <p className="text-gray-300 text-base">
                Identifies wetland areas such as marshes and swamps in the imagery.
              </p>
            </a>
            
            <a
              href="/tasks/solar-panel"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/solar-panel-detection.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Solar Panel Detection
              </h3>
              <p className="text-gray-300 text-base">
                Detects solar panels and solar farms in the image.
              </p>
            </a>
            
            <a
              href="/tasks/ship-detection"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/ship-detection.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Ship Detection
              </h3>
              <p className="text-gray-300 text-base">
                Detects ships and large vessels in water bodies.
              </p>
            </a>
            
            <a
              href="/tasks/oriented-object-detection"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/oriented-object-detection.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Oriented Object Detection
              </h3>
              <p className="text-gray-300 text-base">
                Detects objects and provides their orientation in the imagery.
              </p>
            </a>
            
            <a
              href="/tasks/building-footprint"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/building-footprint-segmentation.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Building Footprint Segmentation
              </h3>
              <p className="text-gray-300 text-base">
                Generates segmentation masks for building footprints in satellite imagery.
              </p>
            </a>
            
            <a
              href="/tasks/land-cover"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/land-cover-classification.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Land Cover Classification
              </h3>
              <p className="text-gray-300 text-base">
                Classifies terrain and land cover types such as water, forest, or urban areas.
              </p>
            </a>
            
            <a
              href="/tasks/zero-shot"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/zero-shot-object-detection.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Zero Shot Object Detection
              </h3>
              <p className="text-gray-300 text-base">
                Detects objects without prior training on specific classes using advanced AI.
              </p>
            </a>
            
            <a
              href="/tasks/zero-shot-segmentation"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/zero-shot-segmentation.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Zero Shot Segmentation
              </h3>
              <p className="text-gray-300 text-base">
                Segment objects without prior training on specific classes using advanced AI.
              </p>
            </a>
            
            <a
              href="/tasks/embedding-similarity-search"
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-green-500/50"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-48 object-cover rounded-lg mb-6"
              >
                <source src="/video/embedding-similarity-search.mp4" type="video/mp4" />
              </video>
              <h3 className="text-xl font-bold text-white mb-3">
                Embedding Similarity Search
              </h3>
              <p className="text-gray-300 text-base">
                Finds similar patches in the imagery based on embeddings.
              </p>
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800/50 border-t border-gray-700 mt-20">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-2xl font-bold text-white mb-4">geoai.js</h3>
                <p className="text-gray-300 text-base max-w-md">
                  Open-source GeoAI toolkit for JavaScript developers. Run AI models directly in your browser or edge devices without any backend infrastructure.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Resources</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-300 hover:text-white transition">Documentation</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition">Examples</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition">GitHub</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition">API Reference</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Community</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-300 hover:text-white transition">Discord</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition">Twitter</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition">Blog</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition">Newsletter</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <p className="text-gray-400 text-sm">
                © 2024 geoai.js. Open source project by the GeoBase team.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
