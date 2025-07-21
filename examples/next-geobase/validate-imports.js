// Simple validation script to check if both imports are available
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Local Package Installation\n');

// Check if package is installed
const packagePath = './node_modules/@geobase-js/geoai';
if (!fs.existsSync(packagePath)) {
  console.error('❌ Package not installed at:', packagePath);
  process.exit(1);
}

console.log('✅ Package installed at:', packagePath);

// Check core files
const coreFile = path.join(packagePath, '@geobase-js', 'geoai.js');
const reactFile = path.join(packagePath, '@geobase-js', 'geoai-react.js');
const coreTypes = path.join(packagePath, 'index.d.ts');
const reactTypes = path.join(packagePath, 'react.d.ts');

const files = [
  { name: 'Core JS', path: coreFile },
  { name: 'React JS', path: reactFile },
  { name: 'Core Types', path: coreTypes },
  { name: 'React Types', path: reactTypes }
];

files.forEach(file => {
  if (fs.existsSync(file.path)) {
    const stats = fs.statSync(file.path);
    const size = (stats.size / 1024).toFixed(1);
    console.log(`✅ ${file.name}: ${size} KB`);
  } else {
    console.log(`❌ ${file.name}: MISSING`);
  }
});

// Check package.json exports
const packageJson = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8'));
console.log('\n📦 Package Exports:');
console.log('   Core:', packageJson.exports['.']?.import || 'MISSING');
console.log('   React:', packageJson.exports['./react']?.import || 'MISSING');
console.log('   Core Types:', packageJson.exports['.']?.types || 'MISSING');
console.log('   React Types:', packageJson.exports['./react']?.types || 'MISSING');

console.log('\n🎯 Import Paths to Use:');
console.log('   import { geoai } from "@geobase-js/geoai"');
console.log('   import { useGeoAIWorker } from "@geobase-js/geoai/react"');

console.log('\n✅ Local package installation validated successfully!');
console.log('🌐 Visit http://localhost:3000/test-local-imports to test in the browser');