import { createFileRoute } from "@tanstack/react-router";
import { GeminiLogo, GI_ACCENT, GI_FONT_FAMILY, GiFontStyle, useGiTracking } from "@/components/gi/GiShared";

export const Route = createFileRoute("/gi/loading")({
  head: () => ({ meta: [{ title: "Loading…" }] }),
  component: GiLoadingPage,
});

function GiLoadingPage() {
  const { sessionId } = useGiTracking();
  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", fontFamily: GI_FONT_FAMILY }}>
      <GiFontStyle />
      <style>{`@keyframes gi-bounce { 0%,80%,100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
      <div style={{ padding: "16px 20px" }}>
        <GeminiLogo />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: GI_ACCENT, animation: "gi-bounce 1.2s infinite ease-in-out", animationDelay: `${i * 0.16}s` }} />
          ))}
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
