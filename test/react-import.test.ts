import { describe, it, expect, beforeAll } from "vitest";
import { existsSync } from "fs";
import path from "path";

describe("React Package Import Tests", () => {
  beforeAll(() => {
    // Ensure build exists
    if (!existsSync("build/dist")) {
      throw new Error("Build directory not found. Run 'pnpm build' first.");
    }
  });

  describe("Build Output Validation", () => {
    it("should have core package file", () => {
      const coreFile = path.resolve("build/dist/@geobase-js/geoai.js");
      expect(existsSync(coreFile)).toBe(true);
    });

    it("should have React package file", () => {
      const reactFile = path.resolve("build/dist/@geobase-js/geoai-react.js");
      expect(existsSync(reactFile)).toBe(true);
    });

    it("should have core type declarations", () => {
      const coreTypes = path.resolve("build/dist/index.d.ts");
      expect(existsSync(coreTypes)).toBe(true);
    });

    it("should have React type declarations", () => {
      const reactTypes = path.resolve("build/dist/react.d.ts");
      expect(existsSync(reactTypes)).toBe(true);
    });

    it("should have package.json in build", () => {
      const packageJson = path.resolve("build/package.json");
      expect(existsSync(packageJson)).toBe(true);
    });
  });

  describe("Package.json Export Configuration", () => {
    it("should have correct export paths", async () => {
      const packageJson = await import("../package.json");

      expect(packageJson.exports["."]).toBeDefined();
      expect(packageJson.exports["."]).toEqual({
        import: "./build/dist/@geobase-js/geoai.js",
        types: "./build/dist/index.d.ts",
      });

      expect(packageJson.exports["./react"]).toBeDefined();
      expect(packageJson.exports["./react"]).toEqual({
        import: "./build/dist/@geobase-js/geoai-react.js",
        types: "./build/dist/react.d.ts",
      });
    });

    it("should have React as optional peer dependency", async () => {
      const packageJson = await import("../package.json");

      expect(packageJson.peerDependencies.react).toBeDefined();
      expect(packageJson.peerDependenciesMeta?.react?.optional).toBe(true);
    });
  });

  describe("Source Code Structure", () => {
    it("should export React hooks from src/react/index.ts", async () => {
      const reactIndex = await import("../src/react/index.ts");

      expect(reactIndex.useGeoAIWorker).toBeDefined();
      expect(reactIndex.useOptimizedGeoAI).toBeDefined();
      expect(typeof reactIndex.useGeoAIWorker).toBe("function");
      expect(typeof reactIndex.useOptimizedGeoAI).toBe("function");
    });

    it("should export core API from src/index.ts", async () => {
      const coreIndex = await import("../src/index.ts");

      expect(coreIndex.geoai).toBeDefined();
      expect(coreIndex.geoai.pipeline).toBeDefined();
      expect(coreIndex.geoai.tasks).toBeDefined();
      expect(coreIndex.geoai.models).toBeDefined();
    });
  });
});
