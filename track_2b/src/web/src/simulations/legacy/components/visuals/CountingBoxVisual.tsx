export function CountingBoxVisual({ target }: { target: number }) {
  return (
    <g>
      <rect
        x={465}
        y={55}
        width={400}
        height={330}
        rx={24}
        fill="#eff7f1"
        stroke="#237f63"
        strokeWidth={2}
        strokeDasharray="8 6"
      />
      <text x={490} y={90} className="math-scene-label">
        Put {target} circles in this box
      </text>
    </g>
  );
}
