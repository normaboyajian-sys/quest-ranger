import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dl/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = params._splat || "";
        const parts = splat.split("/");
        if (parts.length < 3) return new Response("Not found", { status: 404 });
        const expires = Number(parts[0]);
        const uuid = parts[1];
        const filename = decodeURIComponent(parts.slice(2).join("/"));
        if (!Number.isFinite(expires) || expires < Date.now()) {
          return new Response("Link expired", { status: 410 });
        }
        const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
        const path = `drops/${expires}_${uuid}_${safe}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("file-drop").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": data.type || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${safe}"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
