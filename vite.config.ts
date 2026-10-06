import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { resolve } from "path";

// base "./" lets the built site be served from any path (GitHub Pages, a sub-folder, a plain static host).
export default defineConfig({
    base: "./",
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
});
