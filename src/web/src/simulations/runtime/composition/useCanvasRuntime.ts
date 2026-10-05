import { useEffect, useMemo, useState } from "react";
import { actionSpecs } from "../../components/contracts/composition";
import { compileTown } from "../../components/systems/ScheduledTripSystem";
import { useReducedMotion } from "../../components/views/useCompactDiagram";
import { validateValue } from "../parameterSchema";
import {
  type CompositionScene,
  type SceneObject,
  validateScene,
} from "./index";
import {
  configurationKey,
  mergeRuntimeObjects,
  templateForScene,
  updateRuntimeObject,
} from "./runtimeState";
export function useCanvasRuntime(scene: CompositionScene, hidden = false) {
  const reducedMotion = useReducedMotion();
  const key = configurationKey(scene);
  const clock = scene.clock ?? {
    start: 0,
    speed: 1,
    playing: false,
    secondsPerHour: 5,
  };
  const initial = useMemo(
    () => ({
      key,
      objects: structuredClone(scene.objects),
      authored: scene.objects,
      time: clock.start,
      playing: clock.playing && !reducedMotion,
      speed: clock.speed,
    }),
    [
      key,
      scene.objects,
      clock.start,
      clock.playing,
      clock.speed,
      reducedMotion,
    ],
  );
  const [state, setState] = useState(initial);
  const accepted = state.key === key ? state : initial;
  useEffect(() => {
    setState((current) =>
      current.key === key
        ? {
            ...current,
            objects: mergeRuntimeObjects(
              scene.objects,
              current.objects,
              current.authored,
            ),
            authored: scene.objects,
          }
        : initial,
    );
  }, [key, initial, scene.objects]);
  const objects = mergeRuntimeObjects(
    scene.objects,
    accepted.objects,
    accepted.authored,
  );
  const [resetRevision, setResetRevision] = useState(0);
  const runtimeScene = { ...scene, objects };
  const routeKey = JSON.stringify(runtimeScene);
  const town = useMemo(
    () =>
      scene.kind === "town"
        ? compileTown(JSON.parse(routeKey) as CompositionScene)
        : () => [],
    [routeKey, scene.kind],
  );
  const people = scene.kind === "town" ? town(accepted.time) : [];
  useEffect(() => {
    if (hidden || scene.kind !== "town" || !accepted.playing) return;
    let frame = 0,
      previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) {
        const elapsed = Math.min((now - previous) / 1000, 0.1);
        setState((current) => ({
          ...current,
          time:
            (current.time + (elapsed * current.speed) / clock.secondsPerHour) %
            24,
        }));
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene.kind, clock.secondsPerHour, accepted.playing, hidden]);
  const replace = (o: SceneObject) => {
    const candidate = {
      ...runtimeScene,
      objects: objects.map((item) => (item.id === o.id ? o : item)),
    };
    validateScene(candidate, templateForScene(scene), false);
    setState((current) => ({
      ...(current.key === key ? current : initial),
      objects: candidate.objects,
    }));
  };
  const command = (
    target: string,
    property: string,
    value: number | boolean,
  ) => {
    if (target === "clock") {
      if (property === "playing" && typeof value === "boolean")
        setState((current) => ({ ...current, playing: value }));
      else if (
        property === "time" &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 24
      )
        setState((current) => ({ ...current, time: value, playing: false }));
      else if (
        property === "speed" &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0.25 &&
        value <= 8
      )
        setState((current) => ({ ...current, speed: value }));
      else throw new Error("Invalid clock command");
    } else {
      replace(
        updateRuntimeObject(runtimeScene, target, "property", property, value),
      );
    }
  };
  return {
    scene: runtimeScene,
    people,
    time: accepted.time,
    playing: accepted.playing,
    speed: accepted.speed,
    command,
    replace,
    action: (target: string, action: string, args: unknown) => {
      if (target === "canvas" && action === "reset") {
        validateValue(actionSpecs.reset.schema, args, "Reset arguments");
        setState(initial);
        setResetRevision((v) => v + 1);
      } else
        replace(
          updateRuntimeObject(runtimeScene, target, "action", action, args),
        );
    },
    piece: (target: string, index: number) =>
      replace(updateRuntimeObject(runtimeScene, target, "piece", "", index)),
    resetToken: `${key}/${resetRevision}`,
    capture: () => {
      const snapshot = structuredClone(runtimeScene);
      if (snapshot.clock)
        Object.assign(snapshot.clock, {
          start: accepted.time,
          playing: accepted.playing,
          speed: accepted.speed,
        });
      return snapshot;
    },
    reset: () => {
      setState(initial);
      setResetRevision((v) => v + 1);
    },
  };
}
