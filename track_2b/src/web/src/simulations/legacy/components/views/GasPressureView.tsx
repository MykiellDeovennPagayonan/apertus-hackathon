"use client";
import { useState } from "react";
import { useGasStore } from "../../runtime/gasSession";
import { dispatchCommand, getActiveDefinition } from "../../runtime/session";
import { GasContainerVisual } from "../visuals/GasContainerVisual";
import { GasParticleVisual } from "../visuals/GasParticleVisual";
import { ControlsOverlay } from "./ControlsOverlay";
import "./learning.css";
export function PressureReadout({ pressure }: { pressure: number }) {
  return (
    <output aria-label="Pressure" className="learning-pressure">
      Pressure <strong>{pressure.toFixed(2)} kPa</strong>
    </output>
  );
}
export function GasPressureView() {
  const s = useGasStore();
  const [showParticles, setShowParticles] = useState(true);
  const slider = (
    key: "volume" | "temperature" | "amount",
    label: string,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) => (
    <label className="learning-slider">
      {label}:{" "}
      <strong>
        {s.inputs[key]} {unit}
      </strong>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={s.inputs[key]}
        onChange={(e) =>
          dispatchCommand("gas", {
            type: `SET_${key.toUpperCase()}`,
            value: Number(e.target.value),
          })
        }
      />
    </label>
  );
  return (
    <main className="learning-experiment">
      <h1>How gas pressure works</h1>
      <p>Make the container smaller and watch the pressure rise.</p>
      <svg
        viewBox="0 0 600 290"
        role="img"
        aria-label={`Gas container with ${s.particles.length} representative particles`}
        className="learning-scene"
      >
        <GasContainerVisual volume={s.inputs.volume}>
          {showParticles &&
            s.particles.map((p) => (
              <GasParticleVisual
                key={p.id}
                particle={p}
                volume={s.inputs.volume}
              />
            ))}
        </GasContainerVisual>
      </svg>
      <section
        className="experiment-interaction"
        aria-label="Try the experiment"
      >
        <div className="learning-main-controls">
          {slider("volume", "Volume", 0.25, 2, 0.05, "L")}
          <PressureReadout pressure={s.metrics.pressureKPa} />
        </div>
        <p>
          Temperature: {s.inputs.temperature} K · Amount of gas:{" "}
          {s.inputs.amount} mmol. Both stay fixed when you change volume.
        </p>
        <div className="learning-actions">
          <button
            type="button"
            onClick={() =>
              dispatchCommand("gas", {
                type: "SET_PLAYING",
                value: !s.inputs.playing,
              })
            }
          >
            {s.inputs.playing ? "Pause motion" : "Resume motion"}
          </button>
          <button
            type="button"
            className="experiment-reset"
            onClick={() => dispatchCommand("gas", { type: "RESET" })}
          >
            Reset
          </button>
        </div>
      </section>
      <ControlsOverlay>
        <details open>
          <summary>Gas settings</summary>
          <label>
            <input
              type="checkbox"
              checked={showParticles}
              onChange={(e) => setShowParticles(e.target.checked)}
            />{" "}
            Show illustrative particles
          </label>
          {slider("temperature", "Temperature", 100, 600, 10, "K")}
          {slider("amount", "Amount of gas", 0.1, 5, 0.1, "mmol")}
        </details>
        <details>
          <summary>Model details</summary>
          {getActiveDefinition()?.assumptions.map((a) => (
            <p key={a}>{a}</p>
          ))}
          <p>
            Pausing the illustration leaves the equilibrium calculation active.
          </p>
        </details>
      </ControlsOverlay>
    </main>
  );
}
