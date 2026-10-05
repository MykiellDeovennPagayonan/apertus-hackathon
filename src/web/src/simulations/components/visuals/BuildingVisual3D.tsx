// biome-ignore-all lint/suspicious/noArrayIndexKey: Procedural scene slots are fixed identities.

import { TownAppearance } from "../resources/TownAppearance";
import { entrance } from "../systems/BuildingGeometrySystem";
import type { Building } from "../traits/Building";
import type { BuildingObject } from "../traits/SceneObjects";
import { TownLabel } from "./TownLabel";
import { Block, Window } from "./townGeometry";
export function BuildingVisual3D({
  building,
  index,
  night,
}: {
  building: Building;
  index: number;
  night: boolean;
}) {
  return (
    <group key={building.id} position={[building.x, 0, building.z]}>
      <Block
        at={[0, 0.12, 0]}
        size={[building.w + 1, 0.24, building.d + 1]}
        color="#c7c4ad"
      />
      <Block
        at={[0, building.h / 2 + 0.2, 0]}
        size={[building.w, building.h, building.d]}
        color={
          building.kind === "house"
            ? TownAppearance.houseColors[index % 3]
            : building.color
        }
      />
      <Block
        at={[0, 0.5, 0]}
        size={[building.w + 0.12, 0.45, building.d + 0.12]}
        color="#b8ad94"
      />
      <Block
        at={[0, building.h + 0.2, 0]}
        size={[building.w + 0.5, 0.23, building.d + 0.5]}
        color="#eee0c2"
      />
      <mesh
        position={[0, building.h + 1.23, 0]}
        scale={[building.w + 0.9, 1, building.d + 0.9]}
        castShadow
      >
        <coneGeometry args={[Math.SQRT1_2, 2, 4, 1, false, Math.PI / 4]} />
        <meshStandardMaterial
          color={
            building.kind === "school"
              ? "#527878"
              : building.kind === "workshop"
                ? "#626d71"
                : ["#b8765d", "#7f8c7b", "#ac7156"][index % 3]
          }
          roughness={0.9}
        />
      </mesh>
      <Block
        at={[-building.w * 0.27, building.h + 1.4, -0.7]}
        size={[0.6, 1.7, 0.65]}
        color="#b28a70"
      />
      <Block
        at={[-building.w * 0.27, building.h + 2.3, -0.7]}
        size={[0.78, 0.16, 0.82]}
        color="#e2d6bd"
      />
      <group rotation={[0, building.z > 0 ? Math.PI : 0, 0]}>
        <Block
          at={[0, 1.22, building.d / 2 + 0.08]}
          size={[0.9, 2, 0.15]}
          color="#665b48"
        />
        <Block
          at={[0, 0.22, building.d / 2 + 0.5]}
          size={[1.7, 0.25, 1]}
          color="#eee0c2"
        />
        {[-1, 1].map((side) => (
          <Window
            key={side}
            at={[side * building.w * 0.29, 2.5, building.d / 2 + 0.04]}
            night={night}
          />
        ))}
        {building.kind === "house" &&
          [-1, 1].map((side) => (
            <group key={side}>
              <Block
                at={[side * 1.5, 1.62, building.d / 2 + 0.27]}
                size={[1.2, 0.3, 0.4]}
                color="#a47757"
              />
              <Block
                at={[side * 1.5, 1.85, building.d / 2 + 0.27]}
                size={[1.05, 0.2, 0.35]}
                color="#6c8d54"
              />
            </group>
          ))}
      </group>
      <group
        position={[building.w / 2 + 0.05, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        {[-1.3, 1.3].map((offset) => (
          <Window key={offset} at={[offset, 2.5, 0]} night={night} />
        ))}
      </group>
      {building.kind !== "house" && (
        <TownLabel position={[0, building.h + 3, 0]} text={building.label} />
      )}
      {building.kind === "school" && (
        <>
          <Block
            at={[0, building.h + 2.15, 0]}
            size={[1.65, 1.5, 1.5]}
            color="#e6dcc4"
          />
          <mesh position={[0, building.h + 2.2, 0.77]}>
            <circleGeometry args={[0.52, 24]} />
            <meshStandardMaterial color="#faf1d6" />
          </mesh>
          <Block
            at={[0, building.h + 2.35, 0.79]}
            size={[0.055, 0.35, 0.02]}
            color="#405b55"
          />
          <Block
            at={[0.13, building.h + 2.2, 0.8]}
            size={[0.28, 0.055, 0.02]}
            color="#405b55"
          />
        </>
      )}
      {building.kind === "workshop" && (
        <Block at={[2.5, 6, -1.7]} size={[0.85, 4, 0.85]} color="#947d68" />
      )}
    </group>
  );
}

export function AuthoredBuildingVisual3D({
  object: o,
  selected,
}: {
  object: BuildingObject;
  selected: boolean;
}) {
  return (
    <>
      <mesh position={[0, o.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[o.width, o.height, o.depth]} />
        <meshStandardMaterial
          color={o.color}
          emissive={selected ? "#66552a" : "#000000"}
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh
        position={[0, o.height + 0.55, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[o.width, 1, o.depth]}
        castShadow
      >
        <coneGeometry args={[Math.SQRT1_2, 1.1, 4]} />
        <meshStandardMaterial color="#805b50" />
      </mesh>
      <mesh
        position={[entrance(o).x - o.x, 0.08, entrance(o).y - o.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.4, 16]} />
        <meshStandardMaterial color="#fff1a5" />
      </mesh>
    </>
  );
}
