import { useRef } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import animationData from "@/assets/settings-icon.json";

export function SettingsIcon({ size = 16, hover }: { size?: number; hover?: boolean }) {
  const ref = useRef<LottieRefCurrentProps>(null);
  return (
    <span
      style={{ width: size, height: size, display: "inline-flex", color: "currentColor" }}
      onMouseEnter={() => {
        if (hover === undefined) {
          ref.current?.stop();
          ref.current?.play();
        }
      }}
    >
      <Lottie
        lottieRef={ref}
        animationData={animationData}
        loop={false}
        autoplay={false}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
