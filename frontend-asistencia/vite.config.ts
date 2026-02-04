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

  build: {
    // si aún sale warning, puedes subirlo (ej: 1200 o 1500)
    chunkSizeWarningLimit: 900,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core
          react: ["react", "react-dom", "react-router-dom"],

          // UI/anim
          motion: ["framer-motion"],
          icons: ["lucide-react"],

          // Calendario y charts (pesados)
          calendar: [
            "@fullcalendar/core",
            "@fullcalendar/react",
            "@fullcalendar/timegrid",
            "@fullcalendar/interaction",
          ],
          charts: ["recharts"],

          // Networking
          axios: ["axios"],
        },
      },
    },
  },
});
