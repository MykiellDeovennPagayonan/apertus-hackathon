import {
  type RefObject,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

const subscribe = (listener: () => void) => {
  const query = matchMedia("(max-width: 650px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const snapshot = () => matchMedia("(max-width: 650px)").matches;
/** Scene arrangement follows its allocated width, with a viewport fallback before measurement. */
export function useCompactDiagram(
  element?: RefObject<SVGSVGElement | null>,
  threshold = 650,
) {
  const viewport = useSyncExternalStore(subscribe, snapshot, () => false);
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    const svg = element?.current;
    if (!svg) return;
    const measure = () => setWidth(svg.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [element]);
  return width && width > 0 ? width <= threshold : viewport;
}
const motionSubscribe = (listener: () => void) => {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
export function useReducedMotion() {
  return useSyncExternalStore(
    motionSubscribe,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
