"use client";
import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
export const ControlsTarget = createContext<HTMLElement | null>(null);
export function ControlsOverlay({ children }: { children: ReactNode }) {
  const target = useContext(ControlsTarget);
  return target ? createPortal(children, target) : null;
}
