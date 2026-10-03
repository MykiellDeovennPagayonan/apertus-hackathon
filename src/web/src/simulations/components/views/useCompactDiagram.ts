import { useSyncExternalStore } from "react";

const subscribe = (listener: () => void) => {
  const query = matchMedia("(max-width: 650px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const snapshot = () => matchMedia("(max-width: 650px)").matches;
export function useCompactDiagram() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
