import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import "./pythagorean.css";

export function PythagoreanScene({ instance }: { instance: ModelInstance }) {
  const a = Number(instance.outputs.distance),
    b = Number(instance.outputs.height);
  const c = Number(instance.outputs.ladderLength);
  const number = (value: number) => Number(value.toFixed(2)).toString();
  const scale = 240 / Math.max(6, a, b);
  const footX = 60 + a * scale,
    contactY = 300 - b * scale;
  return (
    <section
      className="pythagorean-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="-90 0 510 355"
        role="img"
        aria-label={`A perpendicular wall and ground need a ${number(c)} metre ladder for ${number(a)} metres distance and ${number(b)} metres height.`}
      >
        <path d="M 60 55 V 300 H 360" className="pythagorean-wall" />
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
        <text x={48} y={(300 + contactY) / 2 + 22} textAnchor="end">
          wall height
        </text>
        <text x={82} y={282}>
          90°
        </text>
        <circle cx={footX} cy={300} r={5} className="pythagorean-foot" />
        <text x={(60 + footX) / 2} y={330} textAnchor="middle">
          a · {number(a)} m distance
        </text>
        <text x={48} y={(300 + contactY) / 2} textAnchor="end">
          b · {number(b)} m
        </text>
        <text
          x={Math.max(95, (60 + footX) / 2 + 18)}
          y={(300 + contactY) / 2 - 15}
        >
          c · {number(c)} m ladder
        </text>
      </svg>
      <div className="pythagorean-calculation">
        <div>
          <h3>Pythagorean theorem</h3>
          <p className="pythagorean-equation">
            a<sup>2</sup> + b<sup>2</sup> = c<sup>2</sup>
          </p>
        </div>
        <div>
          <p>Take the square root of both sides</p>
          <p
            className="pythagorean-equation"
            role="math"
            aria-label="c equals the square root of a squared plus b squared"
          >
            c ={" "}
            <span className="pythagorean-root">
              <span>√</span>
              <span className="pythagorean-radicand">
                a<sup>2</sup> + b<sup>2</sup>
              </span>
            </span>
          </p>
        </div>
        <div className="pythagorean-worked">
          <h3>Your ladder length</h3>
          <p
            className="pythagorean-equation"
            role="math"
            aria-label={`c equals the square root of ${number(a)} squared plus ${number(b)} squared, ${c === Number(number(c)) ? "equals" : "approximately"} ${number(c)} metres`}
          >
            c ={" "}
            <span className="pythagorean-root">
              <span>√</span>
              <span className="pythagorean-radicand">
                {number(a)}
                <sup>2</sup> + {number(b)}
                <sup>2</sup>
              </span>
            </span>{" "}
            {c === Number(number(c)) ? "=" : "≈"} <strong>{number(c)} m</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
