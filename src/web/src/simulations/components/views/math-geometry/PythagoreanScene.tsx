import type { ModelInstance } from "../../../runtime/contribution";
import "./pythagorean.css";

export function PythagoreanScene({ instance }: { instance: ModelInstance }) {
  const a = Number(instance.outputs.distance),
    b = Number(instance.outputs.height);
  const c = Number(instance.outputs.ladderLength);
  const number = (value: number) => Number(value.toFixed(2)).toString();
  const scale = 250 / Math.max(8, a, b);
  const footX = 60 + a * scale,
    contactY = 300 - b * scale;
  const squareScale = Math.min(290 / (a + 2 * b), 290 / (2 * a + b));
  const x = (value: number) => 450 + (value + b) * squareScale;
  const y = (value: number) => 345 - (value + a) * squareScale;
  const points = (vertices: number[][]) =>
    vertices.map(([px, py]) => `${x(px)},${y(py)}`).join(" ");
  return (
    <section
      className="pythagorean-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 395"
        role="img"
        aria-label={`A perpendicular wall and ground need a ${number(c)} metre ladder for ${number(a)} metres distance and ${number(b)} metres height. Squares on the legs add to the square on the ladder.`}
      >
        <path d="M 60 35 V 300 H 360" className="pythagorean-wall" />
        <path d="M 60 286 H 74 V 300" className="pythagorean-angle" />
        <line
          x1={footX}
          y1={300}
          x2={60}
          y2={contactY}
          className="pythagorean-ladder"
          data-distance={a}
          data-height={b}
        />
        <circle cx={footX} cy={300} r={5} className="pythagorean-foot" />
        <text x={(60 + footX) / 2} y={330} textAnchor="middle">
          {number(a)} m
        </text>
        <text x={48} y={(300 + contactY) / 2} textAnchor="end">
          {number(b)} m
        </text>
        <text
          x={Math.max(95, (60 + footX) / 2 + 18)}
          y={(300 + contactY) / 2 - 15}
        >
          {number(c)} m ladder
        </text>
        <text x={190} y={375} textAnchor="middle">
          Wall and ground meet at 90°
        </text>
        <polygon
          points={points([
            [0, 0],
            [a, 0],
            [a, -a],
            [0, -a],
          ])}
          className="pythagorean-square pythagorean-square--distance"
        />
        <polygon
          points={points([
            [0, 0],
            [0, b],
            [-b, b],
            [-b, 0],
          ])}
          className="pythagorean-square pythagorean-square--height"
        />
        <polygon
          points={points([
            [a, 0],
            [0, b],
            [b, a + b],
            [a + b, a],
          ])}
          className="pythagorean-square pythagorean-square--ladder"
        />
        <polygon
          points={points([
            [0, 0],
            [a, 0],
            [0, b],
          ])}
          className="pythagorean-triangle"
        />
        {a * squareScale >= 65 && (
          <text x={x(a / 2)} y={y(-a / 2)} textAnchor="middle">
            {number(Number(instance.outputs.distanceSquare))} m²
          </text>
        )}
        {b * squareScale >= 65 && (
          <text x={x(-b / 2)} y={y(b / 2)} textAnchor="middle">
            {number(Number(instance.outputs.heightSquare))} m²
          </text>
        )}
        <text x={x((a + b) / 2)} y={y((a + b) / 2)} textAnchor="middle">
          {number(Number(instance.outputs.ladderSquare))} m²
        </text>
        <text x={595} y={375} textAnchor="middle">
          {number(Number(instance.outputs.distanceSquare))} +{" "}
          {number(Number(instance.outputs.heightSquare))} ={" "}
          {number(Number(instance.outputs.ladderSquare))} m²
        </text>
      </svg>
    </section>
  );
}
