import "./PendulumScene.css";
import { useState } from "react";
import type { ModelInstance } from "../../../../registry/contracts/domainContribution";

/** The metre scale changes only through explicit view controls, never with length. */
export function PendulumScene({ instance }: { instance: ModelInstance }) {
  const [zoom, setZoom] = useState(1);
  const scale = 18 * zoom;
  const x = 400 + Number(instance.outputs.x) * scale;
  const y = 60 - Number(instance.outputs.y) * scale;
  const length = Number(instance.parameters.length);
  const angle = Number(instance.outputs.angle);
  const amplitude = (Number(instance.parameters.amplitude) * Math.PI) / 180;
  const radius = length * scale;
  const startX = 400 - radius * Math.sin(amplitude);
  const endX = 400 + radius * Math.sin(amplitude);
  const endY = 60 + radius * Math.cos(amplitude);
  return (
    <figure className="pendulum-scene">
      <svg
        viewBox="0 0 800 480"
        role="img"
        aria-label={`Pendulum: ${length.toFixed(2)} metres, ${angle.toFixed(1)} degrees from vertical`}
      >
        <title>Pendulum on a fixed metre scale</title>
        <line
          className="pendulum-reference"
          x1="400"
          y1="60"
          x2="400"
          y2="430"
        />
        <path
          className="pendulum-swing-path"
          d={`M${startX} ${endY} A${radius} ${radius} 0 0 0 ${endX} ${endY}`}
        />
        <line className="pendulum-mount" x1="373" y1="60" x2="427" y2="60" />
        <line
          data-pendulum-rod
          className="pendulum-rod"
          x1="400"
          y1="60"
          x2={x}
          y2={y}
        />
        <circle className="pendulum-bob" cx={x} cy={y} r="12" />
        <circle cx={x - 3} cy={y - 3} r="3" fill="#fffbef" opacity="0.4" />
        <g className="pendulum-ruler">
          <line x1="720" y1="60" x2="720" y2="420" />
          {[0, 5, 10, 15, 20].map((metres) => (
            <g key={metres}>
              <line
                x1="714"
                y1={60 + metres * scale}
                x2="726"
                y2={60 + metres * scale}
              />
              <text x="735" y={65 + metres * scale}>
                {metres} m
              </text>
            </g>
          ))}
        </g>
        <text className="pendulum-length" x="400" y="465" textAnchor="middle">
          {length.toFixed(2)} m · {Math.abs(angle).toFixed(1)}° from vertical
        </text>
      </svg>
      <figcaption>
        <span>
          Dashed arc: starting swing. Same metre scale as you change length.
        </span>
        <details>
          <summary>Drawing scale</summary>
          <fieldset className="pendulum-view-controls">
            <legend className="sr-only">Drawing scale</legend>
            <button
              type="button"
              disabled={zoom <= 1}
              onClick={() => setZoom(Math.max(1, zoom / 2))}
            >
              Zoom out
            </button>
            <button
              type="button"
              disabled={zoom >= 16}
              onClick={() => setZoom(Math.min(16, zoom * 2))}
            >
              Zoom in
            </button>
            {zoom > 1 && (
              <button type="button" onClick={() => setZoom(1)}>
                Show full range
              </button>
            )}
          </fieldset>
        </details>
      </figcaption>
    </figure>
  );
}
