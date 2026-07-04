import { lazy, Suspense, useRef } from "react";
import type { LottieRefCurrentProps } from "lottie-react";
import animationData from "@/assets/settings-icon.json";

const Lottie = lazy(() => import("lottie-react"));

export function SettingsIcon({ size = 16 }: { size?: number }) {
  const ref = useRef<LottieRefCurrentProps>(null);
  return (
    <span
      style={{ width: size, height: size, display: "inline-flex", color: "currentColor" }}
      onMouseEnter={() => {
        ref.current?.stop();
        ref.current?.play();
      }}
    >
      <Suspense fallback={<span style={{ width: size, height: size }} />}>
        {typeof window !== "undefined" && (
          <Lottie
            lottieRef={ref}
            animationData={animationData}
            loop={false}
            autoplay={false}
            style={{ width: size, height: size }}
          />
        )}
      </Suspense>
    </span>
  );
}
