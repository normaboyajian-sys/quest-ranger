import { useEffect, useRef, useState, type ComponentType } from "react";
import settingsAnim from "@/assets/settings-icon.json";
import pagesAnim from "@/assets/pages-icon.json";
import participantsAnim from "@/assets/participants-icon.json";
import fileuploaderAnim from "@/assets/fileuploader-icon.json";

// NOTE: @lottiefiles/react-lottie-player pulls in lottie-web, which touches
// `document` at module init. Importing it eagerly crashes SSR for every route
// (all route files are loaded by the SSR entry to build the route tree). So we
// load it dynamically on the client only.

type PlayerHandle = { play: () => void; stop: () => void };
type PlayerEvent = string;
type PlayerProps = {
  lottieRef?: (instance: unknown) => void;
  src: object;
  loop?: boolean;
  autoplay?: boolean;
  keepLastFrame?: boolean;
  onEvent?: (e: PlayerEvent) => void;
  style?: React.CSSProperties;
};

let PlayerPromise: Promise<ComponentType<PlayerProps>> | null = null;
function loadPlayer(): Promise<ComponentType<PlayerProps>> {
  if (!PlayerPromise) {
    // Build the specifier at runtime so Vite's static analyzer doesn't pull
    // this into any server chunk. lottie-web (a transitive dep) touches
    // `document` at module init and crashes SSR.
    const spec = ["@lottiefiles", "react-lottie-player"].join("/");
    PlayerPromise = import(/* @vite-ignore */ spec).then(
      (m) => (m as { Player: ComponentType<PlayerProps> }).Player,
    );
  }
  return PlayerPromise;
}


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
  const [Player, setPlayer] = useState<ComponentType<PlayerProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlayer().then((P) => {
      if (!cancelled) setPlayer(() => P);
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

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
      {Player ? (
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
      ) : null}
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
