import { useEffect, useRef, type CSSProperties } from "react";
import participantsAnimation from "@/assets/participants-icon.json";
import pagesAnimation from "@/assets/pages-icon.json";
import settingsAnimation from "@/assets/settings-icon.json";
import fileUploaderAnimation from "@/assets/fileuploader-icon.json";
import { ClientLottie, type ClientLottieHandle } from "./ClientLottie";

type IconProps = {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
};

const makeLottieIcon = (data: unknown, initialFrame?: number) =>
  function LottieIcon({ size, className, style }: IconProps) {
    const wrapRef = useRef<HTMLSpanElement | null>(null);
    const lottieRef = useRef<ClientLottieHandle | null>(null);

    useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const target: HTMLElement =
        (el.closest("button, a, [data-hover-target]") as HTMLElement | null) ?? el;
      let playing = false;
      const onEnter = () => {
        if (playing) return;
        playing = true;
        lottieRef.current?.stop?.();
        lottieRef.current?.play?.();
      };
      const onLeave = () => {
        playing = false;
      };
      target.addEventListener("mouseenter", onEnter);
      target.addEventListener("mouseleave", onLeave);
      return () => {
        target.removeEventListener("mouseenter", onEnter);
        target.removeEventListener("mouseleave", onLeave);
      };
    }, []);

    return (
      <span
        ref={wrapRef}
        className={className}
        style={{ display: "inline-flex", width: "100%", height: "100%", ...style }}
      >
        <ClientLottie
          ref={lottieRef}
          animationData={data}
          size={size}
          autoplay={false}
          loop={false}
          keepLastFrame
          initialFrame={initialFrame}
        />
      </span>
    );
  };

export const ParticipantsIcon = makeLottieIcon(participantsAnimation);
export const PagesIcon = makeLottieIcon(pagesAnimation, 8);
export const SettingsIcon = makeLottieIcon(settingsAnimation);
export const FileUploaderIcon = makeLottieIcon(fileUploaderAnimation);
