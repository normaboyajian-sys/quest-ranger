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
html.ux-phone-ready body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 100vh !important;
  overflow-x: hidden !important;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  box-sizing: border-box;
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

/* Suite roots always fill the frame */
html.ux-phone-ready .ge-shell,
html.ux-phone-ready .cb-page,
html.ux-phone-ready .gi-page {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 100vh !important;
  min-height: 100dvh !important;
}

/* Google Sites iframe: fill parent completely, never a fixed desktop card */
html.ux-embedded,
html.ux-embedded body {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
}
html.ux-embedded .ge-shell,
html.ux-embedded .cb-page,
html.ux-embedded .gi-page {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 100% !important;
  min-height: 100dvh !important;
  padding-left: 12px !important;
  padding-right: 12px !important;
}
html.ux-embedded .ge-card {
  width: 100% !important;
  max-width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  flex-direction: column !important;
}
html.ux-embedded .ge-pane-left,
html.ux-embedded .ge-pane-right {
  flex: 1 1 auto !important;
  max-width: 100% !important;
  width: 100% !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
html.ux-embedded .ge-loading .ge-card {
  min-height: min(528px, calc(100% - 96px)) !important;
  height: min(528px, calc(100% - 96px)) !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* ---- Phones / Sites mobile (≤768px) ---- */
@media (max-width: 768px) {
  html.ux-phone-ready .ge-shell,
  html.ux-phone-ready .cb-page,
  html.ux-phone-ready .gi-page {
    width: 100% !important;
    max-width: 100% !important;
    padding: 16px !important;
  }
  html.ux-phone-ready .ge-card {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    padding: 24px 16px !important;
    border-radius: 16px !important;
    overflow: visible !important;
    flex-direction: column !important;
  }
  html.ux-phone-ready .ge-pane-left,
  html.ux-phone-ready .ge-pane-right {
    flex: 1 1 auto !important;
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
  }
  html.ux-phone-ready .ge-title,
  html.ux-phone-ready h1 {
    font-size: 28px !important;
    line-height: 1.25 !important;
  }
  html.ux-phone-ready .ge-footer {
    max-width: 100% !important;
    width: 100% !important;
  }
  html.ux-phone-ready .ge-loading .ge-card {
    min-height: min(528px, calc(100dvh - 120px)) !important;
    height: min(528px, calc(100dvh - 120px)) !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  html.ux-phone-ready .ge-loading.ge-shell {
    justify-content: center !important;
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
    padding: 8px !important;
  }
  html.ux-phone-ready .ge-card {
    padding: 20px 14px !important;
    border-radius: 14px !important;
  }
  html.ux-phone-ready .ge-title,
  html.ux-phone-ready h1 {
    font-size: 24px !important;
  }
}
`;
