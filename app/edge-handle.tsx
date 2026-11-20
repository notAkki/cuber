"use client";

import { useRef, type ReactNode } from "react";

type Props = {
  side: "left" | "right";
  label: string;
  controls: string;
  icon: ReactNode;
  onToggle: () => void;
};

export function EdgeHandle({ side, label, controls, icon, onToggle }: Props) {
  const start = useRef<{ id: number; x: number } | null>(null);
  const moved = useRef(false);
  const direction = side === "left" ? 1 : -1;

  return (
    <button className="edge-handle fade-during-solve" data-side={side} aria-label={label} title={label}
      aria-expanded={false} aria-controls={controls}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return;
        start.current = { id: event.pointerId, x: event.clientX };
        moved.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (start.current?.id !== event.pointerId) return;
        const distance = (event.clientX - start.current.x) * direction;
        if (Math.abs(distance) > 6) moved.current = true;
        event.currentTarget.style.setProperty("--pull", `${Math.min(22, Math.max(0, distance)) * direction}px`);
      }}
      onPointerUp={event => {
        if (start.current?.id !== event.pointerId) return;
        const distance = (event.clientX - start.current.x) * direction;
        start.current = null;
        event.currentTarget.style.removeProperty("--pull");
        if (distance >= 24) {
          moved.current = true;
          onToggle();
        }
      }}
      onLostPointerCapture={event => {
        if (start.current?.id !== event.pointerId) return;
        start.current = null;
        event.currentTarget.style.removeProperty("--pull");
      }}
      onClick={event => {
        if (event.detail === 0 || !moved.current) onToggle();
      }}>
      {icon}
    </button>
  );
}
