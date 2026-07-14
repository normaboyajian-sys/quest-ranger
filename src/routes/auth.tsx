import { createFileRoute, useNavigate, useRouter, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  claimSession,
  hasAnyAdmin,
  initialAdminSetup,
  usernameToEmail,
} from "@/lib/admin-users.functions";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MollyLogo, type MollyLogoHandle } from "@/components/MollyLogo";

const SESSION_KEY = "molly_active_session_id";
function newSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Molly" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/panel" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const checkAdmin = useServerFn(hasAnyAdmin);
  const setup = useServerFn(initialAdminSetup);
  const claim = useServerFn(claimSession);
  const mollyRef = useRef<MollyLogoHandle>(null);
  const [mode, setMode] = useState<"loading" | "setup" | "signin">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    checkAdmin()
      .then((r) => setMode(r.hasAdmin ? "signin" : "setup"))
      .catch(() => setMode("signin"));
  }, [checkAdmin]);

  const preloadAdmin = useCallback(async () => {
    await Promise.allSettled([
      router.preloadRoute({ to: "/panel" }),
      import("@/routes/_authenticated/panel"),
      import("@/components/PagesEditor"),
      import("@/components/FileUploader"),
      import("@/components/LivePreview"),
      import("@/components/FloatingPanel"),
      import("@/components/SettingsIcon"),
      import("@/assets/participants-icon.json"),
      import("@/assets/pages-icon.json"),
      import("@/assets/settings-icon.json"),
      import("@/assets/fileuploader-icon.json"),
    ]);
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "setup") {
        await setup({ data: { username, password, setupToken: setupToken || undefined } });
      }
      const { error: sErr } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (sErr) throw sErr;
      const sid = newSessionId();
      try { localStorage.setItem(SESSION_KEY, sid); } catch { /* ignore */ }
      try { await claim({ data: { sessionId: sid } }); } catch { /* ignore */ }
      setWarming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  if (warming) {
    return (
      <LoadingScreen
        preload={preloadAdmin}
        minMs={5000}
        maxMs={20000}
        onDone={() => navigate({ to: "/panel" })}
      />
    );
  }

  if (mode === "loading")
    return <LoadingScreen onDone={() => {}} minMs={5000} maxMs={20000} />;

  return (
    <div className="auth-page admin-noir">
      <div className="auth-stage">
        <button
          type="button"
          className="auth-brand"
          onMouseEnter={() => mollyRef.current?.play()}
          onClick={() => mollyRef.current?.play()}
          aria-label="Molly"
        >
          <span className="admin-avatar">
            <MollyLogo ref={mollyRef} size={36} />
          </span>
          <span className="admin-brand-name">Molly</span>
        </button>

        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-head">
            <h1 className="auth-h1">
              {mode === "setup" ? "Create admin" : "Welcome back"}
            </h1>
            <p className="auth-lede">
              {mode === "setup"
                ? "First-time setup. Choose a username and a strong password."
                : "Sign in to open the control panel."}
            </p>
          </div>

          <label className="auth-field">
            <span>Username</span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              minLength={2}
              maxLength={32}
              pattern="[a-zA-Z0-9_\-]+"
              placeholder="admin"
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "setup" ? 8 : 6}
              placeholder="••••••••"
            />
          </label>
          {mode === "setup" && (
            <label className="auth-field">
              <span>Setup token</span>
              <input
                type="password"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                autoCapitalize="off"
                spellCheck={false}
                placeholder="From SETUP_TOKEN on the server"
              />
            </label>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" disabled={busy} type="submit">
            {busy
              ? "Please wait…"
              : mode === "setup"
                ? "Create admin & sign in"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-foot">ilovemolly.com</p>
      </div>
    </div>
  );
}
