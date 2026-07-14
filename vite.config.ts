import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Default to a Node server so the panel can run on an RDP/VPS.
// Override with: NITRO_PRESET=cloudflare-module
const nitroPreset = process.env.NITRO_PRESET || "node-server";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts
      server: { entry: "server" },
    }),
    nitro({ preset: nitroPreset }),
    viteReact(),
  ],
});
