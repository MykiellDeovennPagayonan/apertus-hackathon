import { createStore, type StateCreator, type StoreApi } from "zustand/vanilla";
import type {
  ExperimentContext,
  Plan,
  TargetedCommand,
} from "../../lib/planner/schema";
import { parsePlan } from "../../lib/planner/schema";
import { publicDefinition } from "../components/catalog";
import { GRAVITIES } from "../components/resources/GravityPresets";
import type { GasState } from "../components/traits/GasState";
import type { MathBoard } from "../components/traits/MathBoards";
import { modelProvider, validateAssemblyInstances } from "./assembly";
import { assemblyInitializer, useAssemblyStore } from "./assemblySession";
import { bridgeInitializer, useBridgeStore } from "./bridgeSession";
import { operations, templateNames, validateCommand } from "./capabilities";
import { type ActionResult, rejected } from "./commands";
import type { CompositionDefinition } from "./definition";
import {
  elementaryInitializer,
  isElementaryDemo,
  useElementaryStore,
} from "./elementarySession";
import { gasInitializer, useGasStore } from "./gasSession";
import { isMathDemo } from "./mathModel";
import { mathInitializer, useMathStore } from "./mathSession";
import {
  projectileInitializer,
  projectileInstance,
  useProjectileStore,
} from "./projectileSession";
import { recipeCommands } from "./recipes/compatibility";
import { loadRecipe as loadAuthoredRecipe } from "./recipes/loadRecipe";
import { listPremadeRecipes, premadeRecipe } from "./recipes/registry";
import { serializeRecipe as serializeAuthoredRecipe } from "./recipes/serializeRecipe";
import {
  parseRecipe,
  type Recipe,
  resolveRecipe,
  serializeRecipe,
} from "./resolver";
import { townInitializer, useTownStore } from "./townSession";
import type { DemoType, UIAction } from "./types";
import { resolveComposition, stageComposition } from "./validation";

let active: DemoType | null = null,
  frame = 0,
  sequence = 0,
  revision = 0,
  sessionId = "";
let automaticMotion = false;
const motionListeners = new Set<() => void>();
let definition: CompositionDefinition | null = null,
  acceptedRecipe: Recipe | null = null;
let authoredSession: ReturnType<typeof loadAuthoredRecipe> | null = null;
let unsubscribeAuthored: (() => void) | undefined;
export const getAuthoredSession = () => authoredSession;
export function activatePremadeSession(slug: Exclude<DemoType, "assembly">) {
  return activateAuthoredSession(loadAuthoredRecipe(premadeRecipe(slug)), slug);
}
function activateAuthoredSession(
  candidate: ReturnType<typeof loadAuthoredRecipe>,
  slug: DemoType,
) {
  disposeSession();
  authoredSession = candidate;
  active = slug;
  sessionId = `experiment-${++sequence}`;
  revision = 0;
  const fingerprint = () =>
    JSON.stringify(candidate.runtime.getSnapshot().state, (key, value) =>
      ["elapsed", "samples"].includes(key) ? undefined : value,
    );
  let previousState = fingerprint();
  unsubscribeAuthored = candidate.runtime.subscribe(() => {
    const next = fingerprint();
    if (next !== previousState) {
      previousState = next;
      revision++;
    }
  });
  runClock(slug);
  return candidate;
}
let recentChange: ExperimentContext["recentChange"];
let correlationId: string | null = null;
const planCorrelations = new WeakMap<object, string>();
export function correlatePlan(plan: Plan, id: string) {
  planCorrelations.set(plan, id);
}
export function getDiagnosticSnapshot() {
  return structuredClone({
    correlationId,
    recipe: acceptedRecipe,
    context: getExperimentContext(),
    state: authoredSession
      ? authoredSession.runtime.getSnapshot()
      : active
        ? data(stores(active).live.getState())
        : null,
  });
}
export function disposeSession() {
  if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(frame);
  unsubscribeAuthored?.();
  unsubscribeAuthored = undefined;
  authoredSession = null;
  active = null;
  definition = null;
  acceptedRecipe = null;
  sessionId = "";
  recentChange = undefined;
  correlationId = null;
  useMathStore.getState().pause();
}
function data<T extends object>(state: T): Partial<T> {
  return structuredClone(
    Object.fromEntries(
      Object.entries(state).filter(([, v]) => typeof v !== "function"),
    ),
  ) as Partial<T>;
}
function candidate<T extends object>(
  initializer: StateCreator<T>,
  source: StoreApi<T>,
): StoreApi<T> {
  const store = createStore(initializer);
  store.setState(data(source.getState()));
  return store;
}
function stores(demo: DemoType) {
  if (demo === "assembly")
    return {
      candidate: candidate(assemblyInitializer, useAssemblyStore),
      live: useAssemblyStore,
    };
  if (demo === "gas")
    return {
      candidate: candidate(gasInitializer, useGasStore),
      live: useGasStore,
    };
  if (demo === "projectile")
    return {
      candidate: candidate(projectileInitializer, useProjectileStore),
      live: useProjectileStore,
    };
  if (demo === "bridge")
    return {
      candidate: candidate(bridgeInitializer, useBridgeStore),
      live: useBridgeStore,
    };
  if (demo === "town")
    return {
      candidate: candidate(townInitializer, useTownStore),
      live: useTownStore,
    };
  if (isMathDemo(demo))
    return {
      candidate: candidate(mathInitializer, useMathStore),
      live: useMathStore,
    };
  return {
    candidate: candidate(elementaryInitializer, useElementaryStore),
    live: useElementaryStore,
  };
}
function route(
  demo: DemoType,
  command: UIAction,
  store: ReturnType<typeof stores>["candidate"],
): ActionResult {
  const state = store.getState();
  try {
    // The original case-insensitive preset adapter uses the same enum validation.
    if (command.type === "SET_GRAVITY" && typeof command.value === "string")
      command = {
        ...command,
        value:
          command.value[0].toUpperCase() + command.value.slice(1).toLowerCase(),
      };
    if (command.type !== "SELECT_MEMBER" || command.value !== null)
      validateCommand(demo, command);
    const target = command.target;
    if (target && target !== "session") {
      const ids =
        (demo === "assembly" || demo === "projectile") && "instances" in state
          ? state.instances.map((i) => i.id)
          : demo === "bridge" && "truss" in state
            ? [state.truss.id, state.truss.load.id]
            : isMathDemo(demo) && "board" in state
              ? [state.board.id]
              : isElementaryDemo(demo) && "id" in state
                ? [state.id]
                : [];
      if (!ids.includes(target))
        return rejected(`${target}: unknown or unavailable target`);
      if (
        operations[demo][command.type].target === "session" &&
        !isMathDemo(demo) &&
        !isElementaryDemo(demo)
      )
        return rejected(`${target}: ${command.type} requires session target`);
    }
    const adapted =
      target === "session" ? { ...command, target: undefined } : command;
    // Each trusted store accepts its domain commands after shared schema validation.
    return (state.dispatch as (c: UIAction) => ActionResult)(adapted);
  } catch (error) {
    return rejected(error instanceof Error ? error.message : "Invalid command");
  }
}
function commitCandidate(pair: ReturnType<typeof stores>) {
  // Domain union is erased only at this store boundary; only staged data is committed.
  (pair.live.setState as (value: object) => void)(
    data(pair.candidate.getState()),
  );
}
/** Presentation clock policy; domain playing state and calculations remain authoritative. */
export function setSessionAnimation(enabled: boolean) {
  if (automaticMotion === enabled) return;
  automaticMotion = enabled;
  for (const listener of motionListeners) listener();
}
export const getSessionAnimation = () => automaticMotion;
export function subscribeSessionAnimation(listener: () => void) {
  motionListeners.add(listener);
  return () => {
    motionListeners.delete(listener);
  };
}
export function advanceSessionTime(delta: number): ActionResult {
  if (!active || !Number.isFinite(delta) || delta < 0 || delta > 60)
    return rejected("Choose a finite timestep from zero to 60 seconds.");
  try {
    if (authoredSession) {
      let remaining = delta;
      while (remaining > 0) {
        const step = Math.min(remaining, 1);
        authoredSession.runtime.step(step);
        remaining -= step;
      }
      return { accepted: true };
    }
    if (active === "assembly") useAssemblyStore.getState().step(delta);
    if (active === "projectile") useProjectileStore.getState().step(delta);
    if (active === "town") useTownStore.getState().step(delta);
    if (active === "gas") useGasStore.getState().step(delta);
    if (isMathDemo(active)) useMathStore.getState().step(delta);
    return { accepted: true };
  } catch (error) {
    return rejected(
      error instanceof Error ? error.message : "Unable to advance time.",
    );
  }
}
function runClock(demo: DemoType) {
  setSessionAnimation(false);
  let previous: number | undefined;
  const identity = sessionId;
  const tick = (now: number) => {
    if (active !== demo || identity !== sessionId) return;
    const delta = previous === undefined ? 0 : (now - previous) / 1000;
    previous = now;
    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced || automaticMotion) advanceSessionTime(delta);
    frame = requestAnimationFrame(tick);
  };
  if (
    ((demo === "assembly" &&
      useAssemblyStore
        .getState()
        .instances.some((i) => modelProvider(i.provider).step)) ||
      demo === "gas" ||
      demo === "projectile" ||
      demo === "town" ||
      (isMathDemo(demo) && demo !== "fraction-builder")) &&
    typeof requestAnimationFrame !== "undefined"
  )
    frame = requestAnimationFrame(tick);
}
function initialRecipe(composition: CompositionDefinition): Recipe {
  if (composition.demo === "assembly" && composition.assembly)
    return {
      schemaVersion: 1,
      composition: { ref: "assemblies/GeneratedExperiment", version: 1 },
      parameters: {},
      assembly: structuredClone(composition.assembly),
    };
  const recipe: Recipe = {
    schemaVersion: 1,
    composition: { ref: `compositions/${composition.id}`, version: 1 },
    parameters: {},
  };
  if (composition.demo === "projectile") {
    const names = Object.fromEntries(
      Object.entries(GRAVITIES).map(([name, value]) => [String(value), name]),
    );
    recipe.instances = composition.instances.map((i) => ({
      id: i.id,
      prefab: { ref: "prefabs/Projectile", version: 1 },
      parameters: {
        angle: Number(i.parameters.angle),
        speed: Number(i.parameters.velocity),
        gravityPreset: names[String(i.parameters.gravity)] ?? "unsupported",
      },
    }));
  } else if (composition.demo === "town")
    recipe.parameters = {
      time: composition.defaults.time,
      speed: composition.defaults.speed,
      playing: composition.defaults.playing,
    };
  else if (composition.demo === "bridge")
    recipe.parameters = Object.fromEntries(
      ["loadPos", "loadTons", "spanScale", "dense"].map((k) => [
        k,
        composition.defaults[k],
      ]),
    );
  else recipe.parameters = structuredClone(composition.instances[0].parameters);
  return recipe;
}
export function activateSession(
  demo: DemoType,
  composition: CompositionDefinition = resolveComposition(demo),
  recipe?: Recipe,
) {
  if (composition.demo !== demo) throw new Error("Composition demo mismatch");
  const staged = stageComposition(composition),
    pair = stores(demo),
    state = pair.candidate.getState();
  if (demo === "assembly" && "assembly" in state && composition.assembly) {
    state.activate(composition.assembly);
  } else if (demo === "gas" && "inputs" in state) {
    state.activate(
      composition.instances[0].id,
      composition.instances[0].parameters as unknown as GasState,
    );
  } else if (
    demo === "projectile" &&
    "instances" in state &&
    !("assembly" in state)
  ) {
    const instances = composition.instances.map((i) =>
      projectileInstance(
        i.id,
        Number(i.parameters.angle),
        Number(i.parameters.velocity),
        Number(i.parameters.gravity),
      ),
    );
    state.activate(instances, composition.defaults);
  } else if (demo === "bridge" && "truss" in state) {
    state.activate(
      { ...state.initial, ...composition.defaults },
      staged[0] as typeof state.truss,
    );
  } else if (demo === "town" && "citizens" in state) {
    const citizens = staged.filter(
      (i) => "homeId" in i,
    ) as typeof state.citizens;
    const buildings = staged.filter(
      (i) => "building" in i && i.id !== "market",
    ) as typeof state.buildings;
    const market = staged.find((i) => i.id === "market") as typeof state.market;
    state.activate({
      ...state.initial,
      ...composition.defaults,
      citizens,
      buildings,
      market,
    });
  } else if (isMathDemo(demo) && "board" in state)
    state.activate(demo, staged[0] as MathBoard);
  else if (isElementaryDemo(demo) && "parameters" in state)
    state.activate(
      demo,
      composition.instances[0].id,
      composition.instances[0].parameters,
    );
  else throw new Error("No activation adapter for composition");
  // All resolution and initialization complete before the previous clock/world is disposed.
  disposeSession();
  commitCandidate(pair);
  active = demo;
  definition = composition;
  acceptedRecipe = recipe ?? initialRecipe(composition);
  sessionId = `experiment-${++sequence}`;
  revision = 0;
  runClock(demo);
  return composition;
}
export function dispatchBatch(
  demo: DemoType,
  commands: UIAction[],
): ActionResult {
  if (active !== demo) return rejected("This experiment is not active");
  if (commands.length < 1 || commands.length > 8)
    return rejected("A batch requires 1–8 commands");
  if (authoredSession) {
    try {
      if (commands.length === 1 && commands[0].type === "RESET")
        return authoredSession.runtime.reset();
      const translated = recipeCommands(authoredSession.runtime, commands);
      if (!translated.length)
        return rejected("This action is unavailable for the current recipe.");
      return authoredSession.runtime.dispatch(translated);
    } catch (error) {
      return rejected(
        error instanceof Error ? error.message : "Invalid recipe command",
      );
    }
  }
  const changeTarget = commands.find(
    (command) => command.target && command.target !== "session",
  )?.target;
  const contextBefore = getExperimentContext();
  const before = changeTarget
    ? contextBefore?.instances.find((instance) => instance.id === changeTarget)
    : contextBefore?.instances[0];
  const pair = stores(demo);
  for (const [index, c] of commands.entries()) {
    const result = route(demo, c, pair.candidate);
    if (!result.accepted)
      return rejected(
        `commands[${index}] ${c.target ?? "session"}: ${result.error}`,
      );
  }
  if (demo === "assembly") {
    try {
      const staged = pair.candidate.getState() as ReturnType<
        typeof useAssemblyStore.getState
      >;
      validateAssemblyInstances(staged.instances);
    } catch (error) {
      return rejected(
        error instanceof Error ? error.message : "Invalid instance comparison",
      );
    }
  }
  commitCandidate(pair);
  revision++;
  const contextAfter = getExperimentContext();
  const after = changeTarget
    ? contextAfter?.instances.find((instance) => instance.id === changeTarget)
    : contextAfter?.instances[0];
  if (commands.some((c) => c.type === "RESET")) recentChange = undefined;
  else if (
    before &&
    after &&
    commands.some(
      (c) => !["SET_PLAYING", "REPLAY", "NEXT_STEP"].includes(c.type),
    )
  )
    recentChange = {
      before: { ...before.parameters, ...before.outputs },
      after: { ...after.parameters, ...after.outputs },
    };
  return { accepted: true };
}
export function dispatchCommand(demo: DemoType, command: UIAction) {
  return dispatchBatch(demo, [command]);
}
export function executePlan(input: Plan): ActionResult & { demo?: DemoType } {
  try {
    const plan = parsePlan(input, active, getExperimentContext());
    if (
      plan.operation === "explain" ||
      plan.operation === "unsupported" ||
      plan.operation === "clarify"
    )
      return { accepted: true };
    if (plan.operation === "create") {
      const { message: _message, operation: _operation, ...recipe } = plan;
      const resolved = resolveRecipe(recipe);
      activateSession(resolved.demo, resolved, recipe);
      correlationId = planCorrelations.get(input) ?? null;
      return { accepted: true, demo: resolved.demo };
    }
    if (
      plan.sessionId !== sessionId ||
      plan.expectedRevision !== revision ||
      !active
    )
      return rejected("Stale plan: the experiment has changed");
    const result = dispatchBatch(
      active,
      plan.commands.map((c: TargetedCommand) => ({
        type: c.action,
        target: c.target,
        ...c.arguments,
      })),
    );
    if (result.accepted)
      correlationId = planCorrelations.get(input) ?? correlationId;
    return result;
  } catch (error) {
    return rejected(error instanceof Error ? error.message : "Invalid plan");
  }
}
/** Expose edit-relevant summaries without sending nested visual geometry or large graph datasets. */
function plannerOutputs(outputs: Record<string, unknown>) {
  const shallow = (value: unknown, depth = 0): boolean => {
    if (depth > 2) return false;
    if (
      value === null ||
      ["number", "string", "boolean"].includes(typeof value)
    )
      return true;
    if (Array.isArray(value))
      return value.length <= 8 && value.every((v) => shallow(v, depth + 1));
    if (value && typeof value === "object")
      return Object.values(value).every((v) => shallow(v, depth + 1));
    return false;
  };
  return structuredClone(
    Object.fromEntries(
      Object.entries(outputs).filter(([, value]) => shallow(value)),
    ),
  );
}
export function getExperimentContext(): ExperimentContext | null {
  if (active && authoredSession) {
    const demo = active;
    const { runtime, recipe } = authoredSession;
    const snapshot = runtime.getSnapshot();
    const instances = runtime.document.nodes
      .filter(
        (node) =>
          publicDefinition(node.definition).category === "models" &&
          !["models/TrussJoint", "models/TrussMember"].includes(
            node.definition,
          ),
      )
      .map((node) => {
        const state = snapshot.state[node.id] ?? {};
        return {
          id: node.id,
          label: node.label,
          parameters: plannerOutputs(state),
          outputs: plannerOutputs(snapshot.outputs[node.id] ?? {}),
          actions: Object.keys(operations[demo]).filter((action) => {
            try {
              return (
                recipeCommands(runtime, [{ type: action, target: node.id }])
                  .length > 0
              );
            } catch {
              return false;
            }
          }),
        };
      });
    return {
      sessionId,
      revision,
      composition: {
        ref: `compositions/${templateNames[active as Exclude<DemoType, "assembly">]}`,
        version: 1,
      },
      instances,
      views: ["RecipeLesson"],
      assumptions: recipe.assumptions,
    };
  }
  if (!active || !definition) return null;
  const actions = Object.keys(operations[active]);
  let instances: ExperimentContext["instances"];
  if (active === "assembly") {
    instances = useAssemblyStore.getState().instances.map((i) => ({
      id: i.id,
      label: i.label,
      parameters: structuredClone(i.parameters),
      outputs: plannerOutputs(i.outputs),
      actions: Object.keys(modelProvider(i.provider).actions),
    }));
  } else if (active === "gas") {
    const s = useGasStore.getState();
    instances = [
      {
        id: s.id,
        label: "Gas sample",
        parameters: { ...s.inputs },
        outputs: { ...s.metrics },
        actions,
      },
    ];
  } else if (active === "projectile")
    instances = useProjectileStore.getState().instances.map((i, index) => ({
      id: i.id,
      label:
        index === 0
          ? "Primary projectile"
          : index === 1
            ? "Second projectile"
            : `Projectile ${index + 1}`,
      parameters: {
        angle: i.launch.angle,
        speed: i.launch.velocity,
        gravity: i.gravity,
        trajectoryVisible: i.trajectoryVisible,
      },
      outputs: {
        range: i.metrics.range,
        maxHeight: i.metrics.maxHeight,
        duration: i.metrics.duration,
      },
      actions,
    }));
  else if (active === "bridge") {
    const s = useBridgeStore.getState();
    instances = [
      {
        id: s.truss.load.id,
        label: "Bridge load",
        parameters: {
          loadPos: s.loadPos,
          loadTons: s.loadTons,
          spanScale: s.spanScale,
          dense: s.dense,
        },
        outputs: {
          supportShares: s.response.supportShares,
          maxResponseScore: Math.max(
            0,
            ...Object.values(s.response.responses).map((r) => r.score),
          ),
        },
        actions,
      },
    ];
  } else if (active === "town") {
    const s = useTownStore.getState();
    instances = [
      {
        id: "town",
        label: "Town schedule",
        parameters: {
          time: s.time,
          speed: s.speed,
          roadClosed: s.roadClosed,
          marketBusy: s.marketBusy,
        },
        outputs: {
          citizens: s.citizens.length,
          traveling: s.citizens.filter((c) => c.status === "traveling").length,
        },
        actions,
      },
    ];
  } else if (isMathDemo(active)) {
    const b = useMathStore.getState().board;
    const parameters = Object.fromEntries(
      Object.entries(b).filter(
        ([key]) =>
          ![
            "tokens",
            "baskets",
            "bars",
            "sequence",
            "visual",
            "jumps",
            "feedback",
            "id",
            "demo",
          ].includes(key),
      ),
    );
    if ("bars" in b) parameters.bars = b.bars.map((bar) => ({ ...bar.value }));
    const outputs: Record<string, unknown> = { feedback: b.feedback };
    if ("result" in b) outputs.result = b.result;
    if ("quotient" in b) {
      outputs.quotient = b.quotient;
      outputs.remainder = b.remainder;
    }
    if ("relation" in b) outputs.relation = b.relation;
    if ("target" in b)
      outputs.count = b.tokens.filter((t) =>
        b.mode === "count" ? t.ordinal !== null : t.zone === 1,
      ).length;
    instances = [
      {
        id: b.id,
        label: "Math board",
        parameters,
        outputs,
        actions,
      },
    ];
  } else {
    const s = useElementaryStore.getState();
    instances = [
      {
        id: s.id,
        label: "Activity board",
        parameters: s.parameters,
        outputs: s.outputs,
        actions,
      },
    ];
  }
  return {
    sessionId,
    revision,
    ...(recentChange ? { recentChange } : {}),
    composition: {
      ref:
        active === "assembly"
          ? "assemblies/GeneratedExperiment"
          : `compositions/${definition.id}`,
      version: 1,
    },
    instances,
    views: [...definition.components.views],
    assumptions: [...definition.assumptions],
  };
}
export function getActiveDefinition() {
  return definition;
}
/** Saves the accepted initial recipe, not a running checkpoint. */
export function saveRecipe() {
  if (authoredSession)
    return serializeAuthoredRecipe(
      authoredSession.recipe,
      authoredSession.runtime.document,
    );
  if (!acceptedRecipe) throw new Error("No active recipe");
  return serializeRecipe(acceptedRecipe);
}
export function loadRecipe(text: string) {
  const input: unknown = JSON.parse(text);
  if (
    input &&
    typeof input === "object" &&
    "recipeVersion" in input &&
    input.recipeVersion === 2
  ) {
    const candidate = loadAuthoredRecipe(input);
    const entry = listPremadeRecipes().find(
      ({ recipe }) => recipe.id === candidate.recipe.id,
    );
    return activateAuthoredSession(
      candidate,
      (entry?.slug ?? "assembly") as DemoType,
    );
  }
  const recipe = parseRecipe(text),
    resolved = resolveRecipe(recipe);
  return activateSession(resolved.demo, resolved, recipe);
}
