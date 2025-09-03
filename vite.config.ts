import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const AWS_DEV = "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: AWS_DEV,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "/dev"),
      },
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
