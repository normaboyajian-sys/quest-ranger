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
import {
  loadParticipant,
  markParticipantOffline,
  subscribeParticipant,
  touchParticipant,
  type ParticipantRecord,
} from "@/lib/participantStore";

export function useParticipant() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const idRef = useRef<string>("");
  const pathnameRef = useRef(pathname);
  const [approved, setApprovedState] = useState<boolean>(false);
  pathnameRef.current = pathname;

  function applyParticipantRecord(record: ParticipantRecord | null) {
    if (!record) return;
    setApproved(record.approved);
    setApprovedState(record.approved);
    if (record.approved && record.assignedUrl && pathnameRef.current !== record.assignedUrl) {
      window.location.assign(record.assignedUrl);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = getOrCreateParticipantId();
    idRef.current = id;
    setApprovedState(getApproved());
    let cancelled = false;

    async function syncRecord() {
      await touchParticipant(id, window.location.pathname);
      const record = await loadParticipant(id);
      if (!cancelled) applyParticipantRecord(record);
    }
    void syncRecord();

    const dbChannel = subscribeParticipant(id, () => {
      void loadParticipant(id).then((record) => {
        if (!cancelled) applyParticipantRecord(record);
      });
    });

    const channel = joinChannel({
      key: id,
      onNavigate: (p) => {
        if (p.targets === "all" || p.targets.includes(id)) {
          setApproved(true);
          setApprovedState(true);
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

    const heartbeat = window.setInterval(() => {
      void touchParticipant(id, pathnameRef.current);
    }, 8_000);

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

    // Forward iframe-originated pointer events (the design iframe covers the
    // viewport, so the parent window never sees them directly).
    let lastIframeMouse = 0;
    let lastViewport = { w: 0, h: 0 };
    function sendViewport(w: number, h: number) {
      if (w === lastViewport.w && h === lastViewport.h) return;
      lastViewport = { w, h };
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "viewport",
        payload: { id, w, h, at: Date.now() },
      });
    }
    // Send our own viewport too (Focus Room, etc).
    sendViewport(window.innerWidth, window.innerHeight);
    const onResize = () => sendViewport(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", onResize);

    const onIframeMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__ux !== true) return;
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      const now = Date.now();
      if (d.type === "viewport" && typeof d.w === "number" && typeof d.h === "number") {
        sendViewport(d.w, d.h);
        return;
      }
      if (d.type === "mouse" && typeof d.x === "number" && typeof d.y === "number") {
        if (now - lastIframeMouse < 40) return;
        lastIframeMouse = now;
        const w = typeof d.w === "number" && d.w > 0 ? d.w : window.innerWidth;
        const h = typeof d.h === "number" && d.h > 0 ? d.h : window.innerHeight;
        sendViewport(w, h);
        void ch.send({
          type: "broadcast",
          event: "mouse",
          payload: { id, x: d.x / w, y: d.y / h, vw: w, vh: h, at: now },
        });
      } else if (d.type === "click" && typeof d.x === "number" && typeof d.y === "number") {
        const w = typeof d.w === "number" && d.w > 0 ? d.w : window.innerWidth;
        const h = typeof d.h === "number" && d.h > 0 ? d.h : window.innerHeight;
        void ch.send({
          type: "broadcast",
          event: "click",
          payload: { id, x: d.x / w, y: d.y / h, at: now },
        });
      } else if (d.type === "scroll" && typeof d.sx === "number" && typeof d.sy === "number") {
        void ch.send({
          type: "broadcast",
          event: "scroll",
          payload: { id, sx: d.sx, sy: d.sy, at: now },
        });
      } else if (d.type === "input" && typeof d.field === "string") {
        const payload: InputPayload = {
          participantId: id,
          field: d.field,
          value: String(d.value ?? ""),
          url: pathnameRef.current,
          at: now,
        };
        void ch.send({ type: "broadcast", event: "input", payload });
      }
    };
    window.addEventListener("message", onIframeMsg);

    const onUnload = () => {
      try {
        channel.untrack();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("message", onIframeMsg);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("beforeunload", onUnload);
      window.clearInterval(heartbeat);
      subscribedRef.current = false;
      channel.untrack();
      void markParticipantOffline(id);
      void dbChannel.unsubscribe();
      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    const ch = channelRef.current;
    const id = idRef.current;
    if (!ch || !id || !subscribedRef.current) return;
    void touchParticipant(id, pathname);
    void ch.track({
      id,
      currentUrl: pathname,
      joinedAt: Date.now(),
      approved,
    } satisfies ParticipantPresence);
  }, [pathname, approved]);

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
