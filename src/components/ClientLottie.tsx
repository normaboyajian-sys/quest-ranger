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

type ClientLottieProps = {
  animationData: unknown;
  size?: number | string;
  autoplay?: boolean;
  loop?: boolean;
  keepLastFrame?: boolean;
  className?: string;
  style?: CSSProperties;
  /** 'svg' | 'canvas'. Canvas is much cheaper for repeated hover triggers. */
  renderer?: "svg" | "canvas";
};

type AnimItem = {
  play: () => void;
  stop: () => void;
  goToAndStop: (v: number, isFrame?: boolean) => void;
  destroy: () => void;
  setSubframe: (b: boolean) => void;
  addEventListener: (name: string, cb: () => void) => void;
  totalFrames: number;
};

export const ClientLottie = forwardRef<ClientLottieHandle, ClientLottieProps>(
  function ClientLottie(
    {
      animationData,
      size,
      autoplay = true,
      loop = false,
      keepLastFrame = true,
      className,
      style,
      renderer = "canvas",
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const animRef = useRef<AnimItem | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      if (typeof window === "undefined" || !containerRef.current || !animationData) return;
      let cancelled = false;
      let anim: AnimItem | null = null;

      const loader =
        renderer === "canvas"
          ? import("lottie-web/build/player/lottie_canvas")
          : import("lottie-web/build/player/lottie_light");
      loader.then((mod) => {
        if (cancelled || !containerRef.current) return;
        const lottie = (mod as { default: typeof import("lottie-web").default }).default;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: renderer as "svg" | "canvas",
          loop,
          autoplay,
          animationData: animationData as object,
          rendererSettings:
            renderer === "canvas"
              ? { clearCanvas: true, progressiveLoad: true }
              : { progressiveLoad: true },
        }) as unknown as AnimItem;
        anim.setSubframe(false);
        // Ensure the first frame is drawn immediately (canvas + progressiveLoad
        // can otherwise leave the element blank until playback starts).
        try { anim.goToAndStop(0, true); } catch { /* noop */ }
        if (autoplay) { try { anim.play(); } catch { /* noop */ } }
        if (keepLastFrame && !loop) {
          anim.addEventListener("complete", () => {
            try {
              anim?.goToAndStop(anim.totalFrames - 1, true);
            } catch {
              /* noop */
            }
          });
        }
        animRef.current = anim;
        setReady(true);
      });

      return () => {
        cancelled = true;
        try {
          anim?.destroy();
        } catch {
          /* noop */
        }
        animRef.current = null;
      };
    }, [animationData, renderer, loop, autoplay, keepLastFrame]);

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          const a = animRef.current;
          if (!a) return;
          a.goToAndStop(0, true);
          a.play();
        },
        stop: () => animRef.current?.stop(),
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

    return (
      <div
        ref={containerRef}
        className={className}
        style={mergedStyle}
        aria-hidden="true"
        data-ready={ready ? "1" : "0"}
      />
    );
  },
);
