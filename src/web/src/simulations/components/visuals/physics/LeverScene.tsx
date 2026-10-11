"use client";

import { useId } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import type { LeverState } from "../../systems/physics/lever";
import { leverMeasure } from "../../systems/physics/lever";
import "./lever.css";

const number = (value: number) => Number(value.toPrecision(3)).toString();
export function LeverScene({ instance }: { instance: ModelInstance }) {
  const marker = useId().replaceAll(":", "");
  const state = instance.state as LeverState;
  const result = leverMeasure(state);
  const scale = 510 / state.length;
  const pivot = 85 + result.loadArm * scale;
  const radians = (result.angle * Math.PI) / 180;
  const left = {
    x: pivot - result.loadArm * scale * Math.cos(radians),
    y: 175 - result.loadTravel * scale,
  };
  const right = {
    x: pivot + result.effortArm * scale * Math.cos(radians),
    y: 175 + result.effortTravel * scale,
  };
  const forceScale = 70 / Math.max(state.loadForce, result.effortForce);
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
      <svg
        viewBox="0 0 680 330"
        role="img"
        aria-label={`Ideal crowbar: ${number(state.loadForce)} newton load, ${number(result.effortForce)} newton effort. Load arm ${number(result.loadArm)} metres; effort arm ${number(result.effortArm)} metres.${state.lifted ? ` Load rises ${number(result.loadTravel)} metres and effort end moves down ${number(result.effortTravel)} metres.` : " Horizontal balance."}`}
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
        <line
          x1={85}
          x2={595}
          y1={175}
          y2={175}
          stroke="var(--border)"
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <path
          d={`M${pivot - 23} 224L${pivot} 180L${pivot + 23} 224Z`}
          fill="var(--accent)"
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
          cy={175}
          r={6}
          fill="var(--panel)"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        <rect
          x={left.x - 18}
          y={left.y - 25}
          width={36}
          height={25}
          rx={3}
          fill="#996018"
        />
        {arrow(left.x, left.y - 32, state.loadForce, "#996018")}
        {arrow(right.x, right.y - 8, result.effortForce, "var(--accent)")}
        <text x={85} y={40} textAnchor="start" fill="#996018">
          Load {number(state.loadForce)} N
        </text>
        <text x={595} y={40} textAnchor="end" fill="var(--accent)">
          Effort {number(result.effortForce)} N
        </text>
        <path
          d={`M85 253V263H${pivot}V253M${pivot} 263H595V253`}
          fill="none"
          stroke="var(--text)"
          strokeWidth={1.5}
        />
        <text x={(85 + pivot) / 2} y={291} textAnchor="middle">
          {number(result.loadArm)} m
        </text>
        <text x={(595 + pivot) / 2} y={291} textAnchor="middle">
          {number(result.effortArm)} m
        </text>
        {state.lifted && (
          <>
            <path
              d={`M${left.x - 32} 175V${left.y}M${right.x + 24} 175V${right.y}`}
              stroke="var(--accent)"
              strokeWidth={3}
              fill="none"
            />
            <text x={340} y={320} textAnchor="middle">
              Load ↑ {number(result.loadTravel * 100)} cm · effort ↓{" "}
              {number(result.effortTravel * 100)} cm
            </text>
          </>
        )}
      </svg>
      <figcaption>
        {state.lifted
          ? `The effort end travels ${number(result.mechanicalAdvantage)} times as far as the load. Both ends transfer the same ideal work.`
          : "Move the pivot toward the load: a longer effort arm needs less force."}
      </figcaption>
    </figure>
  );
}
