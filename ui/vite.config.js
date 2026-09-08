import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // App alla radice del dominio sia in locale sia in produzione
  // (dominio custom isaquiz.trikkulab.it). Il workflow di deploy passa VITE_BASE=/.
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss()],
});
