import { defineConfig } from "vite";
import { resolve, join } from "path";
import { readdirSync, statSync, existsSync } from "fs";
import react from "@vitejs/plugin-react";

function getExampleInputs() {
  const examplesDir = resolve(__dirname, "examples");
  const inputs = {};

  if (existsSync(examplesDir)) {
      const dirs = readdirSync(examplesDir);
      for (const dir of dirs) {
          const fullDir = join(examplesDir, dir);
          if (statSync(fullDir).isDirectory()) {
              const compositionPath = join(fullDir, "composition.html");
              if (existsSync(compositionPath)) {
                  // We use the full relative path as the key to preserve structure
                  // or just the directory name if we want to flatten (but we don't want to flatten)
                  // Actually, to preserve structure in dist/examples/..., we rely on Vite's behavior with root: "."
                  // But input keys are usually chunk names.
                  // Let's try to map 'examples/simple-canvas-animation/composition' -> path
                  const key = `examples/${dir}/composition`;
                  inputs[key] = compositionPath;
              }
          }
      }
  }
  return inputs;
}

export default defineConfig({
  // Root of the project
  root: ".",
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@helios/core": resolve(__dirname, "packages/core/src/index.ts"),
    },
  },
  build: {
    outDir: "output/example-build",
    emptyOutDir: true,
    rollupOptions: {
      input: getExampleInputs(),
    },
  },
});
