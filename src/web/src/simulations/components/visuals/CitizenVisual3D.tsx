import { useTownStore } from "../../runtime/townSession";
import { TownAppearance } from "../resources/TownAppearance";
import type { Citizen } from "../traits/Resident";
import { townSurfaceHeight } from "./townSurface";
export function CitizenVisual3D({
  citizen: c,
  index: i,
  nearSchool = false,
}: {
  citizen: Citizen;
  index: number;
  nearSchool?: boolean;
}) {
  return (
    <group
      position={[c.pos.x, townSurfaceHeight(c.pos, nearSchool) - 0.02, c.pos.z]}
      rotation={[0, c.heading, 0]}
    >
      <CitizenBodyVisual
        color={TownAppearance.citizenColors[i % 5]}
        bodyY={0.62}
        bodyRadius={0.21}
        bodyLength={0.38}
        headY={1.13}
        headRadius={0.2}
        headSegments={[10, 8]}
        skin={i % 3 === 0 ? "#aa7956" : "#e0b68e"}
      />
      <mesh position={[0, 1.25, -0.015]} castShadow>
        <sphereGeometry args={[0.205, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#635445" />
      </mesh>
      {[-0.11, 0.11].map((offset) => (
        <mesh key={offset} position={[offset, 0.22, 0]} castShadow>
          <boxGeometry args={[0.14, 0.4, 0.18]} />
          <meshStandardMaterial color="#41545b" />
        </mesh>
      ))}
      {c.role === "student" && (
        <mesh position={[0, 0.68, -0.23]} castShadow>
          <boxGeometry args={[0.3, 0.35, 0.16]} />
          <meshStandardMaterial color="#c5a457" />
        </mesh>
      )}
    </group>
  );
}
export default function CitizensView() {
  const citizens = useTownStore((s) => s.citizens),
    nearSchool = useTownStore((s) => s.marketNearSchool);
  return (
    <group>
      {citizens.map((c, i) => (
        <CitizenVisual3D
          key={c.id}
          citizen={c}
          index={i}
          nearSchool={nearSchool}
        />
      ))}
    </group>
  );
}

/** Body appearance consumes a profile; scene policies supply positions, headings and selection. */
export function CitizenBodyVisual({
  color,
  bodyY,
  bodyRadius,
  bodyLength,
  headY,
  headRadius,
  headSegments,
  skin,
  transparent = false,
  opacity = 1,
  emissive = "#000000",
}: {
  color: string;
  bodyY: number;
  bodyRadius: number;
  bodyLength: number;
  headY: number;
  headRadius: number;
  headSegments: [number, number];
  skin: string;
  transparent?: boolean;
  opacity?: number;
  emissive?: string;
}) {
  return (
    <>
      <mesh position={[0, bodyY, 0]} castShadow>
        <capsuleGeometry args={[bodyRadius, bodyLength, 4, 8]} />
        <meshStandardMaterial
          color={color}
          transparent={transparent}
          opacity={opacity}
          emissive={emissive}
        />
      </mesh>
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[headRadius, ...headSegments]} />
        <meshStandardMaterial color={skin} />
      </mesh>
    </>
  );
}
