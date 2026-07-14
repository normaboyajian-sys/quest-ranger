import { forwardRef, useImperativeHandle, useRef } from "react";
import mollyAnimation from "@/assets/molly.json";
import { ClientLottie, type ClientLottieHandle } from "./ClientLottie";

export type MollyLogoHandle = { play: () => void };

export const MollyLogo = forwardRef<MollyLogoHandle, { size?: number }>(function MollyLogo(
  { size = 36 },
  handleRef,
) {
  const innerRef = useRef<ClientLottieHandle>(null);

  useImperativeHandle(
    handleRef,
    () => ({
      play: () => innerRef.current?.play?.(),
    }),
    [],
  );

  return (
    <ClientLottie
      ref={innerRef}
      animationData={mollyAnimation}
      size={size}
      autoplay
      loop={false}
      keepLastFrame
    />
  );
});
