import { create, type StateCreator } from "zustand";
import { Projectile } from "../components/prefabs/Projectile";
import { GRAVITIES } from "../components/resources/GravityPresets";
import { BallisticMotionSystem } from "../components/systems/BallisticMotionSystem";
import type { MeasurementProbe } from "../components/traits/MeasurementProbe";
import { type ActionResult, accepted, rejected, validNumber } from "./commands";
import { ProjectileExperiment } from "./recipes/compatibility/compositions/ProjectileExperiment";
import type { UIAction } from "./types";

const defaults = ProjectileExperiment.defaults;
export type ProjectileInstance = ReturnType<typeof Projectile> & {
  gravity: number;
  elapsed: number;
  trajectoryVisible: boolean;
  probe: MeasurementProbe;
};
export function projectileInstance(
  id: string,
  angle: number,
  velocity: number,
  gravity: number,
): ProjectileInstance {
  return {
    ...Projectile(id, { angle, velocity, origin: { x: 0, y: 0 } }, gravity),
    gravity,
    elapsed: 0,
    trajectoryVisible: true,
    probe: { target: id, observable: "y", interval: 0.1, maxSamples: 1000 },
  };
}
function advance(
  instance: ProjectileInstance,
  elapsed: number,
): ProjectileInstance {
  return {
    ...instance,
    elapsed,
    ...BallisticMotionSystem(instance.launch, instance.gravity, elapsed),
  };
}
const initialBodies = () => [
  projectileInstance("projectile/primary", 45, 20, 9.81),
];
function aliases(instances: ProjectileInstance[]) {
  const primary = instances[0],
    comparison = instances[1] ?? null;
  return {
    primary,
    comparison,
    angle: primary.launch.angle,
    velocity: primary.launch.velocity,
    gravity: primary.gravity,
    compareAngle: comparison?.launch.angle ?? null,
    elapsed: primary.elapsed,
  };
}
export interface ProjectileState extends Omit<typeof defaults, never> {
  instances: ProjectileInstance[];
  initial: ProjectileInstance[];
  initialSettings: typeof defaults;
  primary: ProjectileInstance;
  comparison: ProjectileInstance | null;
  elapsed: number;
  launchId: number;
  activate: (
    instances: ProjectileInstance[],
    settings?: Partial<typeof defaults>,
  ) => void;
  dispatch: (command: UIAction) => ActionResult;
  reset: () => void;
  step: (delta: number) => void;
}
export const projectileInitializer: StateCreator<ProjectileState> = (
  set,
  get,
) => ({
  ...defaults,
  instances: initialBodies(),
  initial: initialBodies(),
  initialSettings: { ...defaults },
  ...aliases(initialBodies()),
  launchId: 0,
  activate: (instances, settings = {}) => {
    const initial = structuredClone(instances),
      initialSettings = { ...defaults, ...settings };
    set({
      ...initialSettings,
      initial,
      initialSettings,
      instances: structuredClone(initial),
      ...aliases(initial),
      launchId: get().launchId + 1,
    });
  },
  reset: () => {
    const s = get(),
      instances = structuredClone(s.initial);
    set({
      ...s.initialSettings,
      instances,
      ...aliases(instances),
      launchId: s.launchId + 1,
    });
  },
  step: (delta) => {
    const s = get();
    if (!s.playing || !validNumber(delta, 0, 60)) return;
    const instances = s.instances.map((i) =>
      advance(
        i,
        Math.min(i.metrics.duration, i.elapsed + delta * (s.slowMo ? 0.25 : 1)),
      ),
    );
    set({ instances, ...aliases(instances) });
  },
  dispatch: (command) => {
    const s = get();
    let instances = s.instances.map((i) => ({ ...i, launch: { ...i.launch } }));
    const patch: Partial<ProjectileState> = {};
    const indices = command.target
      ? instances.flatMap((i, index) =>
          i.id === command.target ? [index] : [],
        )
      : instances.map((_, index) => index);
    if (command.target && !indices.length)
      return rejected(`${command.target}: unknown projectile instance`);
    let relaunch = false;
    switch (command.type) {
      case "SET_ANGLE":
      case "COMPARE_ANGLE": {
        if (!validNumber(command.value, 0, 90))
          return rejected("Angle must be 0–90 degrees");
        if (command.type === "COMPARE_ANGLE") {
          if (instances.length > 2)
            return rejected(
              "Comparison command supports two instances; use explicit targets",
            );
          const second =
            instances[1] ??
            projectileInstance(
              "projectile/secondary",
              command.value,
              s.velocity,
              s.gravity,
            );
          instances[1] = {
            ...second,
            launch: { ...second.launch, angle: command.value },
          };
        } else
          for (const index of command.target ? indices : [0])
            instances[index].launch.angle = command.value;
        relaunch = true;
        break;
      }
      case "SET_VELOCITY":
        if (!validNumber(command.value, 5, 40))
          return rejected("Speed must be 5–40 m/s");
        for (const index of indices)
          instances[index].launch.velocity = command.value;
        relaunch = true;
        break;
      case "SET_GRAVITY": {
        const name = Object.keys(GRAVITIES).find(
          (n) => n.toLowerCase() === String(command.value).toLowerCase(),
        );
        if (!name) return rejected("Unknown gravity preset");
        for (const index of indices) instances[index].gravity = GRAVITIES[name];
        patch.gravityName = name;
        relaunch = true;
        break;
      }
      case "SET_TRAJECTORY_VISIBLE":
        if (typeof command.value !== "boolean")
          return rejected("Expected boolean");
        for (const index of indices)
          instances[index].trajectoryVisible = command.value;
        break;
      case "CLEAR_COMPARE":
        instances = instances.slice(0, 1);
        break;
      case "SHOW_VECTORS":
        patch.showVectors = true;
        break;
      case "HIDE_VECTORS":
        patch.showVectors = false;
        break;
      case "SET_PLAYING":
      case "SET_SLOW_MO":
        if (typeof command.value !== "boolean")
          return rejected("Expected boolean");
        if (command.type === "SET_PLAYING") patch.playing = command.value;
        else patch.slowMo = command.value;
        break;
      case "LAUNCH":
        relaunch = true;
        patch.playing = true;
        break;
      case "RESET":
        s.reset();
        return accepted;
      default:
        return rejected(`Unsupported projectile command: ${command.type}`);
    }
    if (relaunch)
      instances = instances.map((i) =>
        !command.target || i.id === command.target ? advance(i, 0) : i,
      );
    else if (
      [
        "SET_TRAJECTORY_VISIBLE",
        "CLEAR_COMPARE",
        "SHOW_VECTORS",
        "HIDE_VECTORS",
        "SET_PLAYING",
        "SET_SLOW_MO",
      ].includes(command.type)
    ) {
      /* Presentation never changes calculated outputs. */
    }
    set({
      ...patch,
      instances,
      ...aliases(instances),
      launchId: s.launchId + (relaunch ? 1 : 0),
    });
    return accepted;
  },
});
export const useProjectileStore = create<ProjectileState>(
  projectileInitializer,
);
