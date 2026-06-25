import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function syntheticEmail(username: string) {
  return `${username.toLowerCase().trim()}@molly.local`;
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, subscription_until, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return (profiles ?? []).map((p) => ({
      id: p.id,
      username: p.username,
      subscription_until: p.subscription_until,
      created_at: p.created_at,
      roles: roleMap.get(p.id) ?? [],
    }));
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { username: string; password: string; isAdmin?: boolean }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const username = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,32}$/.test(username))
      throw new Error("Username must be 2-32 chars, a-z 0-9 _ -");
    if (!data.password || data.password.length < 6)
      throw new Error("Password must be at least 6 characters");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    if (data.isAdmin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    }
    return { id: uid, username };
  });

export const adjustSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; days: number }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof, error } = await supabaseAdmin
      .from("profiles")
      .select("subscription_until")
      .eq("id", data.userId)
      .single();
    if (error) throw new Error(error.message);
    const now = Date.now();
    const base = prof?.subscription_until
      ? Math.max(new Date(prof.subscription_until).getTime(), now)
      : now;
    const next = new Date(base + data.days * 24 * 60 * 60 * 1000).toISOString();
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ subscription_until: next })
      .eq("id", data.userId);
    if (upErr) throw new Error(upErr.message);
    return { subscription_until: next };
  });

export const clearSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ subscription_until: null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("username, subscription_until")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return {
      userId: context.userId,
      username: prof?.username ?? null,
      subscription_until: prof?.subscription_until ?? null,
      isAdmin: !!isAdmin,
    };
  });

// Single-session enforcement: stamp the current login as the active session
// for this account. Any older session will see the change via realtime and
// sign itself out.
export const claimSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data, context }) => {
    if (!data.sessionId || data.sessionId.length > 64)
      throw new Error("Invalid session id");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ active_session_id: data.sessionId })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Read the currently-claimed session id for the signed-in user (used by the
// in-app session watcher to decide whether to kick this device).
export const getMyActiveSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("active_session_id")
      .eq("id", context.userId)
      .maybeSingle();
    return { activeSessionId: (data?.active_session_id as string | null) ?? null };
  });


// Setup: create the very first admin (only allowed when zero admins exist).
export const initialAdminSetup = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,32}$/.test(username))
      throw new Error("Username must be 2-32 chars, a-z 0-9 _ -");
    if (!data.password || data.password.length < 6)
      throw new Error("Password must be at least 6 characters");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) throw new Error("Admin already exists");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    return { ok: true };
  });

export const hasAnyAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  return { hasAdmin: (count ?? 0) > 0 };
});

export function usernameToEmail(username: string) {
  return syntheticEmail(username);
}
