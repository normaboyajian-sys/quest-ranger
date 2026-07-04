import { useRef } from "react";
import { Player, type PlayerEvent } from "@lottiefiles/react-lottie-player";
import animationData from "@/assets/settings-icon.json";

type PlayerHandle = {
  play: () => void;
  stop: () => void;
};

export function SettingsIcon({ size = 16 }: { size?: number }) {
  const ref = useRef<PlayerHandle | null>(null);
  return (
    <span
      style={{ width: size, height: size, display: "inline-flex", color: "currentColor" }}
      onMouseEnter={() => {
        ref.current?.stop();
        ref.current?.play();
      }}
    >
      <Player
        lottieRef={(instance) => {
          ref.current = instance as unknown as PlayerHandle;
        }}
        src={animationData as object}
        loop={false}
        autoplay={false}
        keepLastFrame
        onEvent={(e: PlayerEvent) => {
          if (e === "load") ref.current?.stop();
        }}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
