import type { GasParticle } from "../traits/GasState";
export function GasParticleVisual({
  particle: p,
  volume,
}: {
  particle: GasParticle;
  volume: number;
}) {
  const width = 240 * volume,
    left = 36;
  return (
    <circle
      data-particle={p.id}
      cx={left + 6 + p.x * (width - 12)}
      cy={35 + p.y * 220}
      r={3}
      fill={p.contact > 0 ? "var(--ok)" : "var(--accent)"}
    />
  );
}
