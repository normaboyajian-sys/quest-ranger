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
  }, []);
}

/**
 * Base CSS for all participant suites (cb / gi / ge).
 * - Stops horizontal overflow on phones
 * - Prefers 100dvh (embed + mobile browser chrome)
 * - Keeps inputs at ≥16px so iOS doesn't zoom on focus
 */
export const PHONE_BASE_CSS = `
html.ux-phone-ready, html.ux-phone-ready body {
  max-width: 100%;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
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

/* Prefer dynamic viewport height on phones / in Google Sites iframes */
@supports (min-height: 100dvh) {
  html.ux-phone-ready .ge-shell,
  html.ux-phone-ready .cb-page,
  html.ux-phone-ready .gi-page {
    min-height: 100dvh !important;
  }
}
html.ux-embedded .ge-shell,
html.ux-embedded .cb-page,
html.ux-embedded .gi-page {
  min-height: 100% !important;
}
html.ux-embedded, html.ux-embedded body {
  height: auto;
  min-height: 100%;
}

@media (max-width: 640px) {
  html.ux-phone-ready .ge-shell {
    padding: 12px 12px 20px !important;
    justify-content: flex-start !important;
  }
  html.ux-phone-ready .ge-card {
    min-height: 0 !important;
    height: auto !important;
    padding: 28px 20px 24px !important;
    border-radius: 20px !important;
    overflow: visible !important;
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
  }
}
`;
