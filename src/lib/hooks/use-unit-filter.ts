import { useState, useEffect } from "react";

const UNIT_STORAGE_KEY = "visus-selected-unit";

/**
 * Hook that returns the currently selected unit ID.
 * Listens for changes from the header's unit selector.
 */
export function useUnitFilter(): string {
  const [unitId, setUnitId] = useState("");

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem(UNIT_STORAGE_KEY);
    if (saved) setUnitId(saved);

    // Listen for changes
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? "";
      setUnitId(detail);
    };
    window.addEventListener("unit-changed", handler);
    return () => window.removeEventListener("unit-changed", handler);
  }, []);

  return unitId;
}
