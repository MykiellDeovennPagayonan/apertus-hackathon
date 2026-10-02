export function OperationZonesVisual({
  subtract,
  height = 300,
}: {
  subtract: boolean;
  height?: number;
}) {
  return (
    <g>
      <rect x={25} y={55} width={510} height={height} rx={24} fill="#eff3fc" />
      <rect x={565} y={55} width={310} height={height} rx={24} fill="#fcf0eb" />
      <text x={50} y={92} className="math-scene-label">
        {subtract ? "Circles remaining" : "Bring the circles together"}
      </text>
      <text x={590} y={92} className="math-scene-label">
        {subtract ? "Taken away" : "Circles to add"}
      </text>
    </g>
  );
}
