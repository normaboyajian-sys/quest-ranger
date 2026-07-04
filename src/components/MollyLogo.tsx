import { forwardRef, useImperativeHandle, useState } from "react";

export type MollyLogoHandle = { play: () => void };

export const MollyLogo = forwardRef<MollyLogoHandle, { size?: number }>(function MollyLogo(
  { size = 36 },
  handleRef,
) {
  const [pulseKey, setPulseKey] = useState(0);

  useImperativeHandle(handleRef, () => ({
    play: () => setPulseKey((key) => key + 1),
  }), []);

  return (
    <span
      key={pulseKey}
      className="molly-logo-mark"
      style={{ width: size, height: size }}
      aria-label="Molly"
      role="img"
    >
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
        <path d="M14 32V16l10 11 10-11v16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 36h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
});