import { num, object, validateValue } from "../../../runtime/parameterSchema";
export const fibreParameters = object({
  core: num(1, 2, "1"),
  cladding: num(1, 2, "1"),
  entry: num(0, 80, "deg"),
  external: num(1, 1.5, "1"),
});
export const fibreDefaults = {
  core: 1.5,
  cladding: 1.45,
  entry: 15,
  external: 1,
};
export function fibreState(p: Record<string, unknown>) {
  const s = { ...fibreDefaults, ...p };
  validateValue(fibreParameters, s);
  if (s.external * Math.sin((s.entry * Math.PI) / 180) > s.core)
    throw new Error(
      "Entry face totally reflects; this model requires a transmitted entry ray",
    );
  return s;
}
export function fibreMeasure(s: ReturnType<typeof fibreState>) {
  const direction = Math.asin(
      (s.external * Math.sin((s.entry * Math.PI) / 180)) / s.core,
    ),
    incidence = 90 - (direction * 180) / Math.PI;
  const critical =
    s.core > s.cladding
      ? (Math.asin(s.cladding / s.core) * 180) / Math.PI
      : null;
  const ratio = (s.core / s.cladding) * Math.cos(direction);
  const confined = ratio > 1;
  const transmittedAngle = confined
    ? null
    : (Math.asin(Math.min(1, ratio)) * 180) / Math.PI;
  // Unpolarized Fresnel power reflectance at a lossless planar boundary.
  const ci = Math.sin(direction),
    ct = confined ? 0 : Math.sqrt(Math.max(0, 1 - ratio ** 2));
  const reflectance = confined
    ? 1
    : s.core === s.cladding
      ? 0
      : (((s.core * ci - s.cladding * ct) / (s.core * ci + s.cladding * ct)) **
          2 +
          ((s.cladding * ci - s.core * ct) / (s.cladding * ci + s.core * ct)) **
            2) /
        2;
  return {
    direction: (direction * 180) / Math.PI,
    incidence,
    critical,
    confined,
    transmittedAngle,
    reflectance,
  };
}
