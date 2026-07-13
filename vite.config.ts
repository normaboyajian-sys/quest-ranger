import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Default to a Node server so the panel can run on an RDP/VPS behind Caddy.
// Lovable/Cloudflare builds can override with: NITRO_PRESET=cloudflare-module
const nitroPreset = process.env.NITRO_PRESET || "node-server";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: nitroPreset,
  },
});
