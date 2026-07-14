import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

/** Import Telegram stickers (.tgs = gzip Lottie, or plain Lottie JSON). */
function tgsPlugin(): Plugin {
  return {
    name: "vite-plugin-tgs",
    load(id) {
      if (!id.endsWith(".tgs")) return null;
      const buf = readFileSync(id);
      let json: string;
      try {
        json = gunzipSync(buf).toString("utf8");
      } catch {
        json = buf.toString("utf8");
      }
      return `export default ${json}`;
    },
  };
}

// Default to a Node server so the panel can run on an RDP/VPS.
// Override with: NITRO_PRESET=cloudflare-module
const nitroPreset = process.env.NITRO_PRESET || "node-server";

export default defineConfig({
  plugins: [
    tgsPlugin(),
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts
      server: { entry: "server" },
    }),
    nitro({ preset: nitroPreset }),
    viteReact(),
  ],
  assetsInclude: ["**/*.tgs"],
});
