# Tutorial 4: Multiple AI Tasks & Chaining

> Learn to chain multiple AI models for complex geospatial analysis workflows

This tutorial teaches you how to combine multiple AI tasks to create sophisticated analysis pipelines. You'll learn to chain object detection, segmentation, and classification models to extract comprehensive insights from satellite imagery.

[//]: # "TODO: Add demo GIF showing multi-task workflow"

## What You'll Learn

- 🔗 Chaining multiple AI models in sequence
- 🎯 Building conditional analysis workflows
- 📊 Combining results from different AI tasks
- ⚡ Optimizing multi-task performance
- 🎨 Advanced visualization techniques
- 🔄 Error handling in complex pipelines

## Prerequisites

- Completed [Tutorial 3: Web Worker Optimization](./03-web-worker-optimization.md)
- Understanding of different AI task types
- Familiarity with GeoJSON data structures

## Real-World Use Cases

Multi-task AI pipelines enable powerful analysis scenarios:

### 🏢 Urban Development Analysis

```
Step 1: Object Detection → Find all buildings
Step 2: Building Segmentation → Get precise footprints
Step 3: Classification → Determine building types
Result: Complete urban development assessment
```

### 🌱 Environmental Monitoring

```
Step 1: Land Cover Classification → Identify vegetation areas
Step 2: Wetland Segmentation → Find water bodies
Step 3: Change Detection → Compare with historical data
Result: Environmental impact analysis
```

### 🚗 Infrastructure Assessment

```
Step 1: Object Detection → Find vehicles and structures
Step 2: Road Detection → Map transportation networks
Step 3: Damage Assessment → Evaluate infrastructure condition
Result: Comprehensive infrastructure report
```

## Step 1: Multi-Task Architecture

Create `src/hooks/useMultiTaskAI.ts`:

```typescript
import { useState, useCallback, useRef } from "react";
import { WorkerManager } from "../workers/WorkerManager";

interface TaskChain {
  id: string;
  name: string;
  tasks: ChainedTask[];
  description: string;
}

interface ChainedTask {
  task: string;
  id: string;
  condition?: (previousResults: any[]) => boolean;
  params?: (previousResults: any[], polygon: GeoJSON.Feature) => any;
  postProcess?: (result: any, previousResults: any[]) => any;
}

interface MultiTaskResult {
  chainId: string;
  polygon: GeoJSON.Feature;
  results: TaskResult[];
  summary: ChainSummary;
  processingTime: number;
}

interface TaskResult {
  taskId: string;
  task: string;
  result: any;
  processingTime: number;
  confidence: number;
}

interface ChainSummary {
  totalObjects: number;
  taskBreakdown: { [taskName: string]: number };
  averageConfidence: number;
  recommendations: string[];
}

const PREDEFINED_CHAINS: TaskChain[] = [
  {
    id: "urban-analysis",
    name: "Urban Development Analysis",
    description: "Comprehensive building detection and classification",
    tasks: [
      {
        task: "object-detection",
        id: "initial-detection",
        params: () => ({ confidenceScore: 0.7 }),
      },
      {
        task: "building-footprint-segmentation",
        id: "building-segmentation",
        condition: results => results[0]?.detections?.features?.length > 0,
        params: (results, polygon) => ({
          confidenceScore: 0.8,
          minArea: 50,
          focusAreas: extractBuildingAreas(results[0]),
        }),
      },
      {
        task: "building-classification",
        id: "building-types",
        condition: results => results[1]?.segmentations?.features?.length > 0,
        params: results => ({
          buildings: results[1].segmentations.features,
          confidenceScore: 0.75,
        }),
        postProcess: (result, previousResults) =>
          combineDetectionAndClassification(
            previousResults[0],
            previousResults[1],
            result
          ),
      },
    ],
  },
  {
    id: "environmental-monitoring",
    name: "Environmental Impact Assessment",
    description: "Land cover and wetland analysis",
    tasks: [
      {
        task: "land-cover-classification",
        id: "land-cover",
        params: () => ({ confidenceScore: 0.8 }),
      },
      {
        task: "wetland-segmentation",
        id: "wetlands",
        params: (results, polygon) => ({
          confidenceScore: 0.75,
          focusOnWater: true,
        }),
        postProcess: (result, previousResults) =>
          calculateEnvironmentalMetrics(previousResults[0], result),
      },
      {
        task: "vegetation-health",
        id: "vegetation-analysis",
        condition: results => hasVegetationAreas(results[0]),
        params: results => ({
          vegetationAreas: extractVegetationAreas(results[0]),
          healthThreshold: 0.6,
        }),
      },
    ],
  },
  {
    id: "infrastructure-assessment",
    name: "Infrastructure Condition Assessment",
    description: "Roads, vehicles, and infrastructure analysis",
    tasks: [
      {
        task: "object-detection",
        id: "infrastructure-objects",
        params: () => ({
          confidenceScore: 0.7,
          focusClasses: ["vehicle", "building", "road"],
        }),
      },
      {
        task: "road-detection",
        id: "road-network",
        params: () => ({ confidenceScore: 0.8 }),
      },
      {
        task: "damage-assessment",
        id: "condition-analysis",
        condition: results => hasInfrastructure(results[0], results[1]),
        params: results => ({
          infrastructure: combineInfrastructure(results[0], results[1]),
          damageThreshold: 0.3,
        }),
      },
    ],
  },
];

export function useMultiTaskAI() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChain, setCurrentChain] = useState<TaskChain | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [results, setResults] = useState<MultiTaskResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const workerManagerRef = useRef<WorkerManager | null>(null);
  const chainsRef = useRef<TaskChain[]>(PREDEFINED_CHAINS);

  const initializeWorkers = useCallback(() => {
    if (!workerManagerRef.current) {
      workerManagerRef.current = new WorkerManager({
        maxWorkers: 6, // More workers for multi-task
        taskTimeout: 90000, // Longer timeout for complex tasks
        retryAttempts: 3,
      });
    }
  }, []);

  const executeTaskChain = useCallback(
    async (
      chainId: string,
      polygon: GeoJSON.Feature,
      zoomLevel: number = 18
    ): Promise<MultiTaskResult> => {
      const chain = chainsRef.current.find(c => c.id === chainId);
      if (!chain) {
        throw new Error(`Task chain '${chainId}' not found`);
      }

      setIsProcessing(true);
      setCurrentChain(chain);
      setCurrentTaskIndex(0);
      setError(null);

      const startTime = Date.now();
      const taskResults: TaskResult[] = [];

      try {
        initializeWorkers();

        for (let i = 0; i < chain.tasks.length; i++) {
          const chainedTask = chain.tasks[i];
          setCurrentTaskIndex(i);

          // Check condition if specified
          if (
            chainedTask.condition &&
            !chainedTask.condition(taskResults.map(r => r.result))
          ) {
            console.log(
              `Skipping task ${chainedTask.task} - condition not met`
            );
            continue;
          }

          // Prepare task parameters
          const baseParams = {
            polygon,
            zoomLevel,
            task: chainedTask.task,
          };

          const additionalParams = chainedTask.params
            ? chainedTask.params(
                taskResults.map(r => r.result),
                polygon
              )
            : {};

          const taskParams = { ...baseParams, ...additionalParams };

          // Execute task
          const taskStartTime = Date.now();
          const result = await workerManagerRef.current!.executeTask({
            type: "inference",
            payload: taskParams,
            priority: "high",
          });

          const taskEndTime = Date.now();

          // Post-process result if specified
          const processedResult = chainedTask.postProcess
            ? chainedTask.postProcess(
                result,
                taskResults.map(r => r.result)
              )
            : result;

          // Calculate confidence score
          const confidence = calculateTaskConfidence(
            processedResult,
            chainedTask.task
          );

          taskResults.push({
            taskId: chainedTask.id,
            task: chainedTask.task,
            result: processedResult,
            processingTime: taskEndTime - taskStartTime,
            confidence,
          });
        }

        // Generate summary
        const summary = generateChainSummary(taskResults, chain);

        const multiTaskResult: MultiTaskResult = {
          chainId,
          polygon,
          results: taskResults,
          summary,
          processingTime: Date.now() - startTime,
        };

        setResults(prev => [multiTaskResult, ...prev.slice(0, 9)]);
        return multiTaskResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Multi-task execution failed";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
        setCurrentChain(null);
        setCurrentTaskIndex(0);
      }
    },
    []
  );

  const createCustomChain = useCallback((chain: Omit<TaskChain, "id">) => {
    const newChain: TaskChain = {
      ...chain,
      id: `custom-${Date.now()}`,
    };

    chainsRef.current.push(newChain);
    return newChain.id;
  }, []);

  const getAvailableChains = useCallback(() => {
    return chainsRef.current;
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    // State
    isProcessing,
    currentChain,
    currentTaskIndex,
    results,
    error,

    // Actions
    executeTaskChain,
    createCustomChain,
    getAvailableChains,
    clearResults,
    clearError: () => setError(null),
  };
}

// Helper functions
function extractBuildingAreas(detectionResult: any): GeoJSON.Feature[] {
  if (!detectionResult?.detections?.features) return [];

  return detectionResult.detections.features.filter(
    (feature: any) =>
      feature.properties?.class === "building" &&
      feature.properties?.confidence > 0.7
  );
}

function combineDetectionAndClassification(
  detection: any,
  segmentation: any,
  classification: any
): any {
  // Combine results from multiple tasks
  const combinedFeatures = segmentation.segmentations.features.map(
    (segment: any) => {
      const matchingClassification = classification.classifications?.find(
        (cls: any) => spatial.intersects(segment.geometry, cls.geometry)
      );

      return {
        ...segment,
        properties: {
          ...segment.properties,
          buildingType: matchingClassification?.properties?.type || "unknown",
          classificationConfidence:
            matchingClassification?.properties?.confidence || 0,
        },
      };
    }
  );

  return {
    type: "FeatureCollection",
    features: combinedFeatures,
    metadata: {
      totalBuildings: combinedFeatures.length,
      averageConfidence:
        combinedFeatures.reduce(
          (sum: number, f: any) => sum + f.properties.confidence,
          0
        ) / combinedFeatures.length,
    },
  };
}

function calculateEnvironmentalMetrics(landCover: any, wetlands: any): any {
  const vegetationArea = calculateArea(landCover.vegetation);
  const waterArea = calculateArea(wetlands.wetlands);
  const developedArea = calculateArea(landCover.developed);

  const totalArea = vegetationArea + waterArea + developedArea;

  return {
    landCover,
    wetlands,
    metrics: {
      vegetationCoverage: vegetationArea / totalArea,
      waterCoverage: waterArea / totalArea,
      developmentPressure: developedArea / totalArea,
      biodiversityIndex: calculateBiodiversityIndex(landCover, wetlands),
      recommendations: generateEnvironmentalRecommendations(
        vegetationArea,
        waterArea,
        developedArea
      ),
    },
  };
}

function hasVegetationAreas(landCoverResult: any): boolean {
  return landCoverResult?.vegetation?.features?.length > 0;
}

function extractVegetationAreas(landCoverResult: any): GeoJSON.Feature[] {
  return landCoverResult.vegetation?.features || [];
}

function hasInfrastructure(objectResult: any, roadResult: any): boolean {
  const hasObjects = objectResult?.detections?.features?.length > 0;
  const hasRoads = roadResult?.roads?.features?.length > 0;
  return hasObjects || hasRoads;
}

function combineInfrastructure(objectResult: any, roadResult: any): any {
  return {
    objects: objectResult.detections?.features || [],
    roads: roadResult.roads?.features || [],
  };
}

function calculateTaskConfidence(result: any, taskType: string): number {
  // Calculate average confidence based on task type
  if (!result) return 0;

  switch (taskType) {
    case "object-detection":
      return (
        result.detections?.features?.reduce(
          (sum: number, f: any) => sum + (f.properties?.confidence || 0),
          0
        ) / (result.detections?.features?.length || 1)
      );

    case "building-footprint-segmentation":
      return (
        result.segmentations?.features?.reduce(
          (sum: number, f: any) => sum + (f.properties?.confidence || 0),
          0
        ) / (result.segmentations?.features?.length || 1)
      );

    default:
      return result.confidence || 0.8;
  }
}

function generateChainSummary(
  taskResults: TaskResult[],
  chain: TaskChain
): ChainSummary {
  const totalObjects = taskResults.reduce((sum, result) => {
    if (result.result?.detections?.features) {
      return sum + result.result.detections.features.length;
    }
    if (result.result?.segmentations?.features) {
      return sum + result.result.segmentations.features.length;
    }
    return sum;
  }, 0);

  const taskBreakdown = taskResults.reduce(
    (breakdown, result) => {
      const count =
        result.result?.detections?.features?.length ||
        result.result?.segmentations?.features?.length ||
        result.result?.features?.length ||
        1;
      breakdown[result.task] = count;
      return breakdown;
    },
    {} as { [taskName: string]: number }
  );

  const averageConfidence =
    taskResults.reduce((sum, result) => sum + result.confidence, 0) /
    taskResults.length;

  const recommendations = generateRecommendations(taskResults, chain);

  return {
    totalObjects,
    taskBreakdown,
    averageConfidence,
    recommendations,
  };
}

function generateRecommendations(
  taskResults: TaskResult[],
  chain: TaskChain
): string[] {
  const recommendations: string[] = [];

  switch (chain.id) {
    case "urban-analysis":
      const buildingCount =
        taskResults[1]?.result?.segmentations?.features?.length || 0;
      if (buildingCount > 50) {
        recommendations.push(
          "High density urban area - consider infrastructure capacity"
        );
      }
      if (taskResults[0]?.confidence < 0.8) {
        recommendations.push(
          "Consider running analysis at higher zoom level for better accuracy"
        );
      }
      break;

    case "environmental-monitoring":
      const vegCoverage =
        taskResults[0]?.result?.metrics?.vegetationCoverage || 0;
      if (vegCoverage < 0.3) {
        recommendations.push(
          "Low vegetation coverage - potential environmental concerns"
        );
      }
      break;

    case "infrastructure-assessment":
      const roadDensity = taskResults[1]?.result?.roads?.features?.length || 0;
      if (roadDensity > 20) {
        recommendations.push(
          "High road density - monitor traffic and maintenance needs"
        );
      }
      break;
  }

  return recommendations;
}

function calculateArea(geoJSONFeatures: any): number {
  // Simplified area calculation - use turf.js for production
  if (!geoJSONFeatures?.features) return 0;

  return geoJSONFeatures.features.reduce((total: number, feature: any) => {
    return total + (feature.properties?.area || 0);
  }, 0);
}

function calculateBiodiversityIndex(landCover: any, wetlands: any): number {
  // Simplified biodiversity calculation
  const habitatTypes = [
    landCover?.forest?.features?.length || 0,
    landCover?.grassland?.features?.length || 0,
    wetlands?.wetlands?.features?.length || 0,
  ].filter(count => count > 0);

  return habitatTypes.length / 3; // Normalized to 0-1
}

function generateEnvironmentalRecommendations(
  vegetationArea: number,
  waterArea: number,
  developedArea: number
): string[] {
  const recommendations: string[] = [];
  const totalArea = vegetationArea + waterArea + developedArea;

  if (developedArea / totalArea > 0.7) {
    recommendations.push(
      "High development density - consider green space requirements"
    );
  }

  if (waterArea / totalArea < 0.1) {
    recommendations.push(
      "Limited water resources - monitor water conservation"
    );
  }

  if (vegetationArea / totalArea < 0.2) {
    recommendations.push(
      "Low vegetation coverage - consider reforestation initiatives"
    );
  }

  return recommendations;
}

// Mock spatial utility (use turf.js in production)
const spatial = {
  intersects: (geom1: any, geom2: any): boolean => {
    // Simplified intersection check
    return true; // Replace with actual spatial intersection
  },
};
```

## Step 2: Multi-Task UI Component

Create `src/components/MultiTaskControl.tsx`:

```typescript
import React, { useState } from 'react';
import { useMultiTaskAI } from '../hooks/useMultiTaskAI';

export function MultiTaskControl({
  onExecuteChain,
  polygon
}: {
  onExecuteChain: (result: any) => void;
  polygon: GeoJSON.Feature | null;
}) {
  const {
    isProcessing,
    currentChain,
    currentTaskIndex,
    results,
    error,
    executeTaskChain,
    getAvailableChains,
    clearResults,
    clearError
  } = useMultiTaskAI();

  const [selectedChainId, setSelectedChainId] = useState<string>('urban-analysis');
  const [zoomLevel, setZoomLevel] = useState(18);

  const handleExecuteChain = async () => {
    if (!polygon) return;

    try {
      const result = await executeTaskChain(selectedChainId, polygon, zoomLevel);
      onExecuteChain(result);
    } catch (error) {
      console.error('Chain execution failed:', error);
    }
  };

  const availableChains = getAvailableChains();

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <h2 className="text-xl font-bold">Multi-Task AI Analysis</h2>

      {/* Chain Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Analysis Type</label>
        <select
          value={selectedChainId}
          onChange={(e) => setSelectedChainId(e.target.value)}
          className="w-full border rounded px-3 py-2"
          disabled={isProcessing}
        >
          {availableChains.map(chain => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>

        {/* Chain Description */}
        <p className="text-sm text-gray-600 mt-1">
          {availableChains.find(c => c.id === selectedChainId)?.description}
        </p>
      </div>

      {/* Zoom Level */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Zoom Level: {zoomLevel}
        </label>
        <input
          type="range"
          min="14"
          max="20"
          value={zoomLevel}
          onChange={(e) => setZoomLevel(parseInt(e.target.value))}
          className="w-full"
          disabled={isProcessing}
        />
      </div>

      {/* Execution Status */}
      {isProcessing && currentChain && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center space-x-2 mb-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="font-medium">Running: {currentChain.name}</span>
          </div>

          <div className="space-y-1">
            {currentChain.tasks.map((task, index) => (
              <div
                key={task.id}
                className={`text-sm flex items-center space-x-2 ${
                  index < currentTaskIndex ? 'text-green-600' :
                  index === currentTaskIndex ? 'text-blue-600' :
                  'text-gray-400'
                }`}
              >
                <span>
                  {index < currentTaskIndex ? '✓' :
                   index === currentTaskIndex ? '▶' :
                   '○'}
                </span>
                <span>{task.task.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-800 font-medium">Analysis Failed</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleExecuteChain}
          disabled={!polygon || isProcessing}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing ? 'Analyzing...' : 'Run Multi-Task Analysis'}
        </button>

        {results.length > 0 && (
          <button
            onClick={clearResults}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Clear Results ({results.length})
          </button>
        )}
      </div>

      {/* Results Summary */}
      {results[0] && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <h3 className="font-medium text-green-800 mb-2">Latest Results</h3>
          <div className="text-sm text-green-700 space-y-1">
            <div>Total Objects: {results[0].summary.totalObjects}</div>
            <div>Processing Time: {Math.round(results[0].processingTime / 1000)}s</div>
            <div>Confidence: {Math.round(results[0].summary.averageConfidence * 100)}%</div>

            {results[0].summary.recommendations.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Recommendations:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {results[0].summary.recommendations.map((rec, index) => (
                    <li key={index} className="text-xs">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Step 3: Advanced Results Visualization

Create `src/components/MultiTaskResults.tsx`:

```typescript
import React, { useState } from 'react';
import { MultiTaskResult, TaskResult } from '../hooks/useMultiTaskAI';

interface MultiTaskResultsProps {
  results: MultiTaskResult[];
  onResultSelect: (result: MultiTaskResult) => void;
}

export function MultiTaskResults({ results, onResultSelect }: MultiTaskResultsProps) {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [activeTaskTab, setActiveTaskTab] = useState<string>('summary');

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-semibold mb-2">Multi-Task Results</h3>
        <p className="text-gray-500 text-sm">
          No analysis results yet. Run a multi-task analysis to see results.
        </p>
      </div>
    );
  }

  const selectedResult = results.find(r => r.chainId === selectedResultId) || results[0];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <h3 className="font-semibold">Multi-Task Analysis Results</h3>

      {/* Result Selection */}
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={`${result.chainId}-${index}`}
            className={`p-3 border rounded cursor-pointer transition-colors ${
              selectedResult === result
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => {
              setSelectedResultId(result.chainId);
              onResultSelect(result);
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">
                  {getChainDisplayName(result.chainId)}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(Date.now() - result.processingTime).toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-400">
                  {result.results.length} tasks • {result.summary.totalObjects} objects
                </div>
              </div>
              <div className="text-2xl">
                {selectedResult === result ? '📊' : '📈'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Results */}
      <div className="border-t pt-4">
        <div className="flex space-x-1 mb-4">
          {['summary', ...selectedResult.results.map(r => r.taskId)].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTaskTab(tab)}
              className={`px-3 py-1 text-sm rounded ${
                activeTaskTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab === 'summary' ? 'Summary' : formatTaskName(tab)}
            </button>
          ))}
        </div>

        {activeTaskTab === 'summary' ? (
          <SummaryView result={selectedResult} />
        ) : (
          <TaskDetailView
            taskResult={selectedResult.results.find(r => r.taskId === activeTaskTab)!}
          />
        )}
      </div>
    </div>
  );
}

function SummaryView({ result }: { result: MultiTaskResult }) {
  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {result.summary.totalObjects}
          </div>
          <div className="text-sm text-gray-600">Total Objects Found</div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-green-600">
            {Math.round(result.summary.averageConfidence * 100)}%
          </div>
          <div className="text-sm text-gray-600">Average Confidence</div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(result.processingTime / 1000)}s
          </div>
          <div className="text-sm text-gray-600">Processing Time</div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-orange-600">
            {result.results.length}
          </div>
          <div className="text-sm text-gray-600">Tasks Completed</div>
        </div>
      </div>

      {/* Task Breakdown */}
      <div>
        <h4 className="font-medium mb-2">Task Breakdown</h4>
        <div className="space-y-2">
          {Object.entries(result.summary.taskBreakdown).map(([task, count]) => (
            <div key={task} className="flex justify-between items-center">
              <span className="text-sm">{formatTaskName(task)}</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {count} objects
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {result.summary.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">📋 Recommendations</h4>
          <ul className="space-y-1">
            {result.summary.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Options */}
      <div className="flex space-x-2">
        <button
          onClick={() => exportResults(result, 'geojson')}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          Export GeoJSON
        </button>
        <button
          onClick={() => exportResults(result, 'report')}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}

function TaskDetailView({ taskResult }: { taskResult: TaskResult }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">{formatTaskName(taskResult.task)}</h4>
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
          {Math.round(taskResult.confidence * 100)}% confidence
        </span>
      </div>

      {/* Task-specific visualization */}
      {taskResult.task === 'object-detection' && (
        <ObjectDetectionDetails result={taskResult.result} />
      )}

      {taskResult.task === 'building-footprint-segmentation' && (
        <SegmentationDetails result={taskResult.result} />
      )}

      {taskResult.task === 'land-cover-classification' && (
        <ClassificationDetails result={taskResult.result} />
      )}

      {/* Processing Time */}
      <div className="text-sm text-gray-500">
        Processing time: {Math.round(taskResult.processingTime / 1000)}s
      </div>
    </div>
  );
}

function ObjectDetectionDetails({ result }: { result: any }) {
  if (!result?.detections?.features) return <div>No detections found</div>;

  const classBreakdown = result.detections.features.reduce((acc: any, feature: any) => {
    const className = feature.properties?.class || 'unknown';
    acc[className] = (acc[className] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {result.detections.features.length} objects detected
      </div>

      <div className="space-y-1">
        {Object.entries(classBreakdown).map(([className, count]) => (
          <div key={className} className="flex justify-between text-sm">
            <span className="capitalize">{className}</span>
            <span>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegmentationDetails({ result }: { result: any }) {
  if (!result?.segmentations?.features) return <div>No segments found</div>;

  const totalArea = result.segmentations.features.reduce((sum: number, feature: any) =>
    sum + (feature.properties?.area || 0), 0);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {result.segmentations.features.length} segments identified
      </div>

      <div className="text-sm">
        Total area: {Math.round(totalArea).toLocaleString()} m²
      </div>

      <div className="text-sm">
        Average confidence: {Math.round(result.metadata?.averageConfidence * 100)}%
      </div>
    </div>
  );
}

function ClassificationDetails({ result }: { result: any }) {
  if (!result?.classifications) return <div>No classifications found</div>;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Land Cover Classification</div>

      {result.metrics && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Vegetation Coverage:</span>
            <span>{Math.round(result.metrics.vegetationCoverage * 100)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Water Coverage:</span>
            <span>{Math.round(result.metrics.waterCoverage * 100)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Development Pressure:</span>
            <span>{Math.round(result.metrics.developmentPressure * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getChainDisplayName(chainId: string): string {
  const names: { [key: string]: string } = {
    'urban-analysis': 'Urban Development',
    'environmental-monitoring': 'Environmental Assessment',
    'infrastructure-assessment': 'Infrastructure Analysis'
  };
  return names[chainId] || chainId.replace(/-/g, ' ');
}

function formatTaskName(taskId: string): string {
  return taskId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^(Initial|Building|Vegetation|Infrastructure)(\s)/, '$1 ');
}

function exportResults(result: MultiTaskResult, format: 'geojson' | 'report') {
  if (format === 'geojson') {
    // Combine all geospatial results
    const combinedFeatures = result.results.flatMap(taskResult => {
      if (taskResult.result?.detections?.features) {
        return taskResult.result.detections.features;
      }
      if (taskResult.result?.segmentations?.features) {
        return taskResult.result.segmentations.features;
      }
      return [];
    });

    const geojson = {
      type: 'FeatureCollection',
      features: combinedFeatures,
      metadata: {
        chainId: result.chainId,
        processingTime: result.processingTime,
        summary: result.summary
      }
    };

    const dataStr = JSON.stringify(geojson, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `multi-task-${result.chainId}-${Date.now()}.geojson`);
    linkElement.click();
  } else {
    // Generate and download report
    const report = generateTextReport(result);
    const dataUri = 'data:text/plain;charset=utf-8,'+ encodeURIComponent(report);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `report-${result.chainId}-${Date.now()}.txt`);
    linkElement.click();
  }
}

function generateTextReport(result: MultiTaskResult): string {
  return `
Multi-Task AI Analysis Report
============================

Analysis Type: ${getChainDisplayName(result.chainId)}
Date: ${new Date().toLocaleString()}
Processing Time: ${Math.round(result.processingTime / 1000)} seconds

Summary
-------
Total Objects Found: ${result.summary.totalObjects}
Average Confidence: ${Math.round(result.summary.averageConfidence * 100)}%
Tasks Completed: ${result.results.length}

Task Breakdown
--------------
${Object.entries(result.summary.taskBreakdown)
  .map(([task, count]) => `${formatTaskName(task)}: ${count} objects`)
  .join('\n')}

Detailed Results
---------------
${result.results.map(taskResult => `
${formatTaskName(taskResult.task)}:
- Processing Time: ${Math.round(taskResult.processingTime / 1000)}s
- Confidence: ${Math.round(taskResult.confidence * 100)}%
- Objects Found: ${getObjectCount(taskResult.result)}
`).join('\n')}

Recommendations
--------------
${result.summary.recommendations.map(rec => `• ${rec}`).join('\n')}

Generated by GeoAI.js Multi-Task Analysis
  `;
}

function getObjectCount(result: any): number {
  if (result?.detections?.features) return result.detections.features.length;
  if (result?.segmentations?.features) return result.segmentations.features.length;
  if (result?.features) return result.features.length;
  return 0;
}
```

## Step 4: Integration Example

Create `src/components/MultiTaskApp.tsx`:

```typescript
import React, { useState } from 'react';
import { MapComponent } from './Map/MapComponent';
import { MultiTaskControl } from './MultiTaskControl';
import { MultiTaskResults } from './MultiTaskResults';
import { useMultiTaskAI } from '../hooks/useMultiTaskAI';

export function MultiTaskApp() {
  const [currentPolygon, setCurrentPolygon] = useState<GeoJSON.Feature | null>(null);
  const [mapResults, setMapResults] = useState<any>(null);

  const { results } = useMultiTaskAI();

  const handlePolygonCreate = (polygon: GeoJSON.Feature) => {
    setCurrentPolygon(polygon);
  };

  const handleChainComplete = (result: any) => {
    setMapResults(result);
    // Optionally auto-visualize on map
  };

  const handleResultSelect = (result: any) => {
    setMapResults(result);
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-96 bg-gray-100 p-4 space-y-4 overflow-y-auto">
        <MultiTaskControl
          polygon={currentPolygon}
          onExecuteChain={handleChainComplete}
        />

        <MultiTaskResults
          results={results}
          onResultSelect={handleResultSelect}
        />
      </div>

      {/* Main Map */}
      <div className="flex-1">
        <MapComponent
          onPolygonCreate={handlePolygonCreate}
          aiResults={mapResults}
        />
      </div>
    </div>
  );
}
```

## 🎉 Congratulations!

You now have a sophisticated multi-task AI system that can:

- ✅ **Chain Multiple AI Models** in complex workflows
- ✅ **Conditional Task Execution** based on previous results
- ✅ **Comprehensive Result Analysis** with recommendations
- ✅ **Advanced Visualization** of multi-task results
- ✅ **Performance Optimization** with worker management
- ✅ **Export Capabilities** for GeoJSON and reports

## 🎯 Key Patterns Learned

1. **Task Chaining**: Sequential execution with result passing
2. **Conditional Workflows**: Dynamic task execution based on conditions
3. **Result Aggregation**: Combining outputs from multiple AI models
4. **Performance Management**: Optimizing multi-task execution
5. **Advanced UI Patterns**: Complex result visualization and interaction

## 🚀 Next Steps

Ready for more advanced topics?

- **[Tutorial 5: Custom Models](./05-custom-models.md)** - Integrate your own AI models
- **[Tutorial 6: Production Deployment](./06-production-deployment.md)** - Deploy at scale
- **[Performance Guide](../guides/performance-optimization.md)** - Advanced optimization

## 💡 Pro Tips

- **Start Simple**: Begin with 2-3 task chains before building complex workflows
- **Monitor Performance**: Multi-task chains can be resource-intensive
- **Cache Strategically**: Reuse results from expensive operations
- **Handle Failures Gracefully**: Build robust error handling for complex chains
- **Test Thoroughly**: Validate each task in isolation before chaining

You're now equipped to build enterprise-grade multi-task geospatial AI applications!
