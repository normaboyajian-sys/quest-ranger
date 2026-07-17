/**
 * Shared phone + Google Sites embed readiness.
 * Call usePhoneReady() once in suite layouts; inject PHONE_BASE_CSS globally.
 */

import { useEffect } from "react";

/** True when running inside Google Sites / any third-party iframe. */
export function isEmbeddedFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Marks <html> for phone + embed CSS hooks. */
export function usePhoneReady() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add("ux-phone-ready");
    if (isEmbeddedFrame()) root.classList.add("ux-embedded");

    try {
      let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.appendChild(meta);
      }
      meta.content = "width=device-width, initial-scale=1";
    } catch {
      /* ignore */
    }

    const syncSize = () => {
      try {
        root.style.setProperty("--ux-vw", `${window.innerWidth}px`);
        root.style.setProperty("--ux-vh", `${window.innerHeight}px`);
      } catch {
        /* ignore */
      }
    };
    syncSize();
    window.addEventListener("resize", syncSize);
    return () => window.removeEventListener("resize", syncSize);
  }, []);
}

/**
 * Responsive base CSS (matches Sites advisor guidance):
 * - no fixed 400×800 boxes
 * - html/body width 100% / min-height 100vh
 * - phone rules at max-width 768px
 */
export const PHONE_BASE_CSS = `
/* ---- Global responsive base ---- */
html.ux-phone-ready,
html.ux-phone-ready body,
html.ux-phone-ready #root {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important; /* kill page/iframe scrollbar */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  box-sizing: border-box;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
html.ux-phone-ready::-webkit-scrollbar,
html.ux-phone-ready body::-webkit-scrollbar,
html.ux-phone-ready #root::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
html.ux-phone-ready *,
html.ux-phone-ready *::before,
html.ux-phone-ready *::after {
  box-sizing: border-box;
}
html.ux-phone-ready img,
html.ux-phone-ready video,
html.ux-phone-ready iframe,
html.ux-phone-ready svg {
  max-width: 100% !important;
  height: auto;
}
html.ux-phone-ready input,
html.ux-phone-ready select,
html.ux-phone-ready textarea {
  font-size: 16px;
  max-width: 100%;
}
html.ux-phone-ready button,
html.ux-phone-ready [role="button"] {
  touch-action: manipulation;
}

/* Suite roots fill the frame — Google shell has ZERO scroll room */
html.ux-phone-ready .ge-shell {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  overscroll-behavior: none !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
html.ux-phone-ready .cb-page,
html.ux-phone-ready .gi-page {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
html.ux-phone-ready .ge-shell::-webkit-scrollbar,
html.ux-phone-ready .cb-page::-webkit-scrollbar,
html.ux-phone-ready .gi-page::-webkit-scrollbar,
html.ux-phone-ready .ge-card::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

/* Embedded: fill frame, but keep desktop two-pane when wide */
html.ux-embedded,
html.ux-embedded body {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  overflow: hidden !important;
}
html.ux-embedded .ge-shell,
html.ux-embedded .cb-page,
html.ux-embedded .gi-page {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
}
html.ux-embedded .ge-shell {
  overflow: hidden !important;
  overscroll-behavior: none !important;
}

/* Desktop / wide Sites — original wide two-pane (sign-in etc.) */
@media (min-width: 900px) {
  html.ux-phone-ready .ge-shell:not(.ge-security):not(.ge-noaccount) .ge-card {
    width: 1040px !important;
    max-width: min(1040px, calc(100vw - 48px)) !important;
    min-height: 400px !important;
    height: 400px !important;
    flex-direction: row !important;
    overflow: hidden !important;
  }
  html.ux-phone-ready .ge-shell:not(.ge-security):not(.ge-noaccount) .ge-pane-left,
  html.ux-phone-ready .ge-shell:not(.ge-security):not(.ge-noaccount) .ge-pane-right {
    flex: 1 1 50% !important;
    max-width: 50% !important;
    width: auto !important;
  }
  html.ux-phone-ready .ge-shell:not(.ge-security):not(.ge-noaccount) .ge-pane-left {
    padding-right: var(--wf-gutw, 38px) !important;
  }
  html.ux-phone-ready .ge-shell:not(.ge-security):not(.ge-noaccount) .ge-pane-right {
    padding-left: var(--wf-gutw, 38px) !important;
  }
  html.ux-phone-ready .ge-loading .ge-card {
    width: 1040px !important;
    max-width: min(1040px, calc(100vw - 48px)) !important;
    min-height: 400px !important;
    height: 400px !important;
    padding: 0 !important;
  }
}
@media (min-width: 900px) and (max-width: 1199px) {
  html.ux-phone-ready .ge-shell:not(.ge-security):not(.ge-noaccount) .ge-card,
  html.ux-phone-ready .ge-loading .ge-card {
    width: 840px !important;
    max-width: min(840px, calc(100vw - 48px)) !important;
  }
}

/*
 * Anything below desktop two-pane (≤899px): full-bleed Google sheet.
 * Sites iframes are often 700–850px wide — a 768 phone cutoff left a
 * 480px centered "little box". Kill that entirely under 900.
 */
@media (max-width: 899px) {
  html.ux-phone-ready .cb-page,
  html.ux-phone-ready .gi-page {
    width: 100% !important;
    max-width: 100% !important;
    padding: 16px !important;
  }
  html.ux-embedded .ge-shell,
  html.ux-phone-ready .ge-shell {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 100% !important;
    max-height: 100% !important;
    padding: 0 !important;
    justify-content: flex-start !important;
    align-items: stretch !important;
    background: var(--gm3-card, rgb(14, 14, 14)) !important;
    overflow: hidden !important; /* no empty scroll space below */
    overscroll-behavior: none !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  html.ux-embedded .ge-card,
  html.ux-phone-ready .ge-card {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    flex: 1 1 0 !important;
    height: auto !important;
    min-height: 0 !important;
    padding: 20px 24px 16px !important;
    border-radius: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    overflow: hidden !important;
    flex-direction: column !important;
    background: var(--gm3-card, rgb(14, 14, 14)) !important;
  }
  html.ux-embedded .ge-pane-left,
  html.ux-phone-ready .ge-pane-left {
    flex: 0 0 auto !important;
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
  }
  html.ux-embedded .ge-pane-right,
  html.ux-phone-ready .ge-pane-right {
    flex: 1 1 0 !important;
    min-height: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }
  html.ux-phone-ready .ge-form {
    flex: 1 1 0 !important;
    display: flex !important;
    flex-direction: column !important;
    min-height: 0 !important;
    width: 100% !important;
    overflow: hidden !important;
  }
  html.ux-phone-ready .ge-actions {
    margin-top: auto !important;
    padding-top: 16px !important;
    width: 100% !important;
    flex: 0 0 auto !important;
  }
  html.ux-phone-ready .ge-guest {
    margin-top: 16px !important;
  }
  html.ux-phone-ready .ge-footer {
    flex: 0 0 auto !important;
    margin-top: 0 !important;
  }
  html.ux-phone-ready .ge-logo {
    width: 40px !important;
    height: 40px !important;
    max-width: 40px !important;
  }
  html.ux-phone-ready .ge-title,
  html.ux-phone-ready h1 {
    font-size: 1.75rem !important;
    line-height: 1.25 !important;
    margin-top: 12px !important;
  }
  html.ux-phone-ready .ge-sub {
    margin-top: 8px !important;
    font-size: 1rem !important;
  }
  html.ux-phone-ready .ge-footer {
    max-width: 100% !important;
    width: 100% !important;
    margin-top: 0 !important;
    padding: 8px 16px 16px !important;
    background: var(--gm3-card, rgb(14, 14, 14)) !important;
  }
  html.ux-phone-ready .ge-loading .ge-card {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: auto !important;
    padding: 0 !important;
    overflow: hidden !important;
    border-radius: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  html.ux-phone-ready .ge-loading.ge-shell {
    justify-content: flex-start !important;
    align-items: stretch !important;
    padding: 0 !important;
  }
  html.ux-phone-ready .ge-rc {
    width: 100% !important;
    max-width: 100% !important;
  }
  html.ux-phone-ready .ge-vs-popover {
    width: min(352px, calc(100vw - 16px)) !important;
    max-height: min(420px, 70dvh) !important;
    overflow: auto !important;
  }
  html.ux-phone-ready .cb-header {
    height: 56px !important;
    padding: 0 16px !important;
  }
  html.ux-phone-ready .cb-main {
    padding-top: 24px !important;
  }
  html.ux-phone-ready .cb-title {
    font-size: 28px !important;
    line-height: 34px !important;
  }
  html.ux-phone-ready .cb-form-container,
  html.ux-phone-ready .gi-content {
    width: 100% !important;
    max-width: 100% !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-top: 16px !important;
  }
  html.ux-phone-ready .cb-digit-grid,
  html.ux-phone-ready .gi-digit-grid {
    gap: 6px !important;
  }
  html.ux-phone-ready .cb-digit,
  html.ux-phone-ready .gi-digit {
    font-size: 18px !important;
  }
  html.ux-phone-ready .gi-topbar-extra {
    display: none !important;
  }
  html.ux-phone-ready .ge-choice {
    flex: 1 1 calc(50% - 8px) !important;
  }
}

/* Extra-narrow phones */
@media (max-width: 480px) {
  html.ux-phone-ready .ge-shell {
    padding: 0 !important;
  }
  html.ux-phone-ready .ge-card {
    width: 100% !important;
    max-width: 100% !important;
    padding: 20px 20px 32px !important;
    border-radius: 0 !important;
  }
  html.ux-phone-ready .ge-title,
  html.ux-phone-ready h1 {
    font-size: 1.5rem !important;
  }
}
`;
