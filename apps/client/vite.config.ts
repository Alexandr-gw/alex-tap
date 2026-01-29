// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

const BE_PORT = process.env.BE_PORT ?? "3001"; // set your real BE port here

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 3000, // FE port
        proxy: {
            "/api": {
                target: `http://localhost:${BE_PORT}`,
                changeOrigin: true,
                secure: false,
                // FE "/api/me" -> BE "/me"
                rewrite: (p) => p.replace(/^\/api/, ""),
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
});
