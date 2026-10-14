import type { eclipseGeometry } from "../../systems/exploration/eclipse";

type Geometry = ReturnType<typeof eclipseGeometry>;
/** Presentation consumes authoritative geometry; it does not classify eclipses. */
export function EclipseVisual({ geometry }: { geometry: Geometry }) {
  const minY = Math.min(-20, geometry.moon.y - geometry.moon.radius - 35);
  const maxY = Math.max(420, geometry.moon.y + geometry.moon.radius + 35);
  const shadows = [
    { body: geometry.moon, shadow: geometry.solar },
    { body: geometry.earth, shadow: geometry.lunar },
  ];
  return (
    <figure className="eclipse-scene">
      <svg
        viewBox={`0 ${minY} 640 ${maxY - minY}`}
        role="img"
        aria-label={`Sun Earth Moon: ${geometry.event}`}
      >
        <circle
          cx={geometry.earth.x}
          cy={geometry.earth.y}
          r="100"
          fill="none"
          stroke="#a6b2a3"
          strokeDasharray="5 6"
        />
        {shadows.map(({ body, shadow }, index) => {
          const length = 280,
            { ux, uy } = shadow.axis;
          const distance = Math.hypot(
            body.x - geometry.sun.x,
            body.y - geometry.sun.y,
          );
          const penumbra =
            body.radius +
            (length * (geometry.sun.radius + body.radius)) / distance;
          const umbraLength = Math.min(
            length,
            (body.radius * distance) / (geometry.sun.radius - body.radius),
          );
          const polygon = (extent: number, radius: number) =>
            [
              [body.x - uy * body.radius, body.y + ux * body.radius],
              [
                body.x + ux * extent - uy * radius,
                body.y + uy * extent + ux * radius,
              ],
              [
                body.x + ux * extent + uy * radius,
                body.y + uy * extent - ux * radius,
              ],
              [body.x + uy * body.radius, body.y - ux * body.radius],
            ]
              .map((p) => p.join(","))
              .join(" ");
          return (
            <g key={index === 0 ? "moon-shadow" : "earth-shadow"}>
              <polygon
                points={polygon(length, penumbra)}
                fill="#718096"
                opacity="0.13"
              />
              <polygon
                points={polygon(
                  umbraLength,
                  Math.max(
                    0,
                    body.radius -
                      (umbraLength * (geometry.sun.radius - body.radius)) /
                        distance,
                  ),
                )}
                fill="#344054"
                opacity="0.25"
              />
            </g>
          );
        })}
        {[
          { ...geometry.sun, name: "Sun", color: "#f3be45" },
          { ...geometry.earth, name: "Earth", color: "#356fd4" },
          { ...geometry.moon, name: "Moon", color: "#a4a9b3" },
        ].map((body) => (
          <g key={body.name}>
            <circle
              cx={body.x}
              cy={body.y}
              r={body.radius}
              fill={body.color}
              stroke="#344054"
            />
            <text
              x={body.x}
              y={body.y + body.radius + 22}
              textAnchor="middle"
              fill="#30362e"
              fontSize="18"
            >
              {body.name}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        {geometry.event}. Scaled planar model; use the Moon controls to change
        alignment.
      </figcaption>
    </figure>
  );
}
