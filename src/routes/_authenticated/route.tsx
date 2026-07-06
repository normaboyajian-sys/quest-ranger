import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount, getMyActiveSession } from "@/lib/admin-users.functions";
import { LoadingScreen } from "@/components/LoadingScreen";

const SESSION_KEY = "molly_active_session_id";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const fetchMe = useServerFn(getMyAccount);
  const fetchActive = useServerFn(getMyActiveSession);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; userId: string }
    | { kind: "no_access" }
    | { kind: "kicked" }
  >({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((me) => {
        if (!alive) return;
        const active =
          me.isAdmin ||
          (me.subscription_until &&
            new Date(me.subscription_until).getTime() > Date.now());
        setState(active ? { kind: "ok", userId: me.userId } : { kind: "no_access" });
      })
      .catch(() => alive && setState({ kind: "no_access" }));
    return () => {
      alive = false;
    };
  }, [fetchMe]);

  // Single-session watcher: if the active_session_id on our profile no
  // longer matches the one stored on this device, someone else signed in
  // and we need to sign out.
  useEffect(() => {
    if (state.kind !== "ok") return;
    let alive = true;

    async function checkKicked() {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return;
        const { activeSessionId } = await fetchActive();
        const mine = localStorage.getItem(SESSION_KEY);
        if (alive && activeSessionId && mine && activeSessionId !== mine) {
          await supabase.auth.signOut();
          setState({ kind: "kicked" });
        }
      } catch {
        /* ignore */
      }
    }

    // Initial check + poll fallback.
    void checkKicked();
    const poll = window.setInterval(checkKicked, 15_000);

    // Realtime: react instantly when our profile row's session id changes.
    const channel = supabase
      .channel(`profile_session_${state.userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${state.userId}`,
        },
        (payload) => {
          const row = payload.new as { active_session_id?: string | null };
          const mine = localStorage.getItem(SESSION_KEY);
          if (row.active_session_id && mine && row.active_session_id !== mine) {
            void supabase.auth.signOut();
            setState({ kind: "kicked" });
          }
        },
      )
      .subscribe();

    return () => {
      alive = false;
      window.clearInterval(poll);
      void channel.unsubscribe();
    };
  }, [state, fetchActive]);

  if (state.kind === "loading")
    return <LoadingScreen onDone={() => {}} minMs={5000} maxMs={20000} />;
  if (state.kind === "kicked") return <KickedGate />;
  if (state.kind === "no_access") return <NoAccessGate />;
  return <Outlet />;
}

function KickedGate() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-h1">Signed in elsewhere</h1>
        <p className="auth-lede">
          This account was just signed in from another device. Only one device
          can be active at a time.
        </p>
        <button
          className="auth-btn"
          onClick={() => {
            window.location.href = "/auth";
          }}
        >
          Sign in again
        </button>
      </div>
    </div>
  );
}

function NoAccessGate() {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-h1">Subscription expired</h1>
        <p className="auth-lede">
          Your account has no active subscription. Ask an admin to extend it.
        </p>
        <button className="auth-btn" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
