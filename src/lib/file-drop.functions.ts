import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isAdminUser(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

const BUCKET = "file-drop";
const TTL_MS = 5 * 60 * 1000;

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

function parseExpires(path: string): number {
  // path: drops/<expiresMs>_<uuid>_<filename>
  const m = path.match(/drops\/(\d+)_/);
  return m ? Number(m[1]) : 0;
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function cleanupExpired(): Promise<void> {
  const admin = await adminClient();
  const { data } = await admin.storage.from(BUCKET).list("drops", { limit: 1000 });
  if (!data?.length) return;
  const now = Date.now();
  const expired = data
    .map((f) => `drops/${f.name}`)
    .filter((p) => parseExpires(p) > 0 && parseExpires(p) < now);
  if (expired.length) await admin.storage.from(BUCKET).remove(expired);
}

export const uploadDropFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    if (file.size > 100 * 1024 * 1024) throw new Error("File too large (max 100MB)");
    return { file };
  })
  .handler(async ({ data, context }) => {
    const admin = await adminClient();
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    await cleanupExpired();

    const expires = Date.now() + TTL_MS;
    const uuid = crypto.randomUUID();
    const filename = safeFilename(data.file.name);
    const path = `drops/${expires}_${uuid}_${filename}`;
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: data.file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error(error.message);

    return {
      id: `${expires}/${uuid}/${filename}`,
      filename,
      size: data.file.size,
      expiresAt: expires,
      url: `/api/public/dl/${expires}/${uuid}/${encodeURIComponent(filename)}`,
    };
  });

export const deleteDropFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { id?: string };
    if (!d?.id || typeof d.id !== "string") throw new Error("Missing id");
    return { id: d.id };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const admin = await adminClient();
    const parts = data.id.split("/");
    if (parts.length !== 3) throw new Error("Bad id");
    const path = `drops/${parts[0]}_${parts[1]}_${parts[2]}`;
    await admin.storage.from(BUCKET).remove([path]);
    return { ok: true };
  });
