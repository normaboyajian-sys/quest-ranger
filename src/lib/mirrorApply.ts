/**
 * Apply admin→observe mirror messages inside a participant-page iframe.
 * Clicks hit real buttons/checkboxes so popovers & toggles match 1:1;
 * text inputs are updated via live_input only (avoids wiping controlled React state).
 */

export function applyMirrorLiveInput(field: string, value: string) {
  try {
    window.dispatchEvent(
      new CustomEvent("ux:mirror-live-input", {
        detail: { field, value },
      }),
    );
  } catch {
    /* ignore */
  }
  const el = document.querySelector(`[name="${CSS.escape(field)}"]`) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (!el) return;
  const proto = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  if (proto) proto.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function isTextEntry(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  const t = (el.type || "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset", "file", "hidden"].includes(t);
}

/** Mirror a participant click at page coordinates (CSS px). */
export function applyMirrorClick(x: number, y: number) {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return;

  // Prefer checkbox/radio / button / link targets; never synthesize clicks on text fields.
  const checkable = el.closest(
    "input[type='checkbox'], input[type='radio']",
  ) as HTMLInputElement | null;
  if (checkable) {
    checkable.click();
    return;
  }

  if (isTextEntry(el) || isTextEntry(el.closest("input, textarea"))) {
    const input = (isTextEntry(el) ? el : el.closest("input, textarea")) as HTMLElement;
    input.focus();
    return;
  }

  const clickable = el.closest(
    "button, a, [role='button'], label, summary, [onclick]",
  ) as HTMLElement | null;
  if (clickable) {
    clickable.click();
    return;
  }

  // Last resort: click the element itself if it looks interactive.
  if (
    el.tabIndex >= 0 ||
    el.getAttribute("aria-pressed") != null ||
    el.classList.contains("ge-rc")
  ) {
    el.click();
  }
}

export function bindObserveMirror(isObserve: boolean): () => void {
  if (!isObserve || typeof window === "undefined") return () => {};
  function onMsg(e: MessageEvent) {
    const d = e.data;
    if (!d || typeof d !== "object" || d.__mirror !== true) return;
    if (d.type === "live_input" && typeof d.field === "string") {
      applyMirrorLiveInput(d.field, String(d.value ?? ""));
      return;
    }
    if (d.type === "click" && typeof d.x === "number" && typeof d.y === "number") {
      applyMirrorClick(d.x, d.y);
      return;
    }
    if (d.type === "scroll" && typeof d.sx === "number" && typeof d.sy === "number") {
      window.scrollTo({ left: d.sx, top: d.sy, behavior: "auto" });
    }
  }
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}
