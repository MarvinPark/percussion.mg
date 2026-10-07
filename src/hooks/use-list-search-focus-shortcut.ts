"use client";

import { useEffect, type RefObject } from "react";

function isFindShortcut(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== "f") return false;
  return event.metaKey || event.ctrlKey;
}

function shouldSkipFindShortcut() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return Boolean(
    active.closest('[role="dialog"], [aria-modal="true"]'),
  );
}

export function useListSearchFocusShortcut(
  inputRef: RefObject<HTMLInputElement | null>,
) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isFindShortcut(event)) return;
      if (shouldSkipFindShortcut()) return;
      const input = inputRef.current;
      if (!input) return;

      event.preventDefault();
      input.focus();
      input.select();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputRef]);
}
