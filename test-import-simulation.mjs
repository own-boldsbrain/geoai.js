#!/usr/bin/env node

/**
 * Simulates how users would import the packages
 * This tests the actual built bundles, not the source files
 */

import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🧪 Testing React Import Functionality\n");

// Check if build exists
if (!existsSync("build/dist")) {
  console.error('❌ Build directory not found. Run "pnpm build" first.');
  process.exit(1);
}

// Test 1: Check build files exist
console.log("1️⃣ Testing build output files...");
const requiredFiles = [
  "build/dist/@geobase-js/geoai.js",
  "build/dist/@geobase-js/geoai-react.js",
  "build/dist/index.d.ts",
  "build/dist/react.d.ts",
  "build/package.json",
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error("\n❌ Some required build files are missing.");
  process.exit(1);
}

// Test 2: Simulate core package import
console.log("\n2️⃣ Testing core package import...");
try {
  // Simulate importing from the built package
  const corePackagePath = path.resolve("build/dist/@geobase-js/geoai.js");
  const { geoai } = await import(`file://${corePackagePath}`);

  console.log("✅ Core package imported successfully");
  console.log(`✅ geoai.tasks(): ${geoai.tasks().length} tasks available`);
  console.log(`✅ geoai.models(): ${geoai.models().length} models available`);
} catch (error) {
  console.error("❌ Core package import failed:", error.message);
  process.exit(1);
}

// Test 3: Simulate React package import (without React runtime)
console.log("\n3️⃣ Testing React package structure...");
try {
  const reactPackagePath = path.resolve(
    "build/dist/@geobase-js/geoai-react.js"
  );
  const reactModule = await import(`file://${reactPackagePath}`);

  console.log("✅ React package imported successfully");

  // Check if expected exports are present
  const expectedExports = ["useGeoAIWorker", "useOptimizedGeoAI"];
  for (const exportName of expectedExports) {
    if (typeof reactModule[exportName] === "function") {
      console.log(`✅ ${exportName} function exported`);
    } else {
      console.log(`❌ ${exportName} missing or not a function`);
    }
  }
} catch (error) {
  console.error("❌ React package import failed:", error.message);
  process.exit(1);
}

// Test 4: Test package.json configuration
console.log("\n4️⃣ Testing package.json configuration...");
try {
  const { default: packageJson } = await import("./build/package.json", {
    assert: { type: "json" },
  });

  // Check exports configuration
  if (
    packageJson.exports &&
    packageJson.exports["."] &&
    packageJson.exports["./react"]
  ) {
    console.log("✅ Package exports configured correctly");
    console.log(`   Core: ${packageJson.exports["."].import}`);
    console.log(`   React: ${packageJson.exports["./react"].import}`);
  } else {
    console.log("❌ Package exports not configured correctly");
  }

  // Check peer dependencies
  if (packageJson.peerDependencies && packageJson.peerDependencies.react) {
    console.log("✅ React peer dependency configured");
  } else {
    console.log("❌ React peer dependency missing");
  }

  if (
    packageJson.peerDependenciesMeta &&
    packageJson.peerDependenciesMeta.react?.optional
  ) {
    console.log("✅ React peer dependency is optional");
  } else {
    console.log("❌ React peer dependency should be optional");
  }
} catch (error) {
  console.error("❌ Package.json test failed:", error.message);
  process.exit(1);
}

// Test 5: Test TypeScript declarations
console.log("\n5️⃣ Testing TypeScript declarations...");
try {
  const fs = await import("fs");

  const coreTypes = fs.readFileSync("build/dist/index.d.ts", "utf-8");
  const reactTypes = fs.readFileSync("build/dist/react.d.ts", "utf-8");

  if (coreTypes.includes("geoai") && coreTypes.includes("pipeline")) {
    console.log("✅ Core TypeScript declarations look correct");
  } else {
    console.log("❌ Core TypeScript declarations missing expected exports");
  }

  if (reactTypes.includes("useGeoAIWorker") && reactTypes.includes("React")) {
    console.log("✅ React TypeScript declarations look correct");
  } else {
    console.log("❌ React TypeScript declarations missing expected exports");
  }
} catch (error) {
  console.error("❌ TypeScript declarations test failed:", error.message);
}

console.log("\n🎉 All import tests completed successfully!");
console.log("\n📋 Usage Summary:");
console.log('   Core: import { geoai } from "@geobase-js/geoai"');
console.log(
  '   React: import { useGeoAIWorker } from "@geobase-js/geoai/react"'
);
