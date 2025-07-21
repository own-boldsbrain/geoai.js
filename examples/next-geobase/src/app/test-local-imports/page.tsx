'use client';

import { useEffect, useState } from 'react';

// Test both imports
import { geoai } from '@geobase-js/geoai';
import { useGeoAIWorker } from '@geobase-js/geoai/react';

export default function TestLocalImports() {
  const [importStatus, setImportStatus] = useState<{
    core: boolean;
    react: boolean;
    coreData: any;
    reactData: any;
    error?: string;
  }>({
    core: false,
    react: false,
    coreData: null,
    reactData: null
  });

  const reactHook = useGeoAIWorker();

  useEffect(() => {
    try {
      // Test core API
      const tasks = geoai.tasks();
      const models = geoai.models();
      
      setImportStatus(prev => ({
        ...prev,
        core: true,
        coreData: {
          tasksCount: tasks.length,
          modelsCount: models.length,
          firstTask: tasks[0],
          apiMethods: Object.keys(geoai)
        }
      }));

      // Test React hook
      setImportStatus(prev => ({
        ...prev,
        react: true,
        reactData: {
          isInitialized: reactHook.isInitialized,
          hasError: !!reactHook.error,
          methods: Object.keys(reactHook)
        }
      }));

      console.log('✅ Both imports successful!');
      console.log('Core API:', { tasks: tasks.length, models: models.length });
      console.log('React Hook:', Object.keys(reactHook));

    } catch (error) {
      console.error('❌ Import failed:', error);
      setImportStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }, [reactHook]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Local Package Import Test</h1>
      
      {importStatus.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {importStatus.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Package Test */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className={`mr-2 ${importStatus.core ? 'text-green-500' : 'text-gray-400'}`}>
              {importStatus.core ? '✅' : '⏳'}
            </span>
            Core Package
          </h2>
          
          <div className="text-sm text-gray-600 mb-4">
            <code className="bg-gray-100 px-2 py-1 rounded">
              import &#123; geoai &#125; from "@geobase-js/geoai"
            </code>
          </div>

          {importStatus.core && importStatus.coreData && (
            <div className="space-y-2 text-sm">
              <div><strong>Tasks:</strong> {importStatus.coreData.tasksCount}</div>
              <div><strong>Models:</strong> {importStatus.coreData.modelsCount}</div>
              <div><strong>First Task:</strong> {importStatus.coreData.firstTask}</div>
              <div><strong>API Methods:</strong> {importStatus.coreData.apiMethods.join(', ')}</div>
            </div>
          )}
        </div>

        {/* React Package Test */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className={`mr-2 ${importStatus.react ? 'text-green-500' : 'text-gray-400'}`}>
              {importStatus.react ? '✅' : '⏳'}
            </span>
            React Package
          </h2>
          
          <div className="text-sm text-gray-600 mb-4">
            <code className="bg-gray-100 px-2 py-1 rounded">
              import &#123; useGeoAIWorker &#125; from "@geobase-js/geoai/react"
            </code>
          </div>

          {importStatus.react && importStatus.reactData && (
            <div className="space-y-2 text-sm">
              <div><strong>Is Initialized:</strong> {String(importStatus.reactData.isInitialized)}</div>
              <div><strong>Has Error:</strong> {String(importStatus.reactData.hasError)}</div>
              <div><strong>Hook Methods:</strong> {importStatus.reactData.methods.join(', ')}</div>
              <div><strong>Error:</strong> {reactHook.error || 'None'}</div>
            </div>
          )}
        </div>
      </div>

      {importStatus.core && importStatus.react && (
        <div className="mt-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>🎉 Success!</strong> Both core and React packages imported successfully. 
          The local package build is working correctly.
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">How this works:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>The package is installed from <code>file:../../build</code></li>
          <li>Core package provides AI pipeline functionality</li>
          <li>React package provides hooks for Web Worker management</li>
          <li>Both packages share the same build but have separate entry points</li>
        </ul>
      </div>
    </div>
  );
}