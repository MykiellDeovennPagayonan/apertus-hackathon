import type { BridgeLoad as Load } from "../traits/BridgeLoad";
export function BridgeLoad(
  id: string,
  assembly: string,
  position: number,
  magnitude: number,
): Load {
  return { id, assembly, position, magnitude };
}
