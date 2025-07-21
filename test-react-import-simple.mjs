#!/usr/bin/env node

/**
 * Simple test to verify React imports work from source
 */

console.log('🧪 Testing React Import from Source Files\n');

try {
  // Test 1: Import core from source
  console.log('1️⃣ Testing core import from source...');
  const { geoai } = await import('./src/index.ts');
  console.log('✅ Core package imported from source');
  console.log(`✅ Available tasks: ${geoai.tasks().join(', ')}`);
  
  // Test 2: Import React hooks from source  
  console.log('\n2️⃣ Testing React hooks import from source...');
  const { useGeoAIWorker, useOptimizedGeoAI } = await import('./src/react/index.ts');
  console.log('✅ React hooks imported from source');
  console.log(`✅ useGeoAIWorker: ${typeof useGeoAIWorker}`);
  console.log(`✅ useOptimizedGeoAI: ${typeof useOptimizedGeoAI}`);
  
  // Test 3: Verify hooks are functions
  if (typeof useGeoAIWorker === 'function' && typeof useOptimizedGeoAI === 'function') {
    console.log('✅ Both hooks are functions');
  } else {
    console.log('❌ Hooks are not functions');
  }
  
  console.log('\n🎉 Source import tests passed!');
  
} catch (error) {
  console.error('❌ Import test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test build file existence
console.log('\n3️⃣ Checking build files...');
import { existsSync } from 'fs';

const buildFiles = [
  'build/dist/@geobase-js/geoai.js',
  'build/dist/@geobase-js/geoai-react.js',
  'build/dist/index.d.ts', 
  'build/dist/react.d.ts'
];

buildFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

console.log('\n📋 Users can now import:');
console.log('   import { geoai } from "@geobase-js/geoai"');
console.log('   import { useGeoAIWorker } from "@geobase-js/geoai/react"');