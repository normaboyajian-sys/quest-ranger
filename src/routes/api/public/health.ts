// Health probe. Also stamps last_seen_at for the hostname it was hit on,
// so the panel can show "last visitor" for each attached domain.
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

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Prefer Host header (visitor domain) over the request URL host.
        const headerHost = request.headers.get("host") ?? "";
        const host = normalizeHost(headerHost || new URL(request.url).host);
        if (host) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            void supabaseAdmin
              .from("tenant_domains")
              .update({ last_seen_at: new Date().toISOString() })
              .in("hostname", hostAliases(host));
          } catch { /* best-effort */ }
        }
        return new Response("ok", {
          status: 200,
          headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
