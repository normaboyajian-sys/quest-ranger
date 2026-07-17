import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getParticipantSelf,
  markParticipantOfflineSelf,
  touchParticipantSelf,
  listParticipantsForCaller,
} from "@/lib/participants.functions";

export type ParticipantGeo = {
  ip?: string | null;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  userAgent?: string | null;
  host?: string | null;
};

export type ParticipantRecord = {
  id: string;
  currentUrl: string;
  assignedUrl: string | null;
  approved: boolean;
  online: boolean;
  joinedAt: number;
  lastSeen: number;
  ip: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  userAgent: string | null;
  host: string | null;
  ownerId: string | null;
};

type ParticipantRow = {
  id: string;
  current_url: string;
  assigned_url: string | null;
  approved: boolean;
  online: boolean;
  joined_at: string;
  last_seen: string;
  ip?: string | null;
  country?: string | null;
  country_code?: string | null;
  region?: string | null;
  city?: string | null;
  user_agent?: string | null;
  host?: string | null;
  owner_id?: string | null;
};

function toRecord(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    currentUrl: row.current_url,
    assignedUrl: row.assigned_url,
    approved: row.approved,
    online: row.online,
    joinedAt: new Date(row.joined_at).getTime(),
    lastSeen: new Date(row.last_seen).getTime(),
    ip: row.ip ?? null,
    country: row.country ?? null,
    countryCode: row.country_code ?? null,
    region: row.region ?? null,
    city: row.city ?? null,
    userAgent: row.user_agent ?? null,
    host: row.host ?? null,
    ownerId: row.owner_id ?? null,
  };
}

export async function loadParticipants(): Promise<ParticipantRecord[]> {
  // Tenant-scoped by the server function: admins get everyone,
  // testers only get participants on their own domains.
  const rows = await listParticipantsForCaller();
  return (rows ?? []).map((row) => toRecord(row as ParticipantRow));
}

export async function loadParticipant(id: string): Promise<ParticipantRecord | null> {
  // Visitor-safe read via server function (returns only non-sensitive fields).
  const row = await getParticipantSelf({ data: { id } });
  return row ? toRecord(row as ParticipantRow) : null;
}

export async function touchParticipant(
  id: string,
  currentUrl: string,
  geo?: ParticipantGeo,
): Promise<void> {
  // Visitor heartbeat goes through a server function — anon clients no
  // longer have direct write access to participants under the new RLS.
  await touchParticipantSelf({
    data: {
      id,
      currentUrl,
      geo: geo
        ? {
            ip: geo.ip ?? null,
            country: geo.country ?? null,
            countryCode: geo.countryCode ?? null,
            region: geo.region ?? null,
            city: geo.city ?? null,
            userAgent: geo.userAgent ?? null,
            host: geo.host ?? null,
          }
        : undefined,
    },
  });
}


export async function markParticipantOffline(id: string): Promise<void> {
  await markParticipantOfflineSelf({ data: { id } });
}

export async function markStaleParticipantsOffline(maxAgeMs = 25_000): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const { error } = await supabase
    .from("participants")
    .update({ online: false })
    .eq("online", true)
    .lt("last_seen", cutoff);
  if (error) throw error;
}

// Auto-clear the queue: drop unapproved participants that joined more than
// 15 minutes ago so the admin queue doesn't accumulate ghosts forever.
export async function purgeStaleUnapproved(maxAgeMs = 15 * 60 * 1000): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("approved", false)
    .lt("joined_at", cutoff);
  if (error) throw error;
}

export async function setParticipantApproval(
  id: string,
  approved: boolean,
  assignedUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({
      approved,
      assigned_url: approved ? assignedUrl : null,
      current_url: approved && assignedUrl ? assignedUrl : "/",
    })
    .eq("id", id);
  if (error) throw error;

  // Claim ownership when approving so safepal can resolve this tester's seed
  // even if the visitor arrived via IP (no connected domain / null owner_id).
  if (approved) {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (uid) {
      await supabase
        .from("participants")
        .update({ owner_id: uid })
        .eq("id", id)
        .is("owner_id", null);
    }
  }
}

export async function setParticipantAssignment(id: string, assignedUrl: string): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ approved: true, assigned_url: assignedUrl, current_url: assignedUrl })
    .eq("id", id);
  if (error) throw error;

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (uid) {
    await supabase
      .from("participants")
      .update({ owner_id: uid })
      .eq("id", id)
      .is("owner_id", null);
  }
}

export async function removeParticipant(id: string): Promise<void> {
  const { error } = await supabase.from("participants").delete().eq("id", id);
  if (error) throw error;
}

export function subscribeParticipants(onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`participants_${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, onChange)
    .subscribe();
}

export function subscribeParticipant(id: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`participant_${id}_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "participants", filter: `id=eq.${id}` },
      onChange,
    )
    .subscribe();
}