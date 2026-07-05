import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export type ClientLottieHandle = {
  play: () => void;
  stop: () => void;
};

type PlayerLike = {
  play?: () => void;
  stop?: () => void;
};

type ClientLottieProps = {
  animationData: unknown;
  size?: number | string;
  autoplay?: boolean;
  loop?: boolean;
  keepLastFrame?: boolean;
  className?: string;
  style?: CSSProperties;
};

export const ClientLottie = forwardRef<ClientLottieHandle, ClientLottieProps>(
  function ClientLottie(
    { animationData, size, autoplay = true, loop = false, keepLastFrame = true, className, style },
    ref,
  ) {
    const [Player, setPlayer] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
    const playerRef = useRef<PlayerLike | null>(null);

    useEffect(() => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      let cancelled = false;
      import("@lottiefiles/react-lottie-player")
        .then((m) => {
          if (!cancelled) {
            setPlayer(() => m.Player as unknown as React.ComponentType<Record<string, unknown>>);
          }
        })
        .catch((err) => {
          console.error("Failed to load lottie player", err);
        });
      return () => {
        cancelled = true;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        play: () => playerRef.current?.play?.(),
        stop: () => playerRef.current?.stop?.(),
      }),
      [],
    );

    const resolvedSize = size ?? "100%";
    const mergedStyle: CSSProperties = {
      width: resolvedSize,
      height: resolvedSize,
      display: "inline-block",
      ...style,
    };

    if (!Player) {
      return <span className={className} style={mergedStyle} aria-hidden="true" />;
    }

    return (
      <Player
        ref={playerRef as unknown as React.Ref<unknown>}
        autoplay={autoplay}
        loop={loop}
        keepLastFrame={keepLastFrame}
        src={animationData as object}
        style={mergedStyle}
        className={className}
      />
    );
  },
);
