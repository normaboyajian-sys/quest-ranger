// Health probe only — no DB writes (Host can be spoofed).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        return new Response("ok", {
          status: 200,
          headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
