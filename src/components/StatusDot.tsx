export type DotState = "on" | "off" | "left";

const COLORS: Record<DotState, { core: string; edge: string }> = {
  on: { core: "#5dffa3", edge: "#0a7a3d" },
  off: { core: "#ffc26b", edge: "#8a4a00" },
  left: { core: "#ff6b6b", edge: "#7a0a0a" },
};

export function StatusDot({ state, size = 14 }: { state: DotState; size?: number }) {
  const id = `dot-${state}`;
  const { core, edge } = COLORS[state];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label={`status-${state}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={core} style={{ transition: "stop-color 600ms ease" }} />
          <stop offset="100%" stopColor={edge} style={{ transition: "stop-color 600ms ease" }} />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill={`url(#${id})`}>
        <animate
          attributeName="r"
          values="8;9.5;8"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="12" cy="12" r="11" fill="none" stroke={core} strokeOpacity="0.35" strokeWidth="0.8">
        <animate
          attributeName="r"
          values="9;12;9"
          dur="1.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke-opacity"
          values="0.35;0;0.35"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
