// Independent complete-elliptic-integral quadrature; the runtime inverts a
// different time coordinate. NIST DLMF 22.19(i), ideal pendulum released at rest.
module.exports.idealPendulumPeriod = (length, gravity, amplitude) => {
  const k = Math.sin((amplitude * Math.PI) / 360);
  const count = 8192;
  const step = Math.PI / (2 * count);
  let total = 0;
  for (let i = 0; i <= count; i++) {
    const value = 1 / Math.sqrt(1 - (k * Math.sin(i * step)) ** 2);
    total += value * (i === 0 || i === count ? 1 : i % 2 ? 4 : 2);
  }
  return (4 * Math.sqrt(length / gravity) * total * step) / 3;
};
