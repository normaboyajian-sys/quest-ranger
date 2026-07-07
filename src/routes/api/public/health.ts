// Health probe. Also stamps last_seen_at for the hostname it was hit on,
// so the panel can show "last visitor" for each attached domain.
import { createFileRoute } from "@tanstack/react-router";

function normalizeHost(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = normalizeHost(new URL(request.url).host);
        if (host) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            void supabaseAdmin
              .from("tenant_domains")
              .update({ last_seen_at: new Date().toISOString() })
              .eq("hostname", host);
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
