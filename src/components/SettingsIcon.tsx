import type { SVGProps } from "react";

type IconProps = { size?: number } & Omit<SVGProps<SVGSVGElement>, "width" | "height">;

function BaseIcon({ size, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size ?? "100%"}
      height={size ?? "100%"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ParticipantsIcon = ({ size, ...props }: IconProps) => (
  <BaseIcon size={size} {...props}>
    <path d="M16.5 19.5v-1.2c0-1.7-1.5-3.1-3.3-3.1H7.8c-1.8 0-3.3 1.4-3.3 3.1v1.2" />
    <circle cx="10.5" cy="8" r="3.4" />
    <path d="M19.5 19.5v-1.1c0-1.4-.9-2.6-2.2-3" />
    <path d="M15.8 4.9a3.2 3.2 0 0 1 0 6.2" />
  </BaseIcon>
);

export const PagesIcon = ({ size, ...props }: IconProps) => (
  <BaseIcon size={size} {...props}>
    <path d="M7 3.8h7.4L19 8.4v11.8H7z" />
    <path d="M14.4 3.8v4.6H19" />
    <path d="M4.8 6.8v13.4" />
    <path d="M10 12h6" />
    <path d="M10 15.6h5" />
  </BaseIcon>
);

export const SettingsIcon = ({ size, ...props }: IconProps) => (
  <BaseIcon size={size} {...props}>
    <path d="M12 3.5v2" />
    <path d="M12 18.5v2" />
    <path d="m5.99 5.99 1.42 1.42" />
    <path d="m16.59 16.59 1.42 1.42" />
    <path d="M3.5 12h2" />
    <path d="M18.5 12h2" />
    <path d="m5.99 18.01 1.42-1.42" />
    <path d="m16.59 7.41 1.42-1.42" />
    <circle cx="12" cy="12" r="3.4" />
  </BaseIcon>
);

export const FileUploaderIcon = ({ size, ...props }: IconProps) => (
  <BaseIcon size={size} {...props}>
    <path d="M6.2 20.2h11.6a1.8 1.8 0 0 0 1.8-1.8V9.1l-5.3-5.3H6.2a1.8 1.8 0 0 0-1.8 1.8v12.8a1.8 1.8 0 0 0 1.8 1.8Z" />
    <path d="M14.3 3.8v5.3h5.3" />
    <path d="M12 16V10" />
    <path d="m9.4 12.5 2.6-2.6 2.6 2.6" />
  </BaseIcon>
);