"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "holding" | "running";
type Input = "keyboard" | "pointer" | "activation";

export function useTimer(enabled: boolean, onSolve: (ms: number) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const current = useRef<Phase>("idle");
  const start = useRef(0);
  const heldBy = useRef<Input | null>(null);
  const frame = useRef(0);

  const transition = useCallback((next: Phase) => {
    current.current = next;
    setPhase(next);
  }, []);

  const cancel = useCallback(() => {
    if (current.current !== "holding") return;
    heldBy.current = null;
    transition("idle");
  }, [transition]);

  const press = useCallback((input: Input) => {
    if (current.current === "running") {
      const ms = performance.now() - start.current;
      cancelAnimationFrame(frame.current);
      setElapsed(ms);
      transition("idle");
      onSolve(ms);
    } else if (enabled && current.current === "idle") {
      heldBy.current = input;
      transition("holding");
    }
  }, [enabled, onSolve, transition]);

  const release = useCallback((input: Input) => {
    if (current.current !== "holding" || heldBy.current !== input) return;
    heldBy.current = null;
    start.current = performance.now();
    setElapsed(0);
    transition("running");
    const tick = (now: number) => {
      setElapsed(now - start.current);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [transition]);

  const activate = useCallback(() => {
    press("activation");
    release("activation");
  }, [press, release]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.defaultPrevented) return;
      if (current.current !== "running" && event.target instanceof HTMLElement && event.target.closest("button:focus-visible, a:focus-visible, input, textarea, select, [contenteditable], dialog")) return;
      if (!enabled && current.current !== "running") return;
      event.preventDefault();
      if (!event.repeat) press("keyboard");
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" && heldBy.current === "keyboard") {
        event.preventDefault();
        release("keyboard");
      }
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", cancel);
    };
  }, [enabled, press, release, cancel]);

  useEffect(() => () => {
    cancelAnimationFrame(frame.current);
  }, []);

  return { phase, elapsed, press, release, cancel, activate };
}
