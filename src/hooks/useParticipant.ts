import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getApproved,
  getOrCreateParticipantId,
  joinChannel,
  setApproved,
  type InputPayload,
  type ParticipantPresence,
} from "@/lib/orchestrator";

export function useParticipant() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const idRef = useRef<string>("");
  const [approved, setApprovedState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = getOrCreateParticipantId();
    idRef.current = id;
    setApprovedState(getApproved());

    const channel = joinChannel({
      key: id,
      onNavigate: (p) => {
        if (p.targets === "all" || p.targets.includes(id)) {
          navigate({ to: p.url, reloadDocument: false }).catch(() => {
            window.location.assign(p.url);
          });
        }
      },
      onApprove: (p) => {
        if (p.id !== id) return;
        setApproved(true);
        setApprovedState(true);
        void channel.track({
          id,
          currentUrl: window.location.pathname,
          joinedAt: Date.now(),
          approved: true,
        } satisfies ParticipantPresence);
      },
      onRevoke: (p) => {
        if (p.id !== id) return;
        setApproved(false);
        setApprovedState(false);
        void channel.track({
          id,
          currentUrl: "/",
          joinedAt: Date.now(),
          approved: false,
        } satisfies ParticipantPresence);
        navigate({ to: "/", reloadDocument: false }).catch(() => {
          window.location.assign("/");
        });
      },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          id,
          currentUrl: window.location.pathname,
          joinedAt: Date.now(),
          approved: getApproved(),
        } satisfies ParticipantPresence);
      }
    });
    channelRef.current = channel;

    return () => {
      channel.untrack();
      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, [navigate]);

  // Keep presence in sync with current URL + approved status
  useEffect(() => {
    const ch = channelRef.current;
    const id = idRef.current;
    if (!ch || !id) return;
    void ch.track({
      id,
      currentUrl: pathname,
      joinedAt: Date.now(),
      approved,
    } satisfies ParticipantPresence);
  }, [pathname, approved]);

  // Guard: unapproved cannot stay on /view/*
  useEffect(() => {
    if (!approved && pathname.startsWith("/view/")) {
      navigate({ to: "/", reloadDocument: false }).catch(() => {
        window.location.assign("/");
      });
    }
  }, [approved, pathname, navigate]);

  function emitInput(field: string, value: string) {
    const ch = channelRef.current;
    if (!ch) return;
    const payload: InputPayload = {
      participantId: idRef.current,
      field,
      value,
      url: pathname,
      at: Date.now(),
    };
    void ch.send({ type: "broadcast", event: "input", payload });
  }

  return { emitInput, participantId: idRef.current, approved };
}
