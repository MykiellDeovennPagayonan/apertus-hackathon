import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../legacy/components/views/useCompactDiagram";
import type { GraphNode } from "../graph/types";

type Positions = Record<string, { x: number; y: number }>;
/** One displayed position source drives both blocks and their wire endpoints. */
export function useGraphMotion(targets: GraphNode[], enabled: boolean) {
  const reduced = useReducedMotion();
  const [positions, setPositions] = useState<Positions>({});
  const current = useRef(positions);
  const signature = JSON.stringify(targets.map((n) => [n.id, n.x, n.y]));
  useEffect(() => {
    const to = Object.fromEntries(
      (JSON.parse(signature) as [string, number, number][]).map(
        ([id, x, y]) => [id, { x, y }],
      ),
    );
    if (!enabled || reduced) {
      current.current = to;
      setPositions(to);
      return;
    }
    const from = current.current;
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const fraction = Math.min(1, (now - start) / 240);
      const eased = 1 - (1 - fraction) ** 3;
      const next = Object.fromEntries(
        Object.entries(to).map(([id, position]) => {
          const origin = from[id] ?? position;
          return [
            id,
            {
              x: origin.x + (position.x - origin.x) * eased,
              y: origin.y + (position.y - origin.y) * eased,
            },
          ];
        }),
      );
      current.current = next;
      setPositions(next);
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [signature, enabled, reduced]);
  return enabled && !reduced
    ? targets.map((node) => ({ ...node, ...positions[node.id] }))
    : targets;
}
