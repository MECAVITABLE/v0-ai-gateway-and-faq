import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { forwardChat } from "./server/chatProxy";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const base = process.env.BASE_PATH ?? "/";

function chatApiPlugin(): Plugin {
  return {
    name: "miftora-chat-api",
    configureServer(server) {
      server.middlewares.use("/api/chat", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", async () => {
          let payload: unknown;
          try {
            payload = JSON.parse(raw);
          } catch {
            payload = null;
          }
          const { status, body } = await forwardChat(payload);
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["GOOGLE_API_KEY", "GEMINI_API_KEY"]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
  base,
  plugins: [react(), tailwindcss(), chatApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  };
});
