import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import "./geometry.css";

const n = (value: number, places = 2) =>
  Number(value.toFixed(places)).toString();

export function TreeHeightScene({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs;
  const d = Number(o.observerDistance),
    angle = Number(o.sightAngle),
    eye = Number(o.eyeHeight),
    rise = Number(o.rise),
    line = Number(o.lineHeight),
    tree = Number(o.treeHeight),
    miss = Number(o.miss);
  const aimed = Boolean(o.aimedAtTop);
  const ground = 340,
    observerX = 90;
  // The scale depends on the tree, not the aim; it only shrinks beyond 30 m away.
  const scale = Math.min(560 / Math.max(d, 30), 280 / tree);
  const treeX = observerX + d * scale,
    eyeY = ground - eye * scale,
    topY = ground - tree * scale,
    hitY = ground - line * scale;
  const crown = Math.min(40, (tree * scale) / 3);
  const arc = Math.min(60, (d * scale) / 2);
  const radians = (angle * Math.PI) / 180;
  const aboveView = hitY < 20;
  const endY = Math.max(20, hitY);
  const endX = aboveView
    ? observerX + (eyeY - endY) / Math.tan(radians)
    : treeX;
  const status = aimed
    ? `The sight line touches the top: the tree is about ${n(line, 1)} m tall.`
    : miss > 0
      ? `The line passes ${n(miss, 1)} m above the top. Aim lower.${aboveView ? " The sight line continues above this view." : ""}`
      : `The line meets the tree ${n(-miss, 1)} m below the top. Aim higher.`;
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 380"
        role="img"
        aria-label={`An observer ${n(d)} metres from a tree aims ${n(angle, 1)} degrees up. ${status}`}
      >
        <line x1={20} y1={ground} x2={760} y2={ground} className="mg-line" />
        <rect
          x={treeX - 6}
          y={topY + crown}
          width={12}
          height={ground - topY - crown}
          className="mg-fill-orange"
        />
        <ellipse
          cx={treeX}
          cy={topY + crown}
          rx={Math.min(42, 10 + (tree * scale) / 6)}
          ry={crown}
          className="mg-fill-green"
          data-tree={tree}
        />
        <line
          x1={observerX}
          y1={ground}
          x2={observerX}
          y2={eyeY}
          className="mg-line"
        />
        <circle cx={observerX} cy={eyeY} r={6} className="mg-fill-teal" />
        <line
          x1={observerX}
          y1={eyeY}
          x2={treeX}
          y2={eyeY}
          className="mg-dashed"
        />
        <line x1={treeX} y1={eyeY} x2={treeX} y2={endY} className="mg-dashed" />
        <line
          x1={observerX}
          y1={eyeY}
          x2={endX}
          y2={endY}
          className="mg-accent"
          data-angle={angle}
        />
        {aboveView ? (
          <path
            d="M-10 -5L0 0L-10 5"
            transform={`translate(${endX} ${endY}) rotate(${-angle})`}
            className="mg-accent"
            data-offscreen="true"
          />
        ) : (
          <circle
            cx={treeX}
            cy={hitY}
            r={6}
            className={aimed ? "mg-fill-accent" : "mg-fill-problem"}
            data-aimed={aimed}
          />
        )}
        <path
          d={`M ${observerX + arc} ${eyeY} A ${arc} ${arc} 0 0 0 ${observerX + arc * Math.cos(radians)} ${eyeY - arc * Math.sin(radians)}`}
          className="mg-line"
        />
        <text x={observerX + arc + 8} y={eyeY - 8}>
          {n(angle, 1)}°
        </text>
        <text x={(observerX + treeX) / 2} y={ground + 24} textAnchor="middle">
          {n(d)} m
        </text>
        <text
          x={observerX - 10}
          y={(ground + eyeY) / 2 + 5}
          textAnchor="end"
          className="mg-small"
        >
          eyes {n(eye)} m
        </text>
        <text
          x={treeX + 14}
          y={Math.max(20, Math.min(ground - 10, hitY + 5))}
          className={aimed ? "mg-strong" : "mg-small"}
        >
          {n(eye)} + {n(d)} × tan {n(angle, 1)}° = {n(line)} m
        </text>
      </svg>
      <p className="mg-caption">
        {status} Moving changes the angle to the top, never the tree. Height =
        eye height + distance × tan(angle)
        {aimed ? "" : `; here the line rises ${n(rise)} m above your eyes`}.
      </p>
    </section>
  );
}
