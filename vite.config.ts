import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "Truco Intelligence",
        short_name: "Truco",
        description: "Contador e inteligência para partidas de truco.",
        theme_color: "#173b2b",
        background_color: "#f5f6f2",
        display: "standalone",
        start_url: "/",
        icons: []
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "index.html"
      }
    })
  ],
  test: {
    environment: "node"
  }
});
