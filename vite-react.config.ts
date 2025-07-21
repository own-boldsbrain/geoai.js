/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";
import commonjs from "vite-plugin-commonjs";
import dotenv from "dotenv";
// @ts-expect-error
import { visualizer } from "rollup-plugin-visualizer";

dotenv.config();

const getPackageName = () => {
  return packageJson.name;
};

const getPackageNameCamelCase = () => {
  try {
    return getPackageName().replace(/-./g, char => char[1].toUpperCase());
  } catch (err) {
    throw new Error("Name property in package.json is missing.");
  }
};

const reactFileName = {
  es: `${getPackageName()}-react.js`,
};

const reactFormats = Object.keys(reactFileName) as Array<
  keyof typeof reactFileName
>;

export default defineConfig(({ command }) => ({
  plugins:
    command === "build"
      ? [
          commonjs(),
          visualizer({
            filename: "stats-react.html",
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : [],
  base: "./",
  build: {
    outDir: "./build",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/react/index.ts"),
      name: `${getPackageNameCamelCase()}React`,
      formats: reactFormats,
      fileName: format => reactFileName[format],
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      external: [
        "@huggingface/transformers",
        "onnxruntime-web",
        "react",
        // "@techstark/opencv-js",
      ],
      output: {
        globals: {
          "@huggingface/transformers": "transformers",
          "onnxruntime-web": "ort",
          react: "React",
          // "@techstark/opencv-js": "cv",
        },
      },
    },
  },
  test: {
    watch: false,
    testTimeout: 1000000,
    exclude: ["**/examples/**", "**/node_modules/**"],
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "@@", replacement: path.resolve(__dirname) },
    ],
  },
}));
