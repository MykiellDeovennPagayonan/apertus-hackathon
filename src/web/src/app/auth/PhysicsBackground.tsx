"use client";

import { useEffect, useRef, useState } from "react";
import "./physics-background.css";

/** Decorative, analytic motion: no simulation engine or React updates per frame. */
export default function PhysicsBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let width = 0;
    let height = 0;
    const circle = (x: number, y: number, radius: number, gold = false) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = gold ? "rgba(169,122,50,.35)" : "rgba(40,94,86,.3)";
      context.fill();
    };
    const line = (points: [number, number][]) => {
      context.beginPath();
      points.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    };
    const draw = () => {
      const t = elapsed.current / 1000;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = "rgba(40,94,86,.18)";
      context.lineWidth = 1;
      // A slow projectile follows y = v*t - g*t²/2; the dotted trail stays put.
      const span = Math.min(width * 0.23, 290);
      const x = width * 0.06;
      const floor = height * 0.72;
      const arcHeight = Math.min(height * 0.18, 160);
      const arc = (u: number): [number, number] => [
        x + span * u,
        floor - 4 * arcHeight * u * (1 - u),
      ];
      context.setLineDash([3, 7]);
      line(Array.from({ length: 51 }, (_, i) => arc(i / 50)));
      context.setLineDash([]);
      line([
        [x, floor + 14],
        [x + span, floor + 14],
      ]);
      const u = (t % 9) / 9;
      const [ballX, ballY] = arc(u);
      circle(ballX, ballY, 5, true);

      // Pendulum: rotation around a fixed pivot, with a quiet small-angle swing.
      const pivotX = width * 0.86;
      const pivotY = height * 0.17;
      const length = Math.min(height * 0.2, 175);
      const angle = 0.38 * Math.sin(t * 0.8);
      const bobX = pivotX + Math.sin(angle) * length;
      const bobY = pivotY + Math.cos(angle) * length;
      line([
        [pivotX - 22, pivotY],
        [pivotX + 22, pivotY],
      ]);
      line([
        [pivotX, pivotY],
        [bobX, bobY],
      ]);
      circle(pivotX, pivotY, 3);
      circle(bobX, bobY, 8, true);

      // Spring-mass oscillator, drawn as a single continuous notebook line.
      const springX = width * 0.87;
      const springY = height * 0.68;
      const springLength = 62 + 14 * Math.sin(t * 1.1);
      const spring: [number, number][] = [[springX, springY]];
      for (let i = 1; i < 17; i++)
        spring.push([
          springX + (i % 2 ? -8 : 8),
          springY + (i * springLength) / 18,
        ]);
      spring.push([springX, springY + springLength]);
      line(spring);
      circle(springX, springY + springLength + 7, 7);

      // Constant-velocity particles reflect at viewport edges, without randomness.
      const count = width < 540 ? 10 : 22;
      const reflect = (value: number, bound: number) => {
        const phase = ((value % (2 * bound)) + 2 * bound) % (2 * bound);
        return phase < bound ? phase : 2 * bound - phase;
      };
      for (let i = 0; i < count; i++) {
        const px =
          12 + reflect(i * 137 + t * (4 + (i % 5)), Math.max(1, width - 24));
        const py =
          12 + reflect(i * 89 + t * (i % 2 ? 3 : -4), Math.max(1, height - 24));
        circle(px, py, i % 3 === 0 ? 2.5 : 1.5);
      }
    };
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * scale);
      element.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      draw();
    };
    const tick = (timestamp: number) => {
      if (!previous) previous = timestamp;
      if (timestamp - previous >= 1000 / 30) {
        elapsed.current += Math.min(timestamp - previous, 100);
        previous = timestamp;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!paused && !motion.matches && !document.hidden)
        frame = requestAnimationFrame(tick);
      else draw();
    };
    resize();
    sync();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [paused]);

  return (
    <>
      <div className="auth-physics" aria-hidden="true">
        <canvas ref={canvas} />
      </div>
      <button
        className="auth-motion"
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? "Resume background motion" : "Pause background motion"}
      </button>
    </>
  );
}
