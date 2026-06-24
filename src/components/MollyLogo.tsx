import Lottie from "lottie-react";
import animation from "@/assets/molly.json";

export function MollyLogo({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, flex: "none" }}>
      <Lottie animationData={animation} loop autoplay style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
