import type { ReactNode } from "react";

export function PanelModal({
  title,
  onClose,
  children,
  accentDot,
  maxWidth = 360,
  className,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  accentDot?: string;
  maxWidth?: number;
  className?: string;
}) {
  return (
    <div className="panel-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`panel-modal ${className ?? ""}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="panel-modal-head">
          <div className="panel-modal-title-row">
            {accentDot && (
              <span
                className="panel-modal-dot"
                style={{ background: accentDot, boxShadow: `0 0 10px ${accentDot}` }}
              />
            )}
            <div className="panel-modal-title">{title}</div>
          </div>
          <button
            type="button"
            className="panel-modal-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="panel-modal-body">{children}</div>
      </div>
    </div>
  );
}
