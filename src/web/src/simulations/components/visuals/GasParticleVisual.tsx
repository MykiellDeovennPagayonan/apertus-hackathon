import type { GasParticle } from "../traits/GasState";
export function GasParticleVisual({
  particle: p,
  volume,
}: {
  particle: GasParticle;
  volume: number;
}) {
  const width = 260 * volume,
    left = (600 - width) / 2;
  return (
    <circle
      data-particle={p.id}
      cx={left + 6 + p.x * (width - 12)}
      cy={31 + p.y * 228}
      r={3}
      fill={p.contact > 0 ? "var(--ok)" : "var(--accent)"}
    />
  );
}
