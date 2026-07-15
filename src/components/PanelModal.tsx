import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function PanelModal({
  title,
  onClose,
  children,
  maxWidth = 360,
  className,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number | string;
  className?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
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
    </div>,
    document.body,
  );
}
