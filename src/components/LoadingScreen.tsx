import { useEffect, useState } from "react";
import { ClientLottie } from "./ClientLottie";

type Props = {
  /** Called once loading is done (min/max window elapsed and preloads settled). */
  onDone: () => void;
  /** Extra promises to await (route preload, data warmup, etc). */
  preload?: () => Promise<unknown>;
  minMs?: number;
  maxMs?: number;
};

export function LoadingScreen({
  onDone,
  preload,
  minMs = 5000,
  maxMs = 20000,
}: Props) {
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    void import("@/assets/loading.json").then((m) => {
      if (alive) setData(m.default);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let done = false;
    const start = Date.now();
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };

    const hardCap = window.setTimeout(finish, maxMs);
    const work = preload ? preload() : Promise.resolve();
    void Promise.resolve(work)
      .catch(() => {})
      .then(() => {
        const elapsed = Date.now() - start;
        const wait = Math.max(0, minMs - elapsed);
        window.setTimeout(finish, wait);
      });

    return () => {
      done = true;
      window.clearTimeout(hardCap);
    };
  }, [onDone, preload, minMs, maxMs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      {data ? (
        <ClientLottie
          animationData={data}
          size={140}
          loop
          autoplay
          renderer="canvas"
          keepLastFrame={false}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "molly-spin 0.8s linear infinite",
          }}
        />
      )}
      <style>{`@keyframes molly-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
