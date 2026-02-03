import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    allowedHosts: ["eloquent-recreation-production.up.railway.app"],
  },
  preview: {
    allowedHosts: ["eloquent-recreation-production.up.railway.app"],
  },
});
