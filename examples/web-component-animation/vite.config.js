import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: ".",
  base: "./",
  resolve: {
    alias: {
      "@helios-project/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
});
