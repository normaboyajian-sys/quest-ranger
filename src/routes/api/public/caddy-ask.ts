// Caddy on-demand TLS "ask" endpoint.
// Caddy calls this before issuing a Let's Encrypt cert for an unknown hostname.
// 200 = allowed (domain is attached to a tester), 404 = refuse.
import { createFileRoute } from "@tanstack/react-router";

function normalizeHost(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export const Route = createFileRoute("/api/public/caddy-ask")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Optional shared secret between Caddy and the panel.
        const askSecret = (process.env.CADDY_ASK_SECRET ?? "").trim();
        if (askSecret) {
          const got =
            request.headers.get("x-caddy-ask-secret") ??
            new URL(request.url).searchParams.get("secret") ??
            "";
          if (!timingSafeEqual(got, askSecret)) {
            return new Response("forbidden", { status: 403 });
          }
        }

        const url = new URL(request.url);
        const raw = url.searchParams.get("domain") ?? "";
        const host = normalizeHost(raw);
        if (!host || host.length > 253) return new Response("bad request", { status: 400 });

        const panelHost = normalizeHost(process.env.PANEL_HOST || "ilovemolly.com");
        if (panelHost && (host === panelHost || host.endsWith("." + panelHost))) {
          return new Response("not allowed", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("tenant_domains")
          .select("id")
          .eq("hostname", host)
          .maybeSingle();
        if (!data) return new Response("not allowed", { status: 404 });

        void supabaseAdmin
          .from("tenant_domains")
          .update({ ssl_status: "issued", last_checked_at: new Date().toISOString() })
          .eq("id", data.id);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
