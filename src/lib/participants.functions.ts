// Public (unauthenticated) server functions used by the visitor heartbeat.
// These run as the service role inside the handler so RLS on `participants`
// can be locked down to admins only. Input is validated with Zod and the
// participant `id` shape is enforced server-side.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ID_RE = /^p_[a-z0-9]{8,24}$/;
const URL_RE = /^\/[a-z][a-z0-9_-]{0,30}\/[a-z][a-z0-9_-]{0,40}$/;

const TouchInput = z.object({
  id: z.string().regex(ID_RE),
  currentUrl: z.string().refine((u) => u === "/" || URL_RE.test(u)),
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
      if (data.geo.host !== undefined) geoUpdate.host = data.geo.host ?? null;
    }
    const { data: existing, error } = await supabaseAdmin
      .from("participants")
      .update({ current_url: data.currentUrl, online: true, last_seen: now, ...geoUpdate })
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) {
      const { error: insertError } = await supabaseAdmin.from("participants").insert({
        id: data.id,
        current_url: data.currentUrl,
        online: true,
        last_seen: now,
        ...geoUpdate,
      });
      if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
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
