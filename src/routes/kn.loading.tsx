import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KnFontStyle, KrakenMark, useKnTracking } from "@/components/kn/KnShared";

export const Route = createFileRoute("/kn/loading")({
  head: () => ({ meta: [{ title: "Loading…" }] }),
  component: KnLoadingPage,
});

function KnLoadingPage() {
  useKnTracking();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const unsub = router.subscribe("onBeforeNavigate", () => {
      setLeaving(true);
    });
    return unsub;
  }, [router]);

  return (
    <div
      className="kn-page"
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#f6f5f9",
        opacity: leaving ? 0 : 1,
        transition: "opacity 400ms ease",
      }}
    >
      <KnFontStyle />
      <style>{`
        html, body { background-color: #f6f5f9 !important; }
        .kn-spin {
          animation: knSmoothSpin 1.4s linear infinite;
          transform-origin: 50% 50%;
          will-change: transform;
        }
        @keyframes knSmoothSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="kn-spin">
          <KrakenMark size={72} />
        </div>
      </div>
    </div>
  );
}
