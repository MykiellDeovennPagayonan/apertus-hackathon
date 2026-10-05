"use client";
import { OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Plane, Vector3 } from "three";
import {
  type CompositionScene,
  entrance,
  type SceneObject,
} from "../../runtime/composition/index";
import type { PersonSnapshot } from "../systems/ScheduledTripSystem";
import { AuthoredBuildingVisual3D } from "../visuals/BuildingVisual3D";
import { CitizenBodyVisual } from "../visuals/CitizenVisual3D";
import { GroundVisual3D } from "../visuals/GroundVisual3D";
import { AuthoredRoadVisual3D } from "../visuals/RoadVisual3D";

const floor = new Plane(new Vector3(0, 1, 0), 0);
type Props = {
  scene: CompositionScene;
  people: PersonSnapshot[];
  selected: string;
  authoring: boolean;
  onSelect: (id: string) => void;
  onChange: (o: SceneObject) => void;
  onCommit: (o: SceneObject) => void;
};
export default function AuthoredTownView({
  scene,
  people,
  selected,
  authoring,
  onSelect,
  onChange,
  onCommit,
}: Props) {
  const [dragging, setDragging] = useState(false),
    pending = useRef<SceneObject | null>(null);
  const destinationDrag = useRef<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const ground = scene.objects.find((o) => o.kind === "ground");
  const size =
    ground?.kind === "ground" ? Math.max(ground.width, ground.depth) : 48;
  const begin = (e: ThreeEvent<PointerEvent>, o: SceneObject) => {
    e.stopPropagation();
    onSelect(o.id);
    if (!authoring || o.kind === "ground") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    pending.current = structuredClone(o);
    setDragging(true);
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!pending.current) return;
    e.stopPropagation();
    const p = new Vector3();
    if (!e.ray.intersectPlane(floor, p)) return;
    const snap = (v: number) =>
      Math.max(
        -100,
        Math.min(
          100,
          scene.canvas.snap
            ? Math.round(v / scene.canvas.snap) * scene.canvas.snap
            : v,
        ),
      );
    const o = { ...pending.current };
    if (o.kind === "building" || o.kind === "road" || o.kind === "person") {
      if (o.kind === "person" && destinationDrag.current) {
        o.schedule = o.schedule.map((step) =>
          step.id === destinationDrag.current
            ? { ...step, target: "", x: snap(p.x), z: snap(p.z) }
            : step,
        );
      } else {
        o.x = snap(p.x);
        o.z = snap(p.z);
      }
      pending.current = o;
      onChange(o);
    }
  };
  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!pending.current) return;
    e.stopPropagation();
    const o = pending.current;
    pending.current = null;
    destinationDrag.current = null;
    setDragging(false);
    onCommit(o);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };
  return (
    <section className="composition-town" aria-label="3D town scene">
      <button
        type="button"
        className="composition-camera-reset"
        onClick={() => setCameraKey((k) => k + 1)}
      >
        Reset camera
      </button>
      <Canvas
        key={cameraKey}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [size * 0.7, size * 0.8, size * 0.9], fov: 45 }}
        onPointerMissed={() => onSelect("")}
      >
        <color attach="background" args={["#dbe6ea"]} />
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[15, 30, 20]}
          intensity={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <OrbitControls
          enabled={!dragging}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={5}
          maxDistance={180}
        />
        {scene.canvas.grid && (
          <gridHelper
            args={[100, 100, "#9ba7a4", "#c0cbca"]}
            position={[0, -0.03, 0]}
          />
        )}
        {authoring &&
          scene.objects
            .filter((o) => o.kind === "person" && o.id === selected)
            .flatMap((o) =>
              o.kind === "person"
                ? o.schedule.map((step) => {
                    const building = scene.objects.find(
                        (b) => b.id === step.target,
                      ),
                      p =
                        building?.kind === "building"
                          ? entrance(building)
                          : { x: step.x, y: step.z };
                    return (
                      <mesh
                        key={step.id}
                        position={[p.x, 0.25, p.y]}
                        onPointerDown={(e) => {
                          begin(e, o);
                          destinationDrag.current = step.id;
                        }}
                        onPointerMove={move}
                        onPointerUp={end}
                        onPointerCancel={end}
                      >
                        <sphereGeometry args={[0.4, 12, 8]} />
                        <meshStandardMaterial color="#f0c14b" />
                      </mesh>
                    );
                  })
                : [],
            )}
        {scene.objects.map((o) =>
          o.kind === "ground" ? (
            <mesh
              key={o.id}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(o.id);
              }}
            >
              <GroundVisual3D width={o.width} depth={o.depth} color={o.color} />
            </mesh>
          ) : o.kind === "building" ? (
            <group
              key={o.id}
              position={[o.x, 0, o.z]}
              onPointerDown={(e) => begin(e, o)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              <AuthoredBuildingVisual3D
                object={o}
                selected={selected === o.id}
              />
            </group>
          ) : o.kind === "road" ? (
            <mesh
              key={o.id}
              position={[o.x, 0.04, o.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              onPointerDown={(e) => begin(e, o)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              <AuthoredRoadVisual3D object={o} />
            </mesh>
          ) : o.kind === "person" ? (
            (() => {
              const person = people.find((p) => p.id === o.id);
              if (!person || (person.status === "not spawned" && !authoring))
                return null;
              const p =
                authoring && dragging && pending.current?.id === o.id
                  ? { x: o.x, y: o.z }
                  : person.status === "not spawned"
                    ? { x: o.x, y: o.z }
                    : person.position;
              return (
                <group
                  key={o.id}
                  position={[p.x, 0, p.y]}
                  onPointerDown={(e) => begin(e, o)}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                >
                  <CitizenBodyVisual
                    color={o.color}
                    bodyY={0.65}
                    bodyRadius={0.25}
                    bodyLength={0.65}
                    headY={1.35}
                    headRadius={0.23}
                    headSegments={[12, 8]}
                    skin="#dab48f"
                    opacity={person.status === "not spawned" ? 0.35 : 1}
                    transparent
                    emissive={selected === o.id ? "#66552a" : "#000000"}
                  />
                </group>
              );
            })()
          ) : null,
        )}
      </Canvas>
      {!ground && (
        <p className="composition-scene-hint">
          Empty space. Add ground, then buildings and people.
        </p>
      )}
    </section>
  );
}
