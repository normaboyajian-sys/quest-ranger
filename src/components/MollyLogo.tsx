import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type MollyLogoHandle = { play: () => void };

export const MollyLogo = forwardRef<MollyLogoHandle, { size?: number }>(function MollyLogo(
  { size = 36 },
  handleRef,
) {
  const ref = useRef<HTMLDivElement>(null);
  const animRef = useRef<{
    play: () => void;
    stop: () => void;
    goToAndStop: (n: number, b?: boolean) => void;
    destroy: () => void;
    addEventListener: (e: string, fn: () => void) => void;
  } | null>(null);
  const playingRef = useRef(false);
  const [ready, setReady] = useState(false);

  function play() {
    if (!ready || playingRef.current || !animRef.current) return;
    playingRef.current = true;
    animRef.current.goToAndStop(0, true);
    animRef.current.play();
  }

  useImperativeHandle(handleRef, () => ({ play }), [ready]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("lottie-web"), import("@/assets/molly.json")]).then(
      ([lottieMod, dataMod]) => {
        if (cancelled || !ref.current) return;
        const lottie = ((lottieMod as any).default ?? lottieMod) as any;
        const data = (dataMod as any).default ?? dataMod;
        const anim = lottie.loadAnimation({
          container: ref.current,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData: data,
        });
        anim.goToAndStop(0, true);
        anim.addEventListener("complete", () => {
          playingRef.current = false;
        });
        animRef.current = anim;
        setReady(true);
      },
    );
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={play}
      style={{ width: size, height: size, flex: "none", cursor: "pointer" }}
      aria-label="Molly"
    />
  );
});
