import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      allowedHosts: [".trycloudflare.com"],
      proxy: {
        "/api-negocio": {
          target: env.VITE_API_NEGOCIO,
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/api-negocio/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              if (req.headers.referencia) {
                proxyReq.setHeader("referencia", req.headers.referencia);
              }
            });
          },
        },
        "/api-servicios": {
          target: env.VITE_API_SERVICE,
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/api-servicios/, ""),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});