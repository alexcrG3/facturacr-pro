import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "manifest.webmanifest",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api/hacienda/idp": {
        target: "https://idp.comprobanteselectronicos.go.cr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hacienda\/idp/, ""),
        secure: false,
      },
      "/api/hacienda/api-stag": {
        target: "https://api-sandbox.comprobanteselectronicos.go.cr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hacienda\/api-stag/, ""),
        secure: false,
      },
      "/api/hacienda/api-prod": {
        target: "https://api.comprobanteselectronicos.go.cr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hacienda\/api-prod/, ""),
        secure: false,
      },
    },
  },
});
