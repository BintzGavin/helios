import { defineConfig } from "vite";
import { resolve, join } from "path";
import fs from "fs";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import solidPlugin from "vite-plugin-solid";

const copyExcalidrawAssetsPlugin = () => {
  return {
    name: 'copy-excalidraw-assets',
    closeBundle: async () => {
      const src = resolve(__dirname, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts');
      const dest = resolve(__dirname, 'output/example-build/excalidraw-assets');
      if (fs.existsSync(src)) {
        await fs.promises.cp(src, dest, { recursive: true });
        console.log('Copied Excalidraw fonts to output/example-build/excalidraw-assets');
      } else {
        console.warn('Excalidraw fonts source not found at:', src);
      }
    }
  }
}

function discoverExamples() {
  const examplesDir = resolve(__dirname, "examples");
  const inputs = {};

  if (!fs.existsSync(examplesDir)) return inputs;

  const entries = fs.readdirSync(examplesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = join(examplesDir, entry.name);

      // Check for composition.html
      const compPath = join(dirPath, "composition.html");
      if (fs.existsSync(compPath)) {
        // Use structure-preserving key: examples/{dir}/composition
        inputs[`examples/${entry.name}/composition`] = compPath;
      }

      // Check for index.html (custom apps only)
      // HEURISTIC: Only include index.html for known app examples to avoid build errors with absolute paths
      // like /src/main.ts in svelte-runes-animation
      const indexPath = join(dirPath, "index.html");
      if (fs.existsSync(indexPath)) {
        if (entry.name === 'client-export-api') {
           inputs[`examples/${entry.name}/index`] = indexPath;
        }
      }
    }
  }
  return inputs;
}

export default defineConfig({
  resolve: {
    alias: {
      "@helios-project/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@helios-project/player/bridge": resolve(__dirname, "packages/player/src/bridge.ts"),
      "@helios-project/player/controllers": resolve(__dirname, "packages/player/src/controllers.ts"),
      "@helios-project/player": resolve(__dirname, "packages/player/src"),
    },
  },
  plugins: [
    react({
      exclude: /examples\/solid-(canvas|dom|threejs-canvas|captions|lottie|pixi|d3|chartjs)-animation|examples\/solid-transitions|examples\/solid-animation-helpers|examples\/solid-audio-visualization/,
    }),
    vue(),
    svelte(),
    solidPlugin({
      include: /examples\/solid-(canvas|dom|threejs-canvas|captions|lottie|pixi|d3|chartjs)-animation|examples\/solid-transitions|examples\/solid-animation-helpers|examples\/solid-audio-visualization/,
    }),
    copyExcalidrawAssetsPlugin()
  ],
  // Root of the project
  root: ".",
  base: "./",
  build: {
    outDir: "output/example-build",
    emptyOutDir: true,
    rollupOptions: {
      input: discoverExamples(),
    },
  },
});
