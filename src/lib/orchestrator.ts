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

export type LiveInputPayload = {
  participantId: string;
  field: string;
  value: string;
  focused: boolean;
  ftype: string;
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
export type ViewportPayload = { id: string; w: number; h: number; at: number };

export type DesignPublishPayload = {
  design: "cb" | "gi";
  page: string;
  html: string;
  css: string;
  js: string;
  at: number;
};

const PID_KEY = "ux_participant_id";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((r) => r.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 2 years, same-site lax so it survives normal navigation/rejoins.
  const maxAge = 60 * 60 * 24 * 730;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getOrCreateParticipantId(): string {
  if (typeof window === "undefined") return "ssr";
  let id: string | null = null;
  try { id = localStorage.getItem(PID_KEY); } catch { /* ignore */ }
  if (!id) id = readCookie(PID_KEY);
  if (!id) {
    const uuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    id = `p_${uuid}`;
  }
  // Re-persist to both stores so a wipe of one is restored from the other.
  try { localStorage.setItem(PID_KEY, id); } catch { /* ignore */ }
  writeCookie(PID_KEY, id);
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
  onLiveInput?: (p: LiveInputPayload) => void;
  onApprove?: (p: ApprovePayload) => void;
  onRevoke?: (p: RevokePayload) => void;
  onMouse?: (p: MousePayload) => void;
  onClick?: (p: ClickPayload) => void;
  onScroll?: (p: ScrollPayload) => void;
  onViewport?: (p: ViewportPayload) => void;
  onDesignPublish?: (p: DesignPublishPayload) => void;
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
  if (opts.onLiveInput)
    channel.on("broadcast", { event: "live_input" }, ({ payload }) =>
      opts.onLiveInput!(payload as LiveInputPayload),
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
  if (opts.onViewport)
    channel.on("broadcast", { event: "viewport" }, ({ payload }) =>
      opts.onViewport!(payload as ViewportPayload),
    );
  if (opts.onDesignPublish)
    channel.on("broadcast", { event: "design_publish" }, ({ payload }) =>
      opts.onDesignPublish!(payload as DesignPublishPayload),
    );
  return channel;
}
