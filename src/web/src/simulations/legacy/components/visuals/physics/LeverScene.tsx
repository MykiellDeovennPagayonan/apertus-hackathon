"use client";

import { useId } from "react";
import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import type { LeverState } from "../../systems/physics/lever";
import { leverMeasure } from "../../systems/physics/lever";
import "./lever.css";

const number = (value: number) => Number(value.toPrecision(2)).toString();
const force = (value: number) => Number(value.toPrecision(3)).toString();
export function LeverScene({ instance }: { instance: ModelInstance }) {
  const marker = useId().replaceAll(":", "");
  const state = instance.state as LeverState;
  const result = leverMeasure(state);
  const scale = 600 / state.length;
  const pivot = 80 + result.loadArm * scale;
  const radians = (result.angle * Math.PI) / 180;
  const left = {
    x: pivot - result.loadArm * scale * Math.cos(radians),
    y: 180 - result.loadTravel * scale,
  };
  const right = {
    x: pivot + result.effortArm * scale * Math.cos(radians),
    y: 180 + result.effortTravel * scale,
  };
  const forceScale = 58 / Math.max(state.loadForce, result.effortForce);
  const arrow = (x: number, y: number, force: number, color: string) => (
    <line
      x1={x}
      x2={x}
      y1={y - force * forceScale}
      y2={y}
      stroke={color}
      strokeWidth={3}
      markerEnd={`url(#${marker})`}
    />
  );
  return (
    <figure className="lever-scene">
      <h2>Where should you put the pivot to lift the load more easily?</h2>
      <svg
        viewBox="0 0 760 340"
        role="img"
        aria-label={`Ideal crowbar: object weight ${force(state.loadForce)} newtons; downward push needed to lift ${force(result.effortForce)} newtons. Pivot ${number(result.loadArm)} metres from the object and ${number(result.effortArm)} metres from the push.${state.lifted ? ` Object rises ${number(result.loadTravel * 100)} centimetres; push end moves down ${number(result.effortTravel * 100)} centimetres.` : " Load is lowered."}`}
      >
        <defs>
          <marker
            id={marker}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={5}
            markerHeight={5}
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10Z" fill="context-stroke" />
          </marker>
        </defs>
        <text className="lever-scene__label" x={48} y={30}>
          Object weight
        </text>
        <text className="lever-scene__force lever-scene__weight" x={48} y={64}>
          {force(state.loadForce)} N
        </text>
        <text className="lever-scene__label" x={712} y={30} textAnchor="end">
          Push needed to lift
        </text>
        <text
          className="lever-scene__force lever-scene__push"
          x={712}
          y={64}
          textAnchor="end"
        >
          {force(result.effortForce)} N
        </text>
        <text className="lever-scene__unit" x={380} y={64} textAnchor="middle">
          N = newtons of force
        </text>
        {state.lifted && (
          <line
            x1={80}
            x2={680}
            y1={180}
            y2={180}
            className="lever-scene__reference"
          />
        )}
        <path
          d={`M${pivot - 24} 228L${pivot} 185L${pivot + 24} 228Z`}
          fill="var(--accent)"
        />
        <path
          d={`M${pivot - 38} 230H${pivot + 38}`}
          stroke="var(--border)"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <line
          data-lever-bar="true"
          x1={left.x}
          x2={right.x}
          y1={left.y}
          y2={right.y}
          stroke="var(--text)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        <circle
          cx={pivot}
          cy={180}
          r={6}
          fill="var(--panel)"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        <rect
          x={left.x - 27}
          y={left.y - 40}
          width={54}
          height={40}
          rx={5}
          fill="#996018"
        />
        <path
          d={`M${left.x - 17} ${left.y - 40}v-8h34v8`}
          fill="none"
          stroke="#996018"
          strokeWidth={4}
        />
        {arrow(left.x, left.y - 55, state.loadForce, "#996018")}
        {arrow(right.x, right.y - 10, result.effortForce, "var(--accent)")}
        <text
          className="lever-scene__label"
          x={pivot}
          y={251}
          textAnchor="middle"
        >
          Pivot
        </text>
        <path
          d={`M80 271V279H${pivot}V271M${pivot} 279H680V271`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={2}
        />
        <text x={(80 + pivot) / 2} y={305} textAnchor="middle">
          {number(result.loadArm)} m
        </text>
        <text x={(680 + pivot) / 2} y={305} textAnchor="middle">
          {number(result.effortArm)} m
        </text>
        {state.lifted && (
          <>
            <path
              d={`M${left.x - 38} 180V${left.y}M${right.x + 24} 180V${right.y}`}
              stroke="var(--accent)"
              strokeWidth={3}
              fill="none"
            />
            <text
              className="lever-scene__travel"
              x={380}
              y={336}
              textAnchor="middle"
            >
              Object rises {number(result.loadTravel * 100)} cm · push end moves
              down {number(result.effortTravel * 100)} cm
            </text>
          </>
        )}
      </svg>
      <figcaption aria-live="polite">
        {state.lifted
          ? result.mechanicalAdvantage > 1
            ? "Less force, more movement: the push end moves farther than the object rises."
            : result.mechanicalAdvantage < 1
              ? "More force, less movement: the push end moves less than the object rises."
              : "With the pivot halfway along, both ends move the same distance."
          : result.mechanicalAdvantage > 1
            ? "The pivot is closer to the object, so lifting needs less force."
            : result.mechanicalAdvantage < 1
              ? "The pivot is closer to your push, so lifting needs more force."
              : "With the pivot halfway along, the push needed equals the object's weight."}
      </figcaption>
    </figure>
  );
}
