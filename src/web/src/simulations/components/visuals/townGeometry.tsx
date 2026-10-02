export type Vector = [number, number, number];

export function Block({
  at,
  size,
  color,
  rotation = [0, 0, 0],
}: {
  at: Vector;
  size: Vector;
  color: string;
  rotation?: Vector;
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

export function Tree({ at, scale = 1 }: { at: Vector; scale?: number }) {
  return (
    <group position={at} scale={scale}>
      <Block at={[0, 1.2, 0]} size={[0.3, 2.4, 0.3]} color="#79634a" />
      {[
        [0, 3, 0],
        [-0.7, 2.7, 0.3],
        [0.6, 2.5, -0.3],
      ].map((position, index) => (
        <mesh key={position.join(":")} position={position as Vector} castShadow>
          <icosahedronGeometry args={[index === 0 ? 1.5 : 1.1, 1]} />
          <meshStandardMaterial
            color={["#658765", "#7e9a6b", "#4f775d"][index]}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Window({ at, night }: { at: Vector; night: boolean }) {
  return (
    <group position={at}>
      <Block at={[0, 0, 0]} size={[1.05, 1.25, 0.15]} color="#f6e8cd" />
      <mesh position={[0, 0, 0.09]}>
        <boxGeometry args={[0.82, 1.02, 0.05]} />
        <meshStandardMaterial
          color={night ? "#ffda8b" : "#547c82"}
          emissive="#ffbd62"
          emissiveIntensity={night ? 1.1 : 0}
          roughness={0.3}
        />
      </mesh>
      <Block at={[0, 0, 0.13]} size={[0.06, 1.05, 0.04]} color="#f6e8cd" />
      <Block at={[0, 0, 0.13]} size={[0.85, 0.06, 0.04]} color="#f6e8cd" />
      <Block at={[0, -0.68, 0.13]} size={[1.22, 0.14, 0.32]} color="#f6e8cd" />
    </group>
  );
}

export function Bench({ at, rotation = 0 }: { at: Vector; rotation?: number }) {
  return (
    <group position={at} rotation={[0, rotation, 0]}>
      <Block at={[0, 0.55, 0]} size={[2, 0.16, 0.65]} color="#aa7951" />
      <Block at={[0, 1, -0.3]} size={[2, 0.65, 0.13]} color="#aa7951" />
      {[-0.7, 0.7].map((offset) => (
        <Block
          key={offset}
          at={[offset, 0.3, 0]}
          size={[0.12, 0.6, 0.5]}
          color="#40534c"
        />
      ))}
    </group>
  );
}

export function Fountain() {
  return (
    <group position={[6, 0.2, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[2.1, 2.25, 0.3, 32]} />
        <meshStandardMaterial color="#b9b6a5" />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.65, 2, 32]} />
        <meshStandardMaterial color="#e6dcc4" />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.66, 32]} />
        <meshStandardMaterial
          color="#65b7bd"
          metalness={0.35}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.42, 1.3, 12]} />
        <meshStandardMaterial color="#e6dcc4" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.3, 0.2, 20]} />
        <meshStandardMaterial color="#e6dcc4" />
      </mesh>
      <mesh position={[0, 1.74, 0]}>
        <sphereGeometry args={[0.23, 12, 8]} />
        <meshStandardMaterial color="#9edce0" metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  );
}
