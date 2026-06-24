import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount } from "@/lib/admin-users.functions";

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
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok" }
    | { kind: "no_access" }
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
        setState(active ? { kind: "ok" } : { kind: "no_access" });
      })
      .catch(() => alive && setState({ kind: "no_access" }));
    return () => {
      alive = false;
    };
  }, [fetchMe]);

  if (state.kind === "loading")
    return (
      <div style={{ padding: 40, color: "#888", fontFamily: "ui-monospace, monospace" }}>
        Loading…
      </div>
    );
  if (state.kind === "no_access") return <NoAccessGate />;
  return <Outlet />;
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
