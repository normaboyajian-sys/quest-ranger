import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  claimSession,
  hasAnyAdmin,
  initialAdminSetup,
  usernameToEmail,
} from "@/lib/admin-users.functions";

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
    if (data.user) throw redirect({ to: "/admin" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(hasAnyAdmin);
  const setup = useServerFn(initialAdminSetup);
  const claim = useServerFn(claimSession);
  const [mode, setMode] = useState<"loading" | "setup" | "signin">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin()
      .then((r) => setMode(r.hasAdmin ? "signin" : "setup"))
      .catch(() => setMode("signin"));
  }, [checkAdmin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "setup") {
        await setup({ data: { username, password } });
      }
      const { error: sErr } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (sErr) throw sErr;
      // Stamp this device as the active session — kicks any older login.
      const sid = newSessionId();
      try { localStorage.setItem(SESSION_KEY, sid); } catch { /* ignore */ }
      try { await claim({ data: { sessionId: sid } }); } catch { /* ignore */ }
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }


  if (mode === "loading")
    return (
      <div className="auth-page">
        <div className="auth-card">Loading…</div>
      </div>
    );

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="auth-h1">
          {mode === "setup" ? "Create admin account" : "Sign in"}
        </h1>
        <p className="auth-lede">
          {mode === "setup"
            ? "No admin exists yet. Set up the first admin account."
            : "Sign in with your username and password."}
        </p>
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
            pattern="[a-zA-Z0-9_-]+"
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn" disabled={busy} type="submit">
          {busy
            ? "Please wait…"
            : mode === "setup"
              ? "Create admin & sign in"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}
