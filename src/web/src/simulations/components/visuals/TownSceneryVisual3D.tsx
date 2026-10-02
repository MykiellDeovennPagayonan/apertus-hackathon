// biome-ignore-all lint/suspicious/noArrayIndexKey: Procedural scene slots are fixed identities.
import { Html } from "@react-three/drei";
import { Bench, Block, Fountain, Tree } from "./townGeometry";
export function TownSceneryVisual3D({ night }: { night: boolean }) {
  return (
    <>
      <Block at={[0, -0.85, 0]} size={[62, 1.6, 53]} color="#a8b68a" />
      <Block at={[0, -1.8, 0]} size={[61.5, 0.5, 52.5]} color="#c9b99a" />
      <Block at={[0, -2.12, 0]} size={[61, 0.18, 52]} color="#7e8d75" />
      <Block at={[0, -2.35, 0]} size={[2000, 0.1, 2000]} color="#e5e3d7" />
      <group key="square">
        <Block at={[6, 0.12, 0]} size={[8, 0.2, 8]} color="#e2d8bd" />
        {[-3.5, 3.5].map((offset) => (
          <Block
            key={offset}
            at={[6 + offset, 0.23, 0]}
            size={[0.15, 0.015, 7.4]}
            color="#b4ac96"
          />
        ))}
        <Fountain />
        <Bench at={[3, 0.24, -2.4]} rotation={Math.PI / 2} />
        <Bench at={[9, 0.24, 2.4]} rotation={-Math.PI / 2} />
        <Html position={[6, 3.4, 0]} center distanceFactor={65}>
          <span className="town-building-label">Town square</span>
        </Html>
      </group>{" "}
      {Array.from({ length: 13 }, (_, index) => (
        <Tree
          key={`north-${index}`}
          at={[-27 + index * 4.4, 0, -23]}
          scale={0.85 + (index % 3) * 0.16}
        />
      ))}
      {[-20, -12, -4, 5, 14, 22].map((depth, index) => (
        <group key={depth}>
          <Tree at={[-27, 0, depth]} scale={1.1} />
          <Tree at={[27, 0, depth]} scale={0.9 + (index % 2) * 0.2} />
        </group>
      ))}
      {[-21, -8, 3, 22].map((offset) => (
        <group key={offset}>
          <Tree at={[offset, 0, 20]} />
          <Block
            at={[offset + 2, 0.38, 20]}
            size={[2, 0.7, 1.1]}
            color="#789260"
          />
        </group>
      ))}
      {[-22, -6, 19].map((offset) =>
        [-3.1, 3.1].map((depth) => (
          <group key={`${offset}-${depth}`} position={[offset, 0, depth]}>
            <Block at={[0, 1.8, 0]} size={[0.13, 3.6, 0.13]} color="#455e55" />
            <Block
              at={[0, 3.65, 0]}
              size={[0.65, 0.12, 0.65]}
              color="#455e55"
            />
            <mesh position={[0, 3.35, 0]}>
              <boxGeometry args={[0.38, 0.48, 0.38]} />
              <meshStandardMaterial
                color="#ffdfa0"
                emissive="#ffbd66"
                emissiveIntensity={night ? 2 : 0.1}
              />
            </mesh>
            {night && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
                <circleGeometry args={[1.7, 24]} />
                <meshBasicMaterial
                  color="#ffce79"
                  transparent
                  opacity={0.12}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        )),
      )}
    </>
  );
}
