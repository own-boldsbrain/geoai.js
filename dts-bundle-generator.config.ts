const config = {
  compilationOptions: {
    preferredConfigPath: "./tsconfig.json",
  },
  entries: [
    {
      filePath: "./src/index.ts",
      outFile: "./build/index.d.ts",
      noCheck: true,
    },
    {
      filePath: "./src/react/index.ts",
      outFile: "./build/react.d.ts",
      noCheck: true,
    },
  ],
};

module.exports = config;
