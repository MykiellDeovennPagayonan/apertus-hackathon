import { num, object, validateValue } from "../../../../registry/contracts/parameterSchema";
export const lensParameters = object({
  focal: num(2, 30, "cm"),
  distance: num(1, 100, "cm"),
  height: num(0.5, 10, "cm"),
});
export const lensDefaults = { focal: 10, distance: 30, height: 5 };
export function lensState(p: Record<string, unknown>) {
  const s = { ...lensDefaults, ...p };
  validateValue(lensParameters, s);
  return s;
}
export function lensMeasure(s: ReturnType<typeof lensState>) {
  if (s.distance === s.focal)
    return {
      imageDistance: null,
      magnification: null,
      imageHeight: null,
      kind: "no finite image",
    };
  const imageDistance = (s.focal * s.distance) / (s.distance - s.focal),
    magnification = -imageDistance / s.distance;
  return {
    imageDistance,
    magnification,
    imageHeight: magnification * s.height,
    kind: imageDistance > 0 ? "real" : "virtual",
  };
}
