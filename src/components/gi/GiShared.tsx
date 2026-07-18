// Shared Gemini (gi) page primitives — mirrors RhShared.
import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";

export const GI_FONT_FAMILY =
  "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export const GI_ACCENT = "#26ddf9";

export function GeminiLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 129 129" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ padding: 4 }} aria-label="Gemini">
      <path d="M83.86 2a43.53 43.53 0 00-43 38.64 43.26 43.26 0 004.63 86.28 43.53 43.53 0 0043-38.64A43.26 43.26 0 0083.86 2zM117 50.17a33.7 33.7 0 01-28.25 28.24V50.17zM12.35 78.77a33.69 33.69 0 0128.24-28.23v28.23zm66.25 9.78a33.48 33.48 0 01-66.25 0zm.4-38.38v28.6H50.37v-28.6zm38-9.78H50.73a33.48 33.48 0 0166.25 0z" fill={GI_ACCENT} />
    </svg>
  );
}

export function GiFontStyle() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');`}</style>
  );
}

export function useIsObserve(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const q = new URLSearchParams(window.location.search);
      return q.get("__observe") === "1" || q.get("__preview") === "1";
    } catch {
      return false;
    }
  }, []);
}

export function useGiQueryParam(name: string): string | null {
  const search = useRouterState({ select: (s) => s.location.search });
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = typeof search === "string" ? search : window.location.search;
      return new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw).get(name);
    } catch {
      return null;
    }
  }, [search, name]);
}

export function useGiTracking() {
  const isObserve = useIsObserve();
  const navigate = useNavigate();
  const { emitInput, participantId } = useParticipant();

  function trackClick(label: string) {
    if (isObserve) return;
    emitInput("__click", label);
  }
  function trackInput(field: string, value: string) {
    if (isObserve) return;
    emitInput(field, value);
  }
  function giNavigate(to: string) {
    if (isObserve) return;
    try {
      window.postMessage({ __ux: true, type: "internal_navigation", url: to }, "*");
    } catch { /* ignore */ }
    navigate({ to, reloadDocument: false }).catch(() => {
      window.location.assign(to);
    });
  }

  useEffect(() => {
    if (!isObserve || typeof window === "undefined") return;
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__mirror !== true) return;
      if (d.type !== "live_input" || typeof d.field !== "string") return;
      const el = document.querySelector(`[name="${d.field}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) {
        el.value = String(d.value ?? "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    function blockNav(e: MouseEvent) {
      const t = e.target as Element | null;
      const a = t?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || a.target === "_blank") return;
      if (href.startsWith("/") || href.includes(window.location.host)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("message", onMsg);
    document.addEventListener("click", blockNav, true);
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("click", blockNav, true);
    };
  }, [isObserve]);

  return { sessionId: participantId, trackClick, trackInput, giNavigate, isObserve };
}
