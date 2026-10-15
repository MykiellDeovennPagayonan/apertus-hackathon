"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/** Keeps a mounted Three canvas in sync when its builder host changes dimensions. */
export function ResponsiveThreeCanvas() {
  const gl = useThree((state) => state.gl);
  const setSize = useThree((state) => state.setSize);
  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;
    const sync = (width: number, height: number) => {
      if (width > 0 && height > 0) setSize(width, height);
    };
    const observer = new ResizeObserver(([entry]) =>
      sync(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(host);
    sync(host.clientWidth, host.clientHeight);
    return () => observer.disconnect();
  }, [gl, setSize]);
  return null;
}
