export interface EclipseParameters {
  moonAngle: number;
  moonOffset: number;
  moonDistance: number;
}
export const celestialRadii = { sun: 55, earth: 22, moon: 8 } as const;
export function eclipseGeometry(p: EclipseParameters) {
  if (
    ![p.moonAngle, p.moonOffset, p.moonDistance].every(Number.isFinite) ||
    p.moonAngle < 0 ||
    p.moonAngle > 360 ||
    Math.abs(p.moonOffset) > 120 ||
    p.moonDistance < 70 ||
    p.moonDistance > 140
  )
    throw new Error("Celestial geometry outside supported bounds");
  const sun = { x: 80, y: 200, radius: celestialRadii.sun };
  const earth = { x: 430, y: 200, radius: celestialRadii.earth };
  const angle = (p.moonAngle * Math.PI) / 180;
  const moon = {
    x: earth.x + p.moonDistance * Math.cos(angle),
    y: earth.y + p.moonDistance * Math.sin(angle) + p.moonOffset,
    radius: celestialRadii.moon,
  };
  if (
    Math.hypot(moon.x - earth.x, moon.y - earth.y) <=
    moon.radius + earth.radius
  )
    throw new Error("Moon and Earth must not overlap in this geometry");
  // Finite-source shadow radius at a receiver plane along the source/occluder axis.
  function shadow(
    occluder: { x: number; y: number; radius: number },
    target: { x: number; y: number; radius: number },
  ) {
    const dx = occluder.x - sun.x,
      dy = occluder.y - sun.y;
    const distance = Math.hypot(dx, dy),
      ux = dx / distance,
      uy = dy / distance;
    const tx = target.x - occluder.x,
      ty = target.y - occluder.y;
    const behind = tx * ux + ty * uy;
    const offset = Math.abs(tx * uy - ty * ux);
    const umbra =
      occluder.radius - (behind * (sun.radius - occluder.radius)) / distance;
    const penumbra =
      occluder.radius + (behind * (sun.radius + occluder.radius)) / distance;
    return { behind, offset, umbra, penumbra, axis: { ux, uy } };
  }
  const solar = shadow(moon, earth),
    lunar = shadow(earth, moon);
  let event = "No eclipse";
  if (solar.behind > 0 && solar.offset < solar.penumbra + earth.radius)
    event = "Solar eclipse alignment (visibility depends on observer location)";
  else if (lunar.behind > 0 && lunar.offset < lunar.penumbra + moon.radius)
    event =
      lunar.umbra >= lunar.offset + moon.radius
        ? "Total lunar eclipse"
        : lunar.umbra + moon.radius > lunar.offset
          ? "Partial lunar eclipse"
          : "Penumbral lunar eclipse";
  return { sun, earth, moon, event, solar, lunar };
}
