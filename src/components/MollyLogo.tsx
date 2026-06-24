import { useEffect, useRef } from "react";

export function MollyLogo({ size = 36 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: { destroy: () => void } | null = null;
    let cancelled = false;
    Promise.all([
      import("lottie-web"),
      import("@/assets/molly.json"),
    ]).then(([lottieMod, dataMod]) => {
      if (cancelled || !ref.current) return;
      const lottie = (lottieMod as any).default ?? lottieMod;
      const data = (dataMod as any).default ?? dataMod;
      anim = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: data,
      });
    });
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ width: size, height: size, flex: "none" }}
      aria-label="Molly"
    />
  );
}
