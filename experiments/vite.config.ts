import path from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
  root: __dirname,
  resolve: { alias: { "@": __dirname } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: path.join(__dirname, "dist"), emptyOutDir: true },
});
