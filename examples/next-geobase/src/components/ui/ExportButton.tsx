import React, { useState } from 'react';
import { ExportUtils } from '../../utils/exportUtils';

interface ExportButtonProps {
  detections?: GeoJSON.FeatureCollection;
  geoRawImage?: any;
  task?: string;
  provider?: string;
  disabled?: boolean;
  className?: string;
  // New props for embeddings
  embeddings?: {
    features: number[][];
    similarityMatrix: number[][];
    patchSize: number;
    allPatches: GeoJSON.Feature<GeoJSON.Polygon>[];
  };
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  detections,
  geoRawImage,
  task = 'detection',
  provider = 'unknown',
  disabled = false,
  className = '',
  embeddings,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compression function using HTML Compression API
  const compress = async (file: File, encoding: CompressionFormat = 'gzip') => {
    try {
      return {
        data: await new Response(file.stream().pipeThrough(new CompressionStream(encoding)), {
          headers: {
            'Content-Type': file.type
          },
        }).blob(),
        encoding,
      };
    } catch (error) {
      // If error, return the file uncompressed
      console.error((error as Error).message);
      return {
        data: file,
        encoding: null
      };
    }
  };

  const handleDownloadGeoJSON = () => {
    if (!detections || !detections.features.length) return;
    
    const filename = ExportUtils.generateFilename(task, provider);
    ExportUtils.downloadGeoJSON(detections, filename);
    setShowDropdown(false);
  };

  const handleDownloadPNG = () => {
    if (!geoRawImage) return;
    
    try {
      const filename = ExportUtils.generateImageFilename(task, provider);
      ExportUtils.downloadPNG(geoRawImage, filename);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to download PNG:', error);
      // You could add a toast notification here
    }
  };

  const handleCopyToClipboard = async () => {
    if (!detections) return;
    
    try {
      const formattedGeoJSON = ExportUtils.formatGeoJSONForCopy(detections);
      await ExportUtils.copyToClipboard(formattedGeoJSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // New function to export embeddings as compressed GeoJSON
  const handleExportEmbeddings = async () => {
    if (!embeddings || !embeddings.allPatches || embeddings.allPatches.length === 0) {
      console.warn('No embeddings available for export');
      return;
    }

    // Create GeoJSON FeatureCollection
    const geojsonData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: embeddings.allPatches
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(geojsonData, null, 2);
    
    // Create a File object
    const file = new File([jsonString], 'embeddings.geojson', { type: 'application/json' });
    
    // Compress the file
    const compressed = await compress(file, 'gzip');
    
    // Create download link
    const url = URL.createObjectURL(compressed.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = compressed.encoding ? 'embeddings-compressed.geojson.gz' : 'embeddings.geojson';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Log compression info
    const savings = ((1 - compressed.data.size / file.size) * 100).toFixed(0);
    console.log(`Compressed with ${compressed.encoding || 'none'}. Source: ${file.size} bytes, compressed: ${compressed.data.size} bytes, saving ${savings}%`);
    
    setShowDropdown(false);
  };

  const hasDetections = detections && detections.features && detections.features.length > 0;
  const hasGeoImage = !!geoRawImage;
  const hasEmbeddings = embeddings && embeddings.allPatches && embeddings.allPatches.length > 0;
  const hasExportableData = hasDetections || hasGeoImage || hasEmbeddings;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || !hasExportableData}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border
          ${hasExportableData && !disabled
            ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-500 shadow-md hover:shadow-lg'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
          }
          ${className}
        `}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && hasExportableData && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white/90 backdrop-blur-sm rounded-md shadow-lg border border-gray-200 z-50">
          <div className="p-1.5">
            {hasDetections && (
              <>
                <button
                  onClick={handleDownloadGeoJSON}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-teal-50/60 rounded-md transition-colors duration-200 text-gray-700 text-sm"
                >
                  <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div className="font-medium text-sm">Download GeoJSON</div>
                    <div className="text-xs text-gray-500">Save detections as .geojson</div>
                  </div>
                </button>
                
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-teal-50/60 rounded-md transition-colors duration-200 text-gray-700 text-sm"
                >
                  <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-medium text-sm">
                      {copied ? 'Copied!' : 'Copy GeoJSON'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {copied ? 'GeoJSON copied successfully' : 'Copy formatted GeoJSON'}
                    </div>
                  </div>
                </button>
              </>
            )}

            {hasGeoImage && (
              <button
                onClick={handleDownloadPNG}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-emerald-50/60 rounded-md transition-colors duration-200 text-gray-700 text-sm"
              >
                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium text-sm">Reference Image</div>
                  <div className="text-xs text-gray-500">Save reference image as .png</div>
                </div>
              </button>
            )}

            {hasEmbeddings && (
              <button
                onClick={handleExportEmbeddings}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-purple-50/60 rounded-md transition-colors duration-200 text-gray-700 text-sm"
              >
                <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <div className="font-medium text-sm">Export Embeddings</div>
                  <div className="text-xs text-gray-500">Save embeddings as compressed .geojson</div>
                </div>
              </button>
            )}
          </div>
          
          {/* Export info */}
          <div className="px-2 py-1.5 border-t border-gray-200 bg-gray-50/30">
            <div className="text-xs text-gray-600">
              {hasDetections && detections.features && `${detections.features.length} detection${detections.features.length !== 1 ? 's' : ''}`}
              {hasDetections && hasGeoImage && ' • '}
              {hasGeoImage && geoRawImage && `${geoRawImage.width}×${geoRawImage.height} image`}
              {hasEmbeddings && embeddings.allPatches && `${embeddings.allPatches.length} patch${embeddings.allPatches.length !== 1 ? 'es' : ''}`}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};
