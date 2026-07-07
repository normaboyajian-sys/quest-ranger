// Tenant/domain and per-tester settings server functions.
// - resolveTenantByHost: public (unauthenticated) — used by participant pages
//   to look up which tester "owns" this hostname and what seed phrase to show.
// - listMyDomains / addDomain / removeDomain: for the signed-in owner (tester
//   or admin manages their own; admin sees all through listAllDomains).
// - getMySeedPhrase / setMySeedPhrase: per-tester seed phrase (stored in
//   tester_settings).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const HOST_RE = /^[a-z0-9][a-z0-9.-]{1,253}$/;

function normalizeHost(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

async function isAdmin(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function isTesterOrAdmin(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "tester"]);
  return (data ?? []).length > 0;
}

// PUBLIC — visitor page uses this. Returns owner + seed phrase.
export const resolveTenantByHost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ host: z.string().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const host = normalizeHost(data.host);
    if (!host) return { ownerId: null, seedPhrase: "" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dom } = await supabaseAdmin
      .from("tenant_domains")
      .select("owner_id")
      .eq("hostname", host)
      .maybeSingle();
    if (!dom) return { ownerId: null, seedPhrase: "" };
    const { data: settings } = await supabaseAdmin
      .from("tester_settings")
      .select("seed_phrase")
      .eq("owner_id", dom.owner_id)
      .maybeSingle();
    return { ownerId: dom.owner_id as string, seedPhrase: (settings?.seed_phrase as string) ?? "" };
  });

export const listMyDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = await isAdmin(context.userId);
    let query = supabaseAdmin
      .from("tenant_domains")
      .select("id, hostname, owner_id, created_at, dns_status, ssl_status, last_checked_at, last_seen_at")
      .order("created_at", { ascending: true });
    if (!admin) query = query.eq("owner_id", context.userId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ hostname: z.string().min(3).max(255), ownerId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const host = normalizeHost(data.hostname);
    if (!HOST_RE.test(host)) throw new Error("Invalid hostname");
    const admin = await isAdmin(context.userId);
    const owner = admin && data.ownerId ? data.ownerId : context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_domains")
      .insert({ hostname: host, owner_id: owner });
    if (error) {
      if (error.code === "23505") throw new Error("That domain is already attached (possibly to another tester)");
      throw new Error(error.message);
    }
    // Backfill owner_id for any existing participants already sitting on this host.
    await supabaseAdmin
      .from("participants")
      .update({ owner_id: owner })
      .eq("host", host)
      .is("owner_id", null);
    return { ok: true as const, hostname: host };
  });

export const removeDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const admin = await isAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("tenant_domains").delete().eq("id", data.id);
    if (!admin) q = q.eq("owner_id", context.userId);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getMySeedPhrase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("tester_settings")
      .select("seed_phrase")
      .eq("owner_id", context.userId)
      .maybeSingle();
    return { seedPhrase: (data?.seed_phrase as string) ?? "" };
  });

export const setMySeedPhrase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ seedPhrase: z.string().max(2048) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tester_settings")
      .upsert({ owner_id: context.userId, seed_phrase: data.seedPhrase }, { onConflict: "owner_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Admin-only: list every domain grouped with owner username for the admin panel.
export const listAllDomainsWithOwners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: doms, error }, { data: profs }] = await Promise.all([
      supabaseAdmin.from("tenant_domains").select("id, hostname, owner_id, created_at").order("created_at"),
      supabaseAdmin.from("profiles").select("id, username"),
    ]);
    if (error) throw new Error(error.message);
    const nameById = new Map<string, string>((profs ?? []).map((p) => [p.id as string, (p.username as string) ?? "?"]));
    return (doms ?? []).map((d) => ({
      id: d.id as string,
      hostname: d.hostname as string,
      owner_id: d.owner_id as string,
      owner_username: nameById.get(d.owner_id as string) ?? "?",
      created_at: d.created_at as string,
    }));
  });

// Public — reads env only, no secrets. Used by the "Add domain" dialog.
export const getServerConnectionInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    return {
      ip: process.env.SERVER_PUBLIC_IP ?? "",
      panelHost: process.env.PANEL_HOST ?? "",
    };
  });

// Verifies (a) the hostname's A records point at SERVER_PUBLIC_IP and
// (b) https://<host>/api/public/health returns 200 (proves Caddy has a cert).
export const checkDomainStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const admin = await isAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("tenant_domains").select("id, hostname, owner_id").eq("id", data.id);
    if (!admin) q = q.eq("owner_id", context.userId);
    const { data: row } = await q.maybeSingle();
    if (!row) throw new Error("Not found");
    const host = row.hostname as string;
    const expectIp = (process.env.SERVER_PUBLIC_IP ?? "").trim();

    // DNS check via Cloudflare DoH (works in Worker + Node runtimes).
    let dnsStatus: "ok" | "mismatch" | "pending" = "pending";
    let resolvedIps: string[] = [];
    try {
      const doh = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      });
      const j = (await doh.json()) as { Answer?: Array<{ type: number; data: string }> };
      resolvedIps = (j.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
      if (resolvedIps.length === 0) dnsStatus = "pending";
      else if (!expectIp) dnsStatus = "ok"; // no IP configured; presume ok if resolves
      else dnsStatus = resolvedIps.includes(expectIp) ? "ok" : "mismatch";
    } catch {
      dnsStatus = "pending";
    }

    // SSL / live check.
    let sslStatus: "issued" | "pending" | "failed" = "pending";
    try {
      const probe = await fetch(`https://${host}/api/public/health`, {
        signal: AbortSignal.timeout(6000),
      });
      if (probe.ok) sslStatus = "issued";
      else sslStatus = "failed";
    } catch {
      sslStatus = "pending";
    }

    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("tenant_domains")
      .update({ dns_status: dnsStatus, ssl_status: sslStatus, last_checked_at: nowIso })
      .eq("id", data.id);

    return {
      dns_status: dnsStatus,
      ssl_status: sslStatus,
      resolved_ips: resolvedIps,
      expected_ip: expectIp,
      last_checked_at: nowIso,
    };
  });

