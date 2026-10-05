"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createStore, type StateCreator } from "zustand/vanilla";
import { runtimeProvider } from "../../runtime/authoring/providers";
import { remapDocument } from "../../runtime/authoring/recipes";
import { requireValue } from "../../runtime/authoring/requireValue";
import { DocumentRuntime } from "../../runtime/authoring/runtime";
import { spatialRecipeDocument } from "../../runtime/authoring/spatialMigration";
import { bridgeInitializer, useBridgeStore } from "../../runtime/bridgeSession";
import type { SimulationCommand } from "../../runtime/commands";
import {
  projectileInitializer,
  useProjectileStore,
} from "../../runtime/projectileSession";
import {
  advanceSessionTime,
  getSessionAnimation,
  setSessionAnimation,
  subscribeSessionAnimation,
} from "../../runtime/session";
import { townInitializer, useTownStore } from "../../runtime/townSession";
import { bridgeRecipe, townRecipe } from "../composites/spatial";
import { GRAVITIES } from "../resources/GravityPresets";
import { RecipeLesson } from "./RecipeLesson";
/** Compatibility entry point for the existing prompt/session protocol. All lesson assembly is public recipe data. */
export function SpatialRecipeView({
  demo,
  controlsOnly = false,
}: {
  demo: "bridge" | "projectile" | "town";
  controlsOnly?: boolean;
}) {
  const animationEnabled = useSyncExternalStore(
    subscribeSessionAnimation,
    getSessionAnimation,
    () => false,
  );
  const bridge = useBridgeStore(),
    projectile = useProjectileStore(),
    town = useTownStore();
  const projectileRecipeSource = JSON.stringify({
    schemaVersion: 1,
    composition: { ref: "compositions/ProjectileExperiment", version: 1 },
    parameters: { playing: projectile.initialSettings.playing },
    instances: projectile.instances.map((current) => {
      const i =
        projectile.initial.find((initial) => initial.id === current.id) ??
        current;
      return {
        id: i.id,
        prefab: { ref: "prefabs/Projectile", version: 1 },
        parameters: {
          angle: i.launch.angle,
          speed: i.launch.velocity,
          gravityPreset:
            Object.keys(GRAVITIES).find(
              (name) => GRAVITIES[name] === i.gravity,
            ) ?? "Earth",
        },
      };
    }),
  });
  const document = useMemo(() => {
    if (demo === "bridge")
      return remapDocument(
        bridgeRecipe(bridge.spanScale, bridge.dense).document,
        (id) =>
          id.startsWith("generated/")
            ? `${bridge.truss.id}/${id.slice(10)}`
            : id,
      );
    if (demo === "town") return townRecipe().document;
    return spatialRecipeDocument(JSON.parse(projectileRecipeSource));
  }, [
    demo,
    bridge.spanScale,
    bridge.dense,
    bridge.truss.id,
    projectileRecipeSource,
  ]);
  const runtime = useMemo(
    () =>
      new DocumentRuntime(document, (commands) => {
        // Validate the whole batch on the canonical model path before touching the compatibility session.
        const staged = new DocumentRuntime(document);
        staged.adoptSnapshot(runtime.getSnapshot());
        const checked = staged.dispatch(commands);
        if (!checked.accepted) return checked;
        const source =
          demo === "bridge"
            ? useBridgeStore
            : demo === "projectile"
              ? useProjectileStore
              : useTownStore;
        const initial =
          demo === "bridge"
            ? bridgeInitializer
            : demo === "projectile"
              ? projectileInitializer
              : townInitializer;
        const store = createStore(
          initial as StateCreator<ReturnType<typeof useBridgeStore.getState>>,
        );
        const fields = (state: object) =>
          Object.fromEntries(
            Object.entries(state)
              .filter(([, v]) => typeof v !== "function")
              .map(([k, v]) => [k, structuredClone(v)]),
          );
        store.setState(fields(source.getState()));
        if (demo === "bridge") {
          for (const c of commands) {
            let type = c.command,
              value = c.arguments.value;
            if (type === "RESET") type = "RESET";
            if (type === "set:present") {
              if (value)
                return {
                  accepted: false,
                  error: "Use rebuild to restore the middle diagonal",
                };
              type = "REMOVE_MIDDLE";
            }
            const result = store
              .getState()
              .dispatch({ type, value } as SimulationCommand);
            if (!result.accepted) return result;
          }
        } else if (demo === "projectile") {
          for (const c of commands) {
            let type = c.command,
              value = c.arguments.value;
            if (type.startsWith("set:"))
              type = `SET_${type
                .slice(4)
                .replace(/[A-Z]/g, (l) => `_${l}`)
                .toUpperCase()}`;
            if (type === "SET_GRAVITY")
              value =
                Object.keys(GRAVITIES).find((k) => GRAVITIES[k] === value) ??
                value;
            if (type === "SET_SHOW_VECTORS")
              type = value ? "SHOW_VECTORS" : "HIDE_VECTORS";
            if (type === "RESTART") type = "LAUNCH";
            const result = store
              .getState()
              .dispatch({ type, value, target: c.node } as SimulationCommand);
            if (!result.accepted) return result;
          }
        } else
          for (const c of commands) {
            let type = c.command,
              value = c.arguments.value;
            if (type.startsWith("set:"))
              type =
                type === "set:roadClosed"
                  ? value
                    ? "CLOSE_ROAD"
                    : "OPEN_ROAD"
                  : `SET_${type.slice(4).toUpperCase()}`;
            const result = store
              .getState()
              .dispatch({ type, value } as SimulationCommand);
            if (!result.accepted) return result;
          }
        const next = fields(store.getState());
        if (demo === "bridge") useBridgeStore.setState(next);
        else if (demo === "projectile") useProjectileStore.setState(next);
        else useTownStore.setState(next);
        return { accepted: true };
      }),
    [document, demo],
  );
  useEffect(() => {
    const snapshot = structuredClone(runtime.getSnapshot());
    const stateFields = (state: object) =>
      Object.fromEntries(
        Object.entries(state).filter(([, v]) => typeof v !== "function"),
      );
    if (demo === "bridge") {
      snapshot.state.model = {
        ...stateFields(bridge),
        ready: true,
      } as unknown as Record<string, unknown>;
      snapshot.outputs.model = {
        data: snapshot.state.model,
        response: bridge.response,
        selected: bridge.selectedMember
          ? {
              member: bridge.response.members.find(
                (m) => m.id === bridge.selectedMember,
              ),
              response: bridge.response.responses[bridge.selectedMember],
            }
          : "Select a bridge member",
      };
      snapshot.state.load = {
        position: bridge.loadPos,
        magnitude: bridge.loadTons,
      };
      snapshot.outputs.load = { data: { ...snapshot.state.load, id: "load" } };
      for (const j of bridge.truss.joints) {
        snapshot.state[j.id] = { x: j.x, y: j.y };
        snapshot.outputs[j.id] = { data: j };
      }
      for (const m of bridge.truss.members) {
        const { id, ...config } = m;
        snapshot.state[id] = config;
        snapshot.outputs[id] = { data: m };
      }
    } else if (demo === "town") {
      snapshot.state.model = {
        ...stateFields(town),
        ready: true,
      } as unknown as Record<string, unknown>;
      snapshot.outputs.model = {
        data: snapshot.state.model,
        time: town.time,
        population: town.citizens.length,
        activity: town.citizens.map((c) => ({
          id: c.id,
          activity: c.behavior.activity,
        })),
      };
    } else
      for (const instance of projectile.instances) {
        const state = {
          angle: instance.launch.angle,
          velocity: instance.launch.velocity,
          gravity: instance.gravity,
          elapsed: instance.elapsed,
          playing: projectile.playing,
          slowMo: projectile.slowMo,
          trajectoryVisible: instance.trajectoryVisible,
          showVectors: projectile.showVectors,
          samples: [],
        };
        snapshot.state[instance.id] = state;
        const node = requireValue(
          document.nodes.find((n) => n.id === instance.id),
        );
        snapshot.outputs[instance.id] = requireValue(
          runtimeProvider(node),
        ).measure(state, node);
      }
    runtime.adoptSnapshot(snapshot);
  }, [runtime, document, demo, bridge, projectile, town]);
  return (
    <RecipeLesson
      document={
        controlsOnly
          ? {
              ...document,
              layout: {
                ...document.layout,
                children: document.layout.children.filter((l) =>
                  l.id.includes("controls"),
                ),
              },
            }
          : document
      }
      runtime={runtime}
      animationEnabled={animationEnabled}
      onAnimationChange={setSessionAnimation}
      onAdvanceTime={advanceSessionTime}
    />
  );
}
