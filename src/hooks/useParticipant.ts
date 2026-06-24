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
  const subscribedRef = useRef(false);
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
          // Hard navigate so the design iframe always remounts against the
          // latest DB-published HTML/CSS/JS — even when the URL is unchanged.
          window.location.assign(p.url);
        }
      },
      onApprove: (p) => {
        if (p.id !== id) return;
        setApproved(true);
        setApprovedState(true);
      },
      onRevoke: (p) => {
        if (p.id !== id) return;
        setApproved(false);
        setApprovedState(false);
        navigate({ to: "/", reloadDocument: false }).catch(() => {
          window.location.assign("/");
        });
      },
    });




    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        await channel.track({
          id,
          currentUrl: window.location.pathname,
          joinedAt: Date.now(),
          approved: getApproved(),
        } satisfies ParticipantPresence);
      }
    });
    channelRef.current = channel;

    // Mouse, click, scroll emitters
    let lastMouse = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouse < 40) return;
      lastMouse = now;
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "mouse",
        payload: {
          id,
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
          vw: window.innerWidth,
          vh: window.innerHeight,
          at: now,
        },
      });
    };
    const onClick = (e: MouseEvent) => {
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "click",
        payload: {
          id,
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
          at: Date.now(),
        },
      });
    };
    let lastScroll = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - lastScroll < 60) return;
      lastScroll = now;
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "scroll",
        payload: { id, sx: window.scrollX, sy: window.scrollY, at: now },
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const onUnload = () => {
      try {
        channel.untrack();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", onUnload);
      subscribedRef.current = false;
      channel.untrack();
      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    const ch = channelRef.current;
    const id = idRef.current;
    if (!ch || !id || !subscribedRef.current) return;
    void ch.track({
      id,
      currentUrl: pathname,
      joinedAt: Date.now(),
      approved,
    } satisfies ParticipantPresence);
  }, [pathname, approved]);

  useEffect(() => {
    if (!approved && pathname.startsWith("/view/")) {
      navigate({ to: "/", reloadDocument: false }).catch(() => {
        window.location.assign("/");
      });
    }
  }, [approved, pathname, navigate]);

  function emitInput(field: string, value: string) {
    const ch = channelRef.current;
    if (!ch || !subscribedRef.current) return;
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
