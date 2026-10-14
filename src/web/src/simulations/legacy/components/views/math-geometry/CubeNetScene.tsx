import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import "./geometry.css";

type Square = { label: string; x: number; y: number; face: string };
const netX = 30,
  netY = 60;
const faceFill: Record<string, string> = {
  Bottom: "mg-fill-teal",
  Top: "mg-fill-green",
  Front: "mg-fill-orange",
  Back: "mg-fill-orange",
  Left: "mg-fill-green",
  Right: "mg-fill-teal",
};
const c = { x: 590, y: 190 },
  s = 92,
  w = s * Math.cos(Math.PI / 6);
const facePolygons: Record<string, number[][]> = {
  Top: [
    [c.x, c.y - s],
    [c.x + w, c.y - s / 2],
    [c.x, c.y],
    [c.x - w, c.y - s / 2],
  ],
  Front: [
    [c.x - w, c.y - s / 2],
    [c.x, c.y],
    [c.x, c.y + s],
    [c.x - w, c.y + s / 2],
  ],
  Right: [
    [c.x, c.y],
    [c.x + w, c.y - s / 2],
    [c.x + w, c.y + s / 2],
    [c.x, c.y + s],
  ],
};
const centre = (points: number[][]) => [
  points.reduce((t, p) => t + p[0], 0) / points.length,
  points.reduce((t, p) => t + p[1], 0) / points.length,
];

export function CubeNetScene({ instance }: { instance: ModelInstance }) {
  const squares = (instance.outputs.squares as Square[] | undefined) ?? [];
  const size = Math.min(
    52,
    280 / (1 + Math.max(0, ...squares.map((q) => q.y))),
  );
  const valid = Boolean(instance.outputs.valid);
  const folded = Boolean(instance.outputs.folded);
  const duplicates =
    (instance.outputs.duplicateFaces as string[] | undefined) ?? [];
  const open = (instance.outputs.openFaces as string[] | undefined) ?? [];
  const name = String(instance.outputs.shapeName);
  const lettersOn = (face: string) =>
    squares.filter((q) => q.face === face).map((q) => q.label);
  const clash = (q: Square) => folded && duplicates.includes(q.face);
  const hidden = ["Bottom", "Back", "Left"];
  const caption = !folded
    ? `${name}: six squares joined edge to edge. Will they close into a cube?`
    : valid
      ? `${name} folds into a closed cube: every square lands on a different face. A is opposite ${String(instance.outputs.oppositeOfA)}.`
      : `${name} does not make a cube: ${duplicates
          .map(
            (f) =>
              `${lettersOn(f).join(" and ")} both land on the ${f.toLowerCase()}`,
          )
          .join(
            "; ",
          )}, so the ${open.map((f) => f.toLowerCase()).join(" and ")} ${open.length > 1 ? "are" : "is"} left open.`;
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 360"
        role="img"
        aria-label={`${name} net of six lettered squares. ${folded ? (valid ? "Folded into a closed cube." : "Folding fails: squares collide and a face stays open.") : "Unfolded."}`}
      >
        <text x={netX} y={34} className="mg-strong">
          {name}
        </text>
        {squares.map((q) => (
          <g key={q.label} data-face={q.face}>
            <rect
              x={netX + q.x * size}
              y={netY + q.y * size}
              width={size}
              height={size}
              className={
                clash(q)
                  ? "mg-fill-problem"
                  : folded
                    ? faceFill[q.face]
                    : "mg-fill-faint"
              }
            />
            <text
              x={netX + q.x * size + size / 2}
              y={netY + q.y * size + (folded ? 24 : 32)}
              textAnchor="middle"
              className="mg-large"
            >
              {q.label}
            </text>
            {folded && (
              <text
                x={netX + q.x * size + size / 2}
                y={netY + q.y * size + 44}
                textAnchor="middle"
                className="mg-small"
              >
                {q.face}
              </text>
            )}
          </g>
        ))}
        {folded && (
          <g data-cube={valid ? "closed" : "open"}>
            {Object.entries(facePolygons).map(([face, points]) => {
              const letters = lettersOn(face);
              const [tx, ty] = centre(points);
              return (
                <g key={face}>
                  <polygon
                    points={points.map((p) => p.join(",")).join(" ")}
                    className={
                      letters.length === 0
                        ? "mg-dashed"
                        : letters.length > 1
                          ? "mg-fill-problem"
                          : faceFill[face]
                    }
                  />
                  <text
                    x={tx}
                    y={ty + 8}
                    textAnchor="middle"
                    className="mg-large"
                  >
                    {letters.length ? letters.join("+") : "open"}
                  </text>
                </g>
              );
            })}
            <text
              x={c.x}
              y={c.y + s + 40}
              textAnchor="middle"
              className="mg-small"
            >
              Hidden faces:{" "}
              {hidden
                .map(
                  (face) =>
                    `${face.toLowerCase()} ${lettersOn(face).join("+") || "open"}`,
                )
                .join(" · ")}
            </text>
          </g>
        )}
      </svg>
      <p className="mg-caption">{caption}</p>
    </section>
  );
}
