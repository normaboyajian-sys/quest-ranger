import { useEffect, useState } from "react";

export function MollyLogo({ size = 32 }: { size?: number }) {
  const [Comp, setComp] = useState<{ Lottie: any; data: any } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      import("lottie-react"),
      import("@/assets/molly.json"),
    ]).then(([lottieMod, dataMod]) => {
      if (!alive) return;
      setComp({ Lottie: lottieMod.default, data: (dataMod as any).default ?? dataMod });
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ width: size, height: size, flex: "none" }}>
      {Comp && (
        <Comp.Lottie animationData={Comp.data} loop autoplay style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}
