import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";

describe("React Build Package Tests", () => {
  beforeAll(() => {
    if (!existsSync("build/dist")) {
      throw new Error("Build directory not found. Run 'pnpm build' first.");
    }
  });

  describe("Package Structure", () => {
    it("should have all required build files", () => {
      const requiredFiles = [
        "build/dist/@geobase-js/geoai.js",
        "build/dist/@geobase-js/geoai-react.js",
        "build/dist/index.d.ts",
        "build/dist/react.d.ts",
        "build/package.json",
      ];

      requiredFiles.forEach(file => {
        expect(existsSync(file)).toBe(true);
      });
    });

    it("should have React worker in assets", () => {
      // Check if worker file exists in assets
      const assetsDir = "build/dist/assets";
      if (existsSync(assetsDir)) {
        const files = require("fs").readdirSync(assetsDir);
        const workerFile = files.find(
          (f: string) => f.includes("worker") && f.endsWith(".js")
        );
        expect(workerFile).toBeDefined();
      }
    });
  });

  describe("TypeScript Declarations", () => {
    it("should have valid core type declarations", () => {
      const coreTypes = readFileSync("build/dist/index.d.ts", "utf-8");

      // Should export main geoai API
      expect(coreTypes).toContain("geoai");
      expect(coreTypes).toContain("pipeline");

      // Should export types
      expect(coreTypes).toContain("ProviderParams");
    });

    it("should have valid React type declarations", () => {
      const reactTypes = readFileSync("build/dist/react.d.ts", "utf-8");

      // Should export React hooks
      expect(reactTypes).toContain("useGeoAIWorker");
      expect(reactTypes).toContain("useOptimizedGeoAI");

      // Should include React-specific types
      expect(reactTypes).toContain("UseGeoAIWorkerReturn");
      expect(reactTypes).toContain("InitConfig");
    });

    it("should have proper hook function declarations", () => {
      const reactTypes = readFileSync("build/dist/react.d.ts", "utf-8");

      // Should declare functions, not just types
      expect(reactTypes).toContain("declare function useGeoAIWorker");
      expect(reactTypes).toContain("declare function useOptimizedGeoAI");
    });
  });

  describe("Bundle Content Validation", () => {
    it("should have React bundle with hooks", () => {
      const reactBundle = readFileSync(
        "build/dist/@geobase-js/geoai-react.js",
        "utf-8"
      );

      // Should contain React hook patterns
      expect(reactBundle).toMatch(/useState|useEffect|useCallback/);

      // Should export hooks
      expect(reactBundle).toContain("useGeoAIWorker");
      expect(reactBundle).toContain("useOptimizedGeoAI");
    });

    it("should have core bundle without React dependencies", () => {
      const coreBundle = readFileSync(
        "build/dist/@geobase-js/geoai.js",
        "utf-8"
      );

      // Should not contain React hooks
      expect(coreBundle).not.toMatch(/useState|useEffect|useCallback/);

      // Should contain core geoai functionality
      expect(coreBundle).toContain("geoai");
      expect(coreBundle).toContain("pipeline");
    });

    it("should have external dependencies properly configured", () => {
      const coreBundle = readFileSync(
        "build/dist/@geobase-js/geoai.js",
        "utf-8"
      );
      const reactBundle = readFileSync(
        "build/dist/@geobase-js/geoai-react.js",
        "utf-8"
      );

      // Should import from external dependencies, not bundle them
      expect(coreBundle).toMatch(/@huggingface\/transformers/);
      expect(coreBundle).toMatch(/onnxruntime-web/);

      // React bundle should import React as external
      expect(reactBundle).toMatch(/from\s+["']react["']/);
    });
  });

  describe("Package Configuration", () => {
    it("should have correct exports in built package.json", () => {
      const packagePath = path.resolve("build/package.json");
      const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));

      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports["."]).toEqual({
        import: "./build/dist/@geobase-js/geoai.js",
        types: "./build/dist/index.d.ts",
      });
      expect(packageJson.exports["./react"]).toEqual({
        import: "./build/dist/@geobase-js/geoai-react.js",
        types: "./build/dist/react.d.ts",
      });
    });

    it("should have React as optional peer dependency", () => {
      const packagePath = path.resolve("build/package.json");
      const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));

      expect(packageJson.peerDependencies.react).toBeDefined();
      expect(packageJson.peerDependenciesMeta?.react?.optional).toBe(true);
    });
  });
});
