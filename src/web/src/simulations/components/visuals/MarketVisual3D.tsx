// biome-ignore-all lint/suspicious/noArrayIndexKey: Procedural scene slots are fixed identities.

import { TownAppearance } from "../resources/TownAppearance";
import type { P2 } from "../traits/Resident";
import { TownLabel } from "./TownLabel";
import { Block } from "./townGeometry";
export function MarketVisual3D({
  market,
  busy,
}: {
  market: P2;
  busy: boolean;
}) {
  return (
    <group position={[market.x, 0, market.z]}>
      <Block at={[0, 0.12, 0]} size={[8, 0.24, 4.5]} color="#d9c9a9" />
      {[-2.3, 0, 2.3].map((offset, index) => (
        <group key={offset} position={[offset, 0, 0]}>
          {[-0.95, 0.95].map((side) => (
            <Block
              key={side}
              at={[side, 1.45, 0]}
              size={[0.1, 2.9, 0.1]}
              color="#725b41"
            />
          ))}
          <Block at={[0, 0.9, 0]} size={[2, 1.4, 1.2]} color="#ac855e" />
          {Array.from({ length: 6 }, (_, stripe) => (
            <Block
              key={stripe}
              at={[-0.95 + stripe * 0.38, 2.75, 0.1]}
              size={[0.38, 0.12, 2.3]}
              rotation={[0.12, 0, 0]}
              color={
                stripe % 2 === 0
                  ? "#f3e3c3"
                  : TownAppearance.marketColors[index]
              }
            />
          ))}
          {Array.from({ length: busy ? 12 : 6 }, (_, item) => (
            <mesh
              key={item}
              position={[
                -0.7 + (item % 4) * 0.45,
                1.7,
                -0.3 + Math.floor(item / 4) * 0.3,
              ]}
              castShadow
            >
              <icosahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial
                color={["#d88852", "#bb5545", "#90a456"][index]}
              />
            </mesh>
          ))}
        </group>
      ))}
      <TownLabel
        position={[0, 4, 0]}
        text={busy ? "Market · bustling" : "Market"}
      />
    </group>
  );
}
