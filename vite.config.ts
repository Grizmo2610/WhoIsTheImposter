import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.webp", "assets/*.png"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{html,js,css,json,png,webp,svg}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
