import type { GasParticle, GasState } from "../traits/GasState";
/** Seeded representative dots; normalized positions make volume remapping deterministic. */
export function gasParticles(amount: number): GasParticle[] {
  let seed = 42;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: Math.round(40 * amount) }, (_, id) => {
    const angle = random() * 2 * Math.PI;
    return {
      id,
      x: random(),
      y: random(),
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      contact: 0,
    };
  });
}
export function GasParticleIllustrationSystem(
  particles: GasParticle[],
  inputs: GasState,
  delta: number,
): GasParticle[] {
  if (!inputs.playing || !Number.isFinite(delta) || delta <= 0)
    return particles;
  const dt = Math.min(delta, 0.05),
    speed = 0.2 * Math.sqrt(inputs.temperature / 300);
  return particles.map((p) => {
    let x = p.x + (p.vx * speed * dt) / inputs.volume,
      y = p.y + p.vy * speed * dt;
    let vx = p.vx,
      vy = p.vy,
      contact = Math.max(0, p.contact - dt);
    if (x < 0 || x > 1) {
      x = x < 0 ? -x : 2 - x;
      vx = -vx;
      contact = 0.12;
    }
    if (y < 0 || y > 1) {
      y = y < 0 ? -y : 2 - y;
      vy = -vy;
      contact = 0.12;
    }
    return { ...p, x, y, vx, vy, contact };
  });
}
