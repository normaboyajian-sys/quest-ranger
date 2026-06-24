import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ParticipantRecord = {
  id: string;
  currentUrl: string;
  assignedUrl: string | null;
  approved: boolean;
  online: boolean;
  joinedAt: number;
  lastSeen: number;
};

type ParticipantRow = {
  id: string;
  current_url: string;
  assigned_url: string | null;
  approved: boolean;
  online: boolean;
  joined_at: string;
  last_seen: string;
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
  };
}

export async function loadParticipants(): Promise<ParticipantRecord[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("id,current_url,assigned_url,approved,online,joined_at,last_seen")
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => toRecord(row));
}

export async function loadParticipant(id: string): Promise<ParticipantRecord | null> {
  const { data, error } = await supabase
    .from("participants")
    .select("id,current_url,assigned_url,approved,online,joined_at,last_seen")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toRecord(data) : null;
}

export async function touchParticipant(id: string, currentUrl: string): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("participants")
    .update({ current_url: currentUrl, online: true, last_seen: now })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (data) return;
  const { error: insertError } = await supabase.from("participants").insert({
    id,
    current_url: currentUrl,
    online: true,
    last_seen: now,
  });
  if (insertError && insertError.code !== "23505") throw insertError;
}

export async function markParticipantOffline(id: string): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ online: false, last_seen: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
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

// Auto-clear the queue: drop unapproved participants that haven't pinged in a
// while so the admin queue doesn't accumulate ghosts forever.
export async function purgeStaleUnapproved(maxAgeMs = 90_000): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("approved", false)
    .lt("last_seen", cutoff);
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
}

export async function setParticipantAssignment(id: string, assignedUrl: string): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ approved: true, assigned_url: assignedUrl, current_url: assignedUrl })
    .eq("id", id);
  if (error) throw error;
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