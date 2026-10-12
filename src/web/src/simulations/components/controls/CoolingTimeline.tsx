"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import { COOLING_DURATION } from "../systems/physics/cooling";
import { ActionButton } from "./ActionButton";
import { NumberField } from "./NumberField";

export function CoolingTimeline({
  time,
  label,
  animated,
  onChange,
}: {
  time: number;
  label: string;
  animated: boolean;
  onChange: (time: number) => ActionResult;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const advance = useEffectEvent(() => {
    const next = Math.min(COOLING_DURATION, time + 1);
    const result = onChange(next);
    if (!result.accepted) setError(result.error);
    if (!result.accepted || next === COOLING_DURATION) setPlaying(false);
  });
  useEffect(() => {
    if (!playing || !animated) return;
    const timer = setInterval(advance, 1000 / speed);
    return () => clearInterval(timer);
  }, [playing, animated, speed]);

  const seek = (value: number) => {
    setPlaying(false);
    setError("");
    return onChange(value);
  };
  return (
    <div className="catalog-form">
      <div onPointerDown={() => setPlaying(false)}>
        <NumberField
          label={label}
          value={time}
          min={0}
          max={COOLING_DURATION}
          unit="min"
          presentation="slider"
          showNumber={false}
          onChange={seek}
        />
      </div>
      <div className="recipe-playback-row">
        <ActionButton
          intent="primary"
          pressed={playing}
          disabled={!playing && time >= COOLING_DURATION}
          onCommand={() => {
            setError("");
            setPlaying(!playing);
            return { accepted: true };
          }}
        >
          {playing ? "Pause" : "Play"}
        </ActionButton>
        <ActionButton onCommand={() => seek(0)}>Restart</ActionButton>
        <ActionButton
          label={`Playback speed ${speed}×. Change speed`}
          onCommand={() => {
            setSpeed(speed === 8 ? 1 : speed * 2);
            return { accepted: true };
          }}
        >
          <span aria-hidden="true">»</span>
          Speed {speed}×
        </ActionButton>
        <output>{time} min</output>
      </div>
      {playing && !animated && (
        <p className="catalog-help">
          Reduced motion is on. Use the slider to advance time.
        </p>
      )}
      {error && (
        <p role="alert" className="catalog-feedback catalog-feedback--error">
          {error}
        </p>
      )}
      <p className="catalog-help">
        The colder room cools the drink faster. Cooling slows near room
        temperature.
      </p>
    </div>
  );
}
