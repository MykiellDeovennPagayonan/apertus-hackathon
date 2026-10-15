// biome-ignore-all lint/suspicious/noArrayIndexKey: Fixed procedural crossing stripes never reorder.
import { TownLayout } from "../resources/TownLayout";
import type { RoadObject } from "../traits/SceneObjects";
import { Block } from "./townGeometry";
export function RoadVisual3D({ closed }: { closed: boolean }) {
  return (
    <>
      <Block at={[0, 0.015, 0]} size={[58, 0.12, 5.4]} color="#d8cfb9" />
      <Block at={[0, 0.09, 0]} size={[58, 0.06, 3.5]} color="#7e8984" />
      {TownLayout.streets.map((offset) => (
        <group key={offset}>
          <Block
            at={[offset, 0.015, 0]}
            size={[4.1, 0.12, 42]}
            color="#d8cfb9"
          />
          <Block
            at={[offset, 0.095, 0]}
            size={[2.5, 0.06, 42]}
            color="#7e8984"
          />
        </group>
      ))}
      {[-8, 8].map((offset) => (
        <Block
          key={offset}
          at={[0, 0.06, offset]}
          size={[43, 0.12, 1.8]}
          color="#d8cfb9"
        />
      ))}
      {Array.from({ length: 19 }, (_, index) => index * 3 - 27)
        .filter(
          (offset) =>
            Math.abs(offset - 6) > 5 && Math.abs(Math.abs(offset) - 14) > 2,
        )
        .map((offset) => (
          <Block
            key={offset}
            at={[offset, 0.13, 0]}
            size={[1.3, 0.015, 0.09]}
            color="#e9ddbd"
          />
        ))}
      {[-17, -11, 11, 17].map((offset) => (
        <group key={offset}>
          {Array.from({ length: 6 }, (_, index) => (
            <Block
              key={-1.35 + index * 0.54}
              at={[offset, 0.135, -1.35 + index * 0.54]}
              size={[0.65, 0.015, 0.28]}
              color="#f2ead8"
            />
          ))}
        </group>
      ))}
      {closed && (
        <group position={[0, 0, 0]}>
          {[-1.4, 1.4].map((depth) => (
            <group key={depth} position={[0, 0, depth]}>
              <Block
                at={[0, 0.6, 0]}
                size={[0.22, 1.2, 0.22]}
                color="#685642"
              />
              <Block at={[0, 0.2, 0]} size={[0.7, 0.18, 0.6]} color="#685642" />
            </group>
          ))}
          <Block at={[0, 1, 0]} size={[0.2, 0.5, 3.5]} color="#edbb64" />
          {[-1.2, -0.4, 0.4, 1.2].map((depth) => (
            <Block
              key={depth}
              at={[0.12, 1, depth]}
              size={[0.025, 0.5, 0.3]}
              color="#655443"
            />
          ))}
        </group>
      )}
    </>
  );
}

export function AuthoredRoadVisual3D({ object: o }: { object: RoadObject }) {
  return (
    <>
      <planeGeometry args={[o.width, o.depth]} />
      <meshStandardMaterial color={o.closed ? "#a45445" : o.color} />
    </>
  );
}
