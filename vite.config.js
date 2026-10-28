import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "https://aivista.co.in/Garments_ERP/" } },
  build: { outDir: "dist", chunkSizeWarningLimit: 700 },
});
