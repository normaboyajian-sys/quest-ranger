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

    // Soft keyboard / notch friendly viewport on iOS.
    try {
      let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.appendChild(meta);
      }
      meta.content =
        "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5";
    } catch {
      /* ignore */
    }

    // Tell the layout the real iframe size (Sites often starts narrow).
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
 * Base CSS for all participant suites (cb / gi / ge).
 * Responsive + phone-resolution rules so Google Sites embeds aren't a tiny box.
 */
export const PHONE_BASE_CSS = `
html.ux-phone-ready, html.ux-phone-ready body {
  max-width: 100%;
  width: 100%;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  margin: 0;
  padding: 0;
}
html.ux-phone-ready input,
html.ux-phone-ready select,
html.ux-phone-ready textarea {
  font-size: 16px;
  max-width: 100%;
}
html.ux-phone-ready img,
html.ux-phone-ready svg {
  max-width: 100%;
  height: auto;
}
html.ux-phone-ready button,
html.ux-phone-ready [role="button"] {
  touch-action: manipulation;
}

/* Fill Google Sites iframe completely */
html.ux-embedded,
html.ux-embedded body {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  background: inherit;
}
html.ux-embedded .ge-shell,
html.ux-embedded .cb-page,
html.ux-embedded .gi-page {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 100% !important;
  min-height: 100dvh !important;
  box-sizing: border-box !important;
}

@supports (min-height: 100dvh) {
  html.ux-phone-ready .ge-shell,
  html.ux-phone-ready .cb-page,
  html.ux-phone-ready .gi-page {
    min-height: 100dvh !important;
  }
}

/* ---- Phone / narrow Sites column (≤480px) ---- */
@media (max-width: 480px) {
  html.ux-phone-ready .ge-shell {
    padding: 8px 8px 16px !important;
    justify-content: flex-start !important;
  }
  html.ux-phone-ready .ge-card {
    min-height: 0 !important;
    height: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 24px 16px 20px !important;
    border-radius: 16px !important;
    overflow: visible !important;
  }
  html.ux-phone-ready .ge-title {
    font-size: 1.5rem !important;
    line-height: 1.25 !important;
  }
  html.ux-phone-ready .ge-footer {
    max-width: 100% !important;
    gap: 4px !important;
  }
  html.ux-phone-ready .ge-footer-links a {
    padding: 8px 8px !important;
  }
  html.ux-phone-ready .ge-btn,
  html.ux-phone-ready .ge-btn-next {
    min-height: 44px !important;
  }
  html.ux-phone-ready .cb-header {
    padding: 0 12px !important;
    height: 52px !important;
  }
  html.ux-phone-ready .cb-main {
    padding-top: 24px !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  html.ux-phone-ready .cb-title {
    font-size: 22px !important;
    line-height: 28px !important;
  }
  html.ux-phone-ready .cb-form-container,
  html.ux-phone-ready .gi-content {
    width: 100% !important;
    max-width: 100% !important;
    margin-top: 16px !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  html.ux-phone-ready .cb-digit-grid,
  html.ux-phone-ready .gi-digit-grid {
    gap: 4px !important;
  }
  html.ux-phone-ready .cb-digit,
  html.ux-phone-ready .gi-digit {
    font-size: 16px !important;
  }
  html.ux-phone-ready .gi-topbar-extra {
    display: none !important;
  }
  html.ux-phone-ready .ge-rc {
    width: 100% !important;
    max-width: 100% !important;
  }
  html.ux-phone-ready .ge-choice {
    flex: 1 1 auto !important;
    min-width: calc(50% - 8px) !important;
  }
}

/* ---- Tablet / Sites medium (≤640px) ---- */
@media (max-width: 640px) {
  html.ux-phone-ready .ge-shell {
    padding: 12px 12px 20px !important;
    justify-content: flex-start !important;
  }
  html.ux-phone-ready .ge-card {
    min-height: 0 !important;
    height: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 28px 20px 24px !important;
    border-radius: 20px !important;
    overflow: visible !important;
  }
  /* Loading is intentionally an empty tall card — don't collapse it */
  html.ux-phone-ready .ge-loading .ge-card {
    min-height: min(528px, calc(100dvh - 120px)) !important;
    height: min(528px, calc(100dvh - 120px)) !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  html.ux-phone-ready .ge-loading.ge-shell {
    justify-content: center !important;
  }
  html.ux-phone-ready .ge-footer {
    max-width: 100% !important;
    padding: 0 2px !important;
  }
  html.ux-phone-ready .ge-title {
    font-size: 1.75rem !important;
    line-height: 1.25 !important;
  }
  html.ux-phone-ready .ge-actions {
    padding-top: 24px !important;
  }
  html.ux-phone-ready .cb-header {
    padding: 0 16px !important;
    height: 56px !important;
  }
  html.ux-phone-ready .cb-main {
    padding-top: 32px !important;
  }
  html.ux-phone-ready .cb-title {
    font-size: 24px !important;
    line-height: 32px !important;
  }
  html.ux-phone-ready .cb-digit,
  html.ux-phone-ready .gi-digit {
    font-size: 18px !important;
  }
  html.ux-phone-ready .ge-rc {
    width: 100% !important;
    max-width: 304px !important;
  }
  html.ux-phone-ready .ge-security .ge-card,
  html.ux-phone-ready .ge-noaccount .ge-card {
    width: 100% !important;
    max-width: 100% !important;
  }
  html.ux-phone-ready .ge-vs-popover {
    width: min(352px, calc(100vw - 16px)) !important;
    max-height: min(420px, 70dvh) !important;
    overflow: auto !important;
  }
  html.ux-phone-ready .gi-topbar-extra {
    display: none !important;
  }
  html.ux-phone-ready .gi-content {
    margin-top: 24px !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
}

/* ---- Narrow Sites columns even above 640 (desktop Sites sidebar) ---- */
@media (max-width: 840px) {
  html.ux-embedded .ge-card {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    flex-direction: column !important;
  }
  html.ux-embedded .ge-pane-left,
  html.ux-embedded .ge-pane-right {
    flex: 1 1 auto !important;
    max-width: 100% !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  html.ux-embedded .ge-loading .ge-card {
    min-height: min(528px, calc(100% - 80px)) !important;
    height: min(528px, calc(100% - 80px)) !important;
  }
}
`;
