import { useEffect, useRef, useState } from "react";

export function MollyLogo({ size = 36 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const animRef = useRef<{ play: () => void; stop: () => void; goToAndStop: (n: number, b?: boolean) => void; destroy: () => void } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("lottie-web"),
      import("@/assets/molly.json"),
    ]).then(([lottieMod, dataMod]) => {
      if (cancelled || !ref.current) return;
      const lottie = (lottieMod as any).default ?? lottieMod;
      const data = (dataMod as any).default ?? dataMod;
      const anim = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: true,
        autoplay: false,
        animationData: data,
      });
      anim.goToAndStop(0, true);
      animRef.current = anim;
      setReady(true);
    });
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => ready && animRef.current?.play()}
      onMouseLeave={() => {
        if (!ready) return;
        animRef.current?.stop();
        animRef.current?.goToAndStop(0, true);
      }}
      style={{ width: size, height: size, flex: "none", cursor: "pointer" }}
      aria-label="Molly"
    />
  );
}
