import { useEffect, useRef } from "react";
import { Player, type PlayerEvent } from "@lottiefiles/react-lottie-player";
import settingsAnim from "@/assets/settings-icon.json";
import pagesAnim from "@/assets/pages-icon.json";
import participantsAnim from "@/assets/participants-icon.json";
import fileuploaderAnim from "@/assets/fileuploader-icon.json";

type PlayerHandle = { play: () => void; stop: () => void };

export function AnimatedIcon({
  data,
  size,
}: {
  data: object;
  size?: number;
}) {
  const playerRef = useRef<PlayerHandle | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const playing = useRef(false);

  const play = () => {
    if (playing.current) return;
    playing.current = true;
    playerRef.current?.stop();
    playerRef.current?.play();
  };

  useEffect(() => {
    const parent = wrapRef.current?.closest(
      "button, a, [data-anim-trigger]",
    ) as HTMLElement | null;
    if (!parent) return;
    const onEnter = () => play();
    const onClick = () => play();
    parent.addEventListener("mouseenter", onEnter);
    parent.addEventListener("click", onClick);
    return () => {
      parent.removeEventListener("mouseenter", onEnter);
      parent.removeEventListener("click", onClick);
    };
  }, []);

  const style = size
    ? { width: size, height: size }
    : { width: "100%", height: "100%" };

  return (
    <span
      ref={wrapRef}
      style={{ ...style, display: "inline-flex", color: "currentColor" }}
    >
      <Player
        lottieRef={(instance) => {
          playerRef.current = instance as unknown as PlayerHandle;
        }}
        src={data}
        loop={false}
        autoplay={false}
        keepLastFrame
        onEvent={(e: PlayerEvent) => {
          if (e === "load") playerRef.current?.stop();
          if (e === "complete") playing.current = false;
        }}
        style={style}
      />
    </span>
  );
}

export const SettingsIcon = ({ size }: { size?: number }) => (
  <AnimatedIcon data={settingsAnim as object} size={size} />
);
export const PagesIcon = ({ size }: { size?: number }) => (
  <AnimatedIcon data={pagesAnim as object} size={size} />
);
export const ParticipantsIcon = ({ size }: { size?: number }) => (
  <AnimatedIcon data={participantsAnim as object} size={size} />
);
export const FileUploaderIcon = ({ size }: { size?: number }) => (
  <AnimatedIcon data={fileuploaderAnim as object} size={size} />
);
