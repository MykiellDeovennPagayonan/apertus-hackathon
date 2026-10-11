"use client";
import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { Shape } from "three";
import type { EarthState } from "../../../domains/earth-atmosphere";
import {
  faultState,
  rainbowState,
  wavelengths,
} from "../../systems/earth-atmosphere/physics";

function ContextGuard({ onUnavailable }: { onUnavailable: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  return null;
}
function Fault({ s }: { s: EarthState }) {
  const m = faultState(
    s.phase,
    s.progress,
    Number(s.config.locking),
    Number(s.config.fault),
  );
  const strike = Number(s.config.fault) === 0;
  const direction = Number(s.config.fault) === 1 ? 1 : -1;
  const slide = strike ? m.slip * 0.45 : 0;
  const vertical = strike ? 0 : -direction * m.slip * 0.26;
  const horizontal = strike ? 0 : direction * m.slip * 0.15;
  const edge = strike ? 0.05 : 0.49;
  const left = new Shape();
  left.moveTo(-3.25, -0.85);
  left.lineTo(edge, -0.85);
  left.lineTo(-edge, 0.85);
  left.lineTo(-3.25, 0.85);
  left.closePath();
  const right = new Shape();
  right.moveTo(edge + 0.06, -0.85);
  right.lineTo(3.25, -0.85);
  right.lineTo(3.25, 0.85);
  right.lineTo(-edge + 0.06, 0.85);
  right.closePath();
  return (
    <group>
      <mesh position={[0, 0, -1.9]}>
        <extrudeGeometry args={[left, { depth: 3.8, bevelEnabled: false }]} />
        <meshStandardMaterial color="#bda789" roughness={0.9} />
      </mesh>
      <mesh position={[horizontal, vertical, -1.9 + slide]}>
        <extrudeGeometry args={[right, { depth: 3.8, bevelEnabled: false }]} />
        <meshStandardMaterial color="#cdb896" roughness={0.9} />
      </mesh>
      {[0, 1, 2].map((n) => (
        <group key={n}>
          <Line
            points={[
              [-3.25, 0.9, -1 + n],
              [-edge, 0.9, -1 + n + m.deformation * 0.1],
            ]}
            color="#426f61"
            lineWidth={3}
          />
          <Line
            points={[
              [-edge + 0.06 + horizontal, 0.9 + vertical, -1 + n + slide],
              [3.25 + horizontal, 0.9 + vertical, -1 + n + slide],
            ]}
            color="#426f61"
            lineWidth={3}
          />
        </group>
      ))}
      <Line
        points={[
          [edge, -0.85, -1.9],
          [-edge, 0.85, -1.9],
          [-edge, 0.85, 1.9],
        ]}
        color={s.phase >= 2 ? "#b4513b" : "#6d6459"}
        lineWidth={s.phase >= 2 ? 5 : 2}
      />
      {s.phase >= 2 && (
        <mesh position={[0, -0.2, -1.95]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#b4513b" />
        </mesh>
      )}
      {s.phase >= 4 &&
        [1, 2, 3].map((r) => (
          <Line
            key={r}
            points={Array.from(
              { length: 81 },
              (_, i): [number, number, number] => [
                Math.cos((i / 80) * Math.PI * 2) * r,
                0.96,
                Math.sin((i / 80) * Math.PI * 2) * r,
              ],
            )}
            color="#478896"
            lineWidth={2}
            dashed
            dashSize={0.12}
            gapSize={0.1}
          />
        ))}
    </group>
  );
}
function Rainbow({
  s,
  showObserver,
}: {
  s: EarthState;
  showObserver: boolean;
}) {
  const primary = rainbowState(
    Number(s.config.elevation),
    Number(s.config.observer),
    false,
  );
  const secondary = rainbowState(
    Number(s.config.elevation),
    Number(s.config.observer),
    true,
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -5]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#c6d2b2" />
      </mesh>
      {showObserver && (
        <group>
          <mesh position={[Number(s.config.observer), 0.8, 1]}>
            <sphereGeometry args={[0.18, 20, 20]} />
            <meshStandardMaterial color="#285e56" />
          </mesh>
          <Line
            points={[
              [Number(s.config.observer), 0, 1],
              [Number(s.config.observer), 0.8, 1],
            ]}
            color="#285e56"
            lineWidth={4}
          />
        </group>
      )}
      {primary.contributingDroplets.map((p) => (
        <mesh key={`${p.x},${p.y},${p.z}`} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#75a9bb" />
        </mesh>
      ))}
      {s.phase >= 4 &&
        [primary, ...(s.config.secondary ? [secondary] : [])].map((bow, b) =>
          bow.rays.map((ray, i) => {
            const radius = Math.tan((ray.radius * Math.PI) / 180) * 12;
            const points = Array.from(
              { length: 121 },
              (_, j): [number, number, number] => [
                Number(s.config.observer) +
                  Math.cos((j / 120) * Math.PI) * radius,
                Math.sin((j / 120) * Math.PI) * radius + primary.center[1],
                -12,
              ],
            ).filter((p) => p[1] >= 0);
            return points.length > 1 ? (
              <Line
                key={`${b}-${ray.name}`}
                points={points}
                color={wavelengths[i].color}
                lineWidth={b ? 3 : 5}
                transparent
                opacity={b ? 0.5 : 1}
              />
            ) : null;
          }),
        )}
      <Line
        points={[
          [Number(s.config.observer), 0.8, 1],
          [Number(s.config.observer), primary.center[1], -12],
        ]}
        color="#587a71"
        lineWidth={1}
        dashed
        dashSize={0.25}
        gapSize={0.15}
      />
      <mesh
        position={[
          Number(s.config.observer),
          0.8 + Math.tan((Number(s.config.elevation) * Math.PI) / 180) * 18,
          18,
        ]}
      >
        <sphereGeometry args={[0.7, 20, 20]} />
        <meshBasicMaterial color="#eac373" />
      </mesh>
    </group>
  );
}
export default function Scene3D({
  s,
  view,
  onUnavailable,
}: {
  s: EarthState;
  view: string;
  onUnavailable: () => void;
}) {
  const [ready, setReady] = useState(false);
  const earthquake = s.kind === "earthquake";
  const position: [number, number, number] = earthquake
    ? view === "top"
      ? [0.01, 12, 0]
      : [7, 5, 8]
    : view === "observer"
      ? [Number(s.config.observer), 0.8, 1.5]
      : [18, 14, 18];
  return (
    <div
      className="ea-3d"
      role="img"
      data-ready={String(ready)}
      aria-label={
        earthquake
          ? "Three-dimensional fault blocks"
          : "Three-dimensional Sun, rain and observer geometry"
      }
    >
      <Canvas
        key={`${view}-${earthquake ? "fault" : "rainbow"}`}
        camera={{
          position,
          fov: earthquake ? 40 : view === "observer" ? 95 : 52,
        }}
        onCreated={() => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setReady(true)),
          );
        }}
      >
        <ContextGuard onUnavailable={onUnavailable} />
        <color attach="background" args={["#f8f5eb"]} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[5, 8, 4]} intensity={2} />
        {earthquake ? (
          <Fault s={s} />
        ) : (
          <Rainbow s={s} showObserver={view !== "observer"} />
        )}
        <OrbitControls
          target={earthquake ? [0, 0, 0] : [Number(s.config.observer), 0, -12]}
          enablePan={false}
          enableZoom={view !== "observer"}
          enableRotate={view !== "observer"}
          minDistance={6}
          maxDistance={40}
        />
      </Canvas>
    </div>
  );
}
