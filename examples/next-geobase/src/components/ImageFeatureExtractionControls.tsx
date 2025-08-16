import React from 'react';
import { MapProvider } from '../types';

interface ImageFeatureExtractionControlsProps {
  polygon: GeoJSON.Feature | null;
  isInitialized: boolean;
  isProcessing: boolean;
  zoomLevel: number;
  mapProvider: MapProvider;
  lastResult: any;
  error: string | null;
  similarityThreshold: number;
  maxFeatures: number;
  onStartDrawing: () => void;
  onExtractFeatures: () => void;
  onReset: () => void;
  onZoomChange: (zoom: number) => void;
  onMapProviderChange: (provider: MapProvider) => void;
  onSimilarityThresholdChange: (threshold: number) => void;
  onMaxFeaturesChange: (maxFeatures: number) => void;
}

export const ImageFeatureExtractionControls: React.FC<ImageFeatureExtractionControlsProps> = ({
  polygon,
  isInitialized,
  isProcessing,
  zoomLevel,
  mapProvider,
  lastResult,
  error,
  similarityThreshold,
  maxFeatures,
  onStartDrawing,
  onExtractFeatures,
  onReset,
  onZoomChange,
  onMapProviderChange,
  onSimilarityThresholdChange,
  onMaxFeaturesChange,
}) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Image Feature Extraction
      </h1>
      <p className="text-gray-600 mb-6">
        Extract dense feature representations from satellite imagery using DINOv3
      </p>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600">
            {isInitialized ? 'Model Ready' : 'Initializing...'}
          </span>
        </div>
        {isProcessing && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-blue-600">Processing...</span>
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Map Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Map Provider
          </label>
          <select
            value={mapProvider}
            onChange={(e) => onMapProviderChange(e.target.value as MapProvider)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="geobase">Geobase</option>
            <option value="mapbox">Mapbox</option>
            <option value="esri">ESRI</option>
          </select>
        </div>

        {/* Zoom Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zoom Level: {zoomLevel}
          </label>
          <input
            type="range"
            min="15"
            max="22"
            value={zoomLevel}
            onChange={(e) => onZoomChange(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Similarity Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Similarity Threshold: {similarityThreshold}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={similarityThreshold}
            onChange={(e) => onSimilarityThresholdChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher values filter out less similar features
          </p>
        </div>

        {/* Max Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Features: {maxFeatures}
          </label>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={maxFeatures}
            onChange={(e) => onMaxFeaturesChange(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Limit the number of features returned
          </p>
        </div>



        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onStartDrawing}
            disabled={!isInitialized}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Drawing
          </button>
          <button
            onClick={onExtractFeatures}
            disabled={!polygon || !isInitialized || isProcessing}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Extract Features
          </button>
          <button
            onClick={onReset}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Results */}
        {lastResult?.features && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Feature Extraction Results
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Number of features: {lastResult.features.length}</div>
              {lastResult.metadata && (
                <>
                  <div>Feature dimensions: {lastResult.metadata.featureDimensions}</div>
                  <div>Patch size: {lastResult.patchSize}x{lastResult.patchSize}</div>
                  <div>Model: {lastResult.metadata.modelId}</div>
                </>
              )}
              {lastResult.similarityMatrix && (
                <div>Similarity matrix: {lastResult.similarityMatrix.length}x{lastResult.similarityMatrix[0]?.length || 0}</div>
              )}
            </div>
            
            {/* Feature Statistics */}
            {lastResult.features.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Feature Statistics</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Min similarity: {(() => {
                    let min = Infinity;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        if (val < min) min = val;
                      }
                    }
                    return min.toFixed(3);
                  })()}</div>
                  <div>Max similarity: {(() => {
                    let max = -Infinity;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        if (val > max) max = val;
                      }
                    }
                    return max.toFixed(3);
                  })()}</div>
                  <div>Avg similarity: {(() => {
                    let sum = 0;
                    let count = 0;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        sum += val;
                        count++;
                      }
                    }
                    return (sum / count).toFixed(3);
                  })()}</div>
                  <div>Std dev: {(() => {
                    // Calculate mean first
                    let sum = 0;
                    let count = 0;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        sum += val;
                        count++;
                      }
                    }
                    const mean = sum / count;
                    
                    // Calculate variance
                    let varianceSum = 0;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        varianceSum += Math.pow(val - mean, 2);
                      }
                    }
                    const variance = varianceSum / count;
                    return Math.sqrt(variance).toFixed(3);
                  })()}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
