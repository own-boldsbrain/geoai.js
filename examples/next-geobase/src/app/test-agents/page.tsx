"use client";

import React from 'react';
import { useGeoAIAgent, useQuickAgent } from '@geobase-js/geoai/react';

export default function TestAgentsPage() {
  const agentHook = useGeoAIAgent();
  
  const handleInitialize = () => {
    agentHook.initializeAgent('site-analysis');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">🤖 Agent System Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Agent Status</h2>
          <p>Agent: {agentHook.agent?.name || 'None'}</p>
          <p>Is Analyzing: {agentHook.isAnalyzing ? 'Yes' : 'No'}</p>
          <p>Error: {agentHook.error || 'None'}</p>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={handleInitialize}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Initialize Site Analysis Agent
          </button>
          
          <button
            onClick={agentHook.reset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset
          </button>
        </div>
        
        {agentHook.result && (
          <div className="mt-6 p-4 border rounded">
            <h3 className="font-semibold">Analysis Result</h3>
            <p>Summary: {agentHook.result.summary}</p>
            <p>Confidence: {Math.round(agentHook.result.confidence * 100)}%</p>
            <p>Execution Time: {agentHook.result.executionTime}ms</p>
          </div>
        )}
      </div>
    </div>
  );
}