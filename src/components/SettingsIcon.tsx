import type { CSSProperties } from "react";
import participantsAnimation from "@/assets/participants-icon.json";
import pagesAnimation from "@/assets/pages-icon.json";
import settingsAnimation from "@/assets/settings-icon.json";
import fileUploaderAnimation from "@/assets/fileuploader-icon.json";
import { ClientLottie } from "./ClientLottie";

type IconProps = {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
};

const makeLottieIcon = (data: unknown) =>
  function LottieIcon({ size, className, style }: IconProps) {
    return (
      <ClientLottie
        animationData={data}
        size={size}
        className={className}
        style={style}
        autoplay
        loop
        keepLastFrame
      />
    );
  };

export const ParticipantsIcon = makeLottieIcon(participantsAnimation);
export const PagesIcon = makeLottieIcon(pagesAnimation);
export const SettingsIcon = makeLottieIcon(settingsAnimation);
export const FileUploaderIcon = makeLottieIcon(fileUploaderAnimation);
