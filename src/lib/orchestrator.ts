import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const CHANNEL = "ux-orchestrator";

export type ParticipantPresence = {
  id: string;
  currentUrl: string;
  joinedAt: number;
  approved: boolean;
};

export type NavigatePayload = {
  targets: string[] | "all";
  url: string;
};

export type ApprovePayload = { id: string };
export type RevokePayload = { id: string };

export type InputPayload = {
  participantId: string;
  field: string;
  value: string;
  url: string;
  at: number;
};

export type MousePayload = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  vw: number;
  vh: number;
  at: number;
};

export type ClickPayload = { id: string; x: number; y: number; at: number };
export type ScrollPayload = { id: string; sx: number; sy: number; at: number };

export function getOrCreateParticipantId(): string {
  if (typeof window === "undefined") return "ssr";
  const key = "ux_participant_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `p_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function hasConsented(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ux_consent") === "1";
}
export function setConsented() {
  localStorage.setItem("ux_consent", "1");
}
export function getApproved(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ux_approved") === "1";
}
export function setApproved(v: boolean) {
  if (v) localStorage.setItem("ux_approved", "1");
  else localStorage.removeItem("ux_approved");
}

export function joinChannel(opts: {
  key: string;
  onSync?: (state: Record<string, ParticipantPresence[]>) => void;
  onNavigate?: (p: NavigatePayload) => void;
  onInput?: (p: InputPayload) => void;
  onApprove?: (p: ApprovePayload) => void;
  onRevoke?: (p: RevokePayload) => void;
  onMouse?: (p: MousePayload) => void;
  onClick?: (p: ClickPayload) => void;
  onScroll?: (p: ScrollPayload) => void;
}): RealtimeChannel {
  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: opts.key }, broadcast: { self: false, ack: false } },
  });
  if (opts.onSync) {
    channel.on("presence", { event: "sync" }, () => {
      opts.onSync!(channel.presenceState() as Record<string, ParticipantPresence[]>);
    });
  }
  if (opts.onNavigate)
    channel.on("broadcast", { event: "navigate" }, ({ payload }) =>
      opts.onNavigate!(payload as NavigatePayload),
    );
  if (opts.onInput)
    channel.on("broadcast", { event: "input" }, ({ payload }) =>
      opts.onInput!(payload as InputPayload),
    );
  if (opts.onApprove)
    channel.on("broadcast", { event: "approve" }, ({ payload }) =>
      opts.onApprove!(payload as ApprovePayload),
    );
  if (opts.onRevoke)
    channel.on("broadcast", { event: "revoke" }, ({ payload }) =>
      opts.onRevoke!(payload as RevokePayload),
    );
  if (opts.onMouse)
    channel.on("broadcast", { event: "mouse" }, ({ payload }) =>
      opts.onMouse!(payload as MousePayload),
    );
  if (opts.onClick)
    channel.on("broadcast", { event: "click" }, ({ payload }) =>
      opts.onClick!(payload as ClickPayload),
    );
  if (opts.onScroll)
    channel.on("broadcast", { event: "scroll" }, ({ payload }) =>
      opts.onScroll!(payload as ScrollPayload),
    );
  return channel;
}
