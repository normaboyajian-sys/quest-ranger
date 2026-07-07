// Caddy on-demand TLS "ask" endpoint.
// Caddy calls this before issuing a Let's Encrypt cert for an unknown hostname.
// 200 = allowed (domain is attached to a tester), 404 = refuse.
import { createFileRoute } from "@tanstack/react-router";

function normalizeHost(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

export const Route = createFileRoute("/api/public/caddy-ask")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("domain") ?? "";
        const host = normalizeHost(raw);
        if (!host) return new Response("bad request", { status: 400 });

        // Never issue a cert via on-demand for the panel's own host.
        const panelHost = normalizeHost(process.env.PANEL_HOST ?? "");
        if (panelHost && (host === panelHost || host.endsWith("." + panelHost))) {
          return new Response("panel host", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("tenant_domains")
          .select("id")
          .eq("hostname", host)
          .maybeSingle();
        if (!data) return new Response("not allowed", { status: 404 });

        // Mark SSL as issued (best-effort). Caddy only asks right before issuing.
        void supabaseAdmin
          .from("tenant_domains")
          .update({ ssl_status: "issued", last_checked_at: new Date().toISOString() })
          .eq("id", data.id);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
