import { useCallback, type ChangeEvent } from "react";

type Emit = (field: string, value: string) => void;

/**
 * Returns an onChange handler that emits values for non-password fields only.
 * SECURITY: type="password" is hard-excluded.
 */
export function useTrackedInput(emit: Emit) {
  return useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const el = e.target;
      if (el instanceof HTMLInputElement && el.type === "password") return;
      const name = el.name || el.getAttribute("aria-label") || el.id || "unnamed";
      emit(name, el.value);
    },
    [emit],
  );
}
