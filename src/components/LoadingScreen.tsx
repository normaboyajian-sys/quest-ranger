import { useEffect, useState } from "react";

type Props = {
  onDone: () => void;
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  return mounted ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(255,255,255,0.15)",
          borderTopColor: "#fff",
          borderRadius: "50%",
          animation: "molly-spin 0.9s linear infinite",
        }}
      />
      <style>{`@keyframes molly-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ) : null;
}
