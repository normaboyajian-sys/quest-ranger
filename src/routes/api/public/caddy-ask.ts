// Caddy on-demand TLS "ask" endpoint.
// Caddy calls this before issuing a Let's Encrypt cert for an unknown hostname.
// 200 = allowed (domain is attached to a tester), 404 = refuse.
import { createFileRoute } from "@tanstack/react-router";

function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

function hostAliases(host: string): string[] {
  const h = normalizeHost(host);
  if (!h) return [];
  const out = [h];
  if (h.startsWith("www.")) out.push(h.slice(4));
  else out.push(`www.${h}`);
  return Array.from(new Set(out.filter(Boolean)));
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
        const aliases = hostAliases(host);
        const { data } = await supabaseAdmin
          .from("tenant_domains")
          .select("id, hostname")
          .in("hostname", aliases)
          .limit(1)
          .maybeSingle();
        if (!data) return new Response("not allowed", { status: 404 });

        // Mark SSL as issued (best-effort). Caddy only asks right before issuing.
        void supabaseAdmin
          .from("tenant_domains")
          .update({ ssl_status: "issued", last_checked_at: new Date().toISOString() })
          .in("hostname", aliases);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
