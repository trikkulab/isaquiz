import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // In locale la app sta alla radice ("/"); su GitHub Pages come project page
  // vive sotto "/isaquiz/". Il workflow di deploy passa VITE_BASE=/isaquiz/.
  // Quando il dominio custom sarà attivo: VITE_BASE=/ (o rimuovere la variabile).
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss()],
});
