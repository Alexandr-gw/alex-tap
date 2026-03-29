// vite.config.ts
import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import {keycloakify} from "keycloakify/vite-plugin";

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), "");

    const SERVER_PORT = env.API_PORT || "5000"; // backend port

    return {
        plugins: [react(), tailwindcss(), keycloakify({
            themeName: "my-theme", accountThemeImplementation: "none"
        })],
        server: {
            port: 3000, // FE port
            proxy: {
                "/server": {
                    target: `http://localhost:${SERVER_PORT}`,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (p) => p.replace(/^\/server/, ""),
                },
            },
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "src"),
            },
        },
    };
});
