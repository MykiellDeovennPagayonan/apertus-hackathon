import { elementaryCompositions } from "../components/compositions/ElementaryExperiments";
import { Building } from "../components/prefabs/Building";
import { Citizen } from "../components/prefabs/Citizen";
import { Market } from "../components/prefabs/Market";
import { Projectile } from "../components/prefabs/Projectile";
import { buildTruss } from "../components/prefabs/TrussAssembly";
import { ArithmeticExperiment } from "../pre-made/arithmetic";
import { BridgeExperiment } from "../pre-made/bridge";
import { CountingExperiment } from "../pre-made/counting";
import { EqualGroupsExperiment } from "../pre-made/equal-groups";
import { FractionBuilderExperiment } from "../pre-made/fraction-builder";
import { FractionNumberLineExperiment } from "../pre-made/fraction-number-line";
import { ProjectileExperiment } from "../pre-made/projectile";
import { TownExperiment } from "../pre-made/town";
import { templateNames, templateParameters } from "./capabilities";
import { definitions } from "./catalog";
import { validNumber } from "./commands";
import type { CompositionDefinition } from "./definition";
import { elementaryOutputs, isElementaryDemo } from "./elementarySession";
import { isMathDemo, mathActions, stageMathBoard } from "./mathModel";
import { validateValue } from "./parameterSchema";
import { systemProviders } from "./providers";
import type { DemoType } from "./types";
export const compositions = {
  ...elementaryCompositions,
  counting: CountingExperiment,
  arithmetic: ArithmeticExperiment,
  "equal-groups": EqualGroupsExperiment,
  "fraction-builder": FractionBuilderExperiment,
  "fraction-number-line": FractionNumberLineExperiment,

  projectile: ProjectileExperiment,
  bridge: BridgeExperiment,
  town: TownExperiment,
};
export function stageComposition(composition: CompositionDefinition) {
  if (!definitions.has(`compositions/${composition.id}`))
    throw new Error(`${composition.id}: unknown composition definition`);
  const canonical = compositions[composition.demo];
  if (!canonical) throw new Error(`${composition.demo}: unknown model`);
  if (
    composition.plane !== canonical.plane ||
    composition.units !== canonical.units ||
    composition.rendering !== canonical.rendering
  )
    throw new Error(
      `${composition.id}: incompatible model space, units or renderer`,
    );
  if (composition.version !== 1 || composition.instances.length > 64)
    throw new Error("Unsupported composition version or instance budget");
  const supportedSystems = new Set<string>(canonical.systems);
  if (composition.demo === "projectile")
    supportedSystems.add("MeasurementSamplingSystem");
  for (const id of composition.systems)
    if (!supportedSystems.has(id))
      throw new Error(`${id}: no execution adapter for ${composition.demo}`);
  for (const id of canonical.systems)
    if (!composition.systems.includes(id))
      throw new Error(`${id}: missing required domain provider`);
  if (new Set(composition.systems).size !== composition.systems.length)
    throw new Error("Duplicate system binding");
  const identities = new Set<string>();
  for (const instance of composition.instances) {
    if (identities.has(instance.id))
      throw new Error(`${instance.id}: duplicate instance identity`);
    identities.add(instance.id);
  }
  const selected = new Set(
    Object.entries(composition.components).flatMap(([kind, ids]) =>
      ids.map((id) => `${kind}/${id}`),
    ),
  );
  const defaults = composition.defaults;
  if (
    composition.demo === "projectile" &&
    (!validNumber(defaults.angle, 0, 90) ||
      !validNumber(defaults.velocity, 5, 40) ||
      !validNumber(defaults.gravity, 0.001, 100))
  )
    throw new Error(`${composition.id}: invalid projectile defaults`);
  if (
    composition.demo === "bridge" &&
    (!validNumber(defaults.loadPos, 0.05, 0.95) ||
      !validNumber(defaults.loadTons, 2, 30) ||
      ![1, 2].includes(Number(defaults.spanScale)))
  )
    throw new Error(`${composition.id}: invalid bridge defaults`);
  if (
    composition.demo === "town" &&
    (!validNumber(defaults.time, 0, 24) ||
      ![1, 2, 4].includes(Number(defaults.speed)))
  )
    throw new Error(`${composition.id}: invalid clock defaults`);
  const seen = new Set<string>(),
    writers = new Set<string>();
  for (const [kind, ids] of Object.entries(composition.components))
    for (const id of ids) {
      const d = definitions.get(`${kind}/${id}`);
      if (!d) throw new Error(`${kind}/${id}: unknown definition`);
      if (d.version !== composition.version || d.kind !== kind)
        throw new Error(`${id}: incompatible definition`);
      if (d.target && d.target !== composition.rendering)
        throw new Error(`${id}: incompatible renderer`);
    }
  for (const id of composition.systems) {
    const d = definitions.get(`systems/${id}`);
    if (
      !d ||
      d.kind !== "systems" ||
      !composition.components.systems.includes(id)
    )
      throw new Error(`${id}: unavailable system provider`);
    if (!(id in systemProviders))
      throw new Error(`${id}: unavailable code implementation`);
    for (const required of d.required ?? [])
      if (!selected.has(required))
        throw new Error(`${id}: missing dependency ${required}`);
    const scopes = d.entityPrefabs
      ? composition.instances
          .filter((i) => d.entityPrefabs?.includes(i.prefab))
          .map((i) => i.id)
      : [composition.id];
    if (d.entityPrefabs && !scopes.length)
      throw new Error(`${id}: missing compatible entity scope`);
    for (const scope of scopes)
      for (const field of d.writes ?? []) {
        const scopedField = `${scope}.${field}`;
        if (writers.has(scopedField))
          throw new Error(`${scopedField}: conflicting writers`);
        writers.add(scopedField);
      }
  }
  const staged = composition.instances.map((instance) => {
    if (seen.has(instance.id))
      throw new Error(`${instance.id}: duplicate instance identity`);
    seen.add(instance.id);
    if (!composition.components.prefabs.includes(instance.prefab))
      throw new Error(`${instance.id}: unavailable prefab ${instance.prefab}`);
    const p = instance.parameters;
    if (isMathDemo(composition.demo)) {
      const expected = compositions[composition.demo].instances[0].prefab;
      if (instance.prefab !== expected)
        throw new Error(`${instance.id}: invalid math prefab`);
      const board = stageMathBoard(composition.demo, instance.id, p);
      const parts =
        "tokens" in board ? board.tokens : "bars" in board ? board.bars : [];
      const baskets = "baskets" in board ? board.baskets : [];
      for (const part of [...parts, ...baskets]) {
        if (seen.has(part.id))
          throw new Error(`${part.id}: duplicate part identity`);
        seen.add(part.id);
      }
      return board;
    }
    if (isElementaryDemo(composition.demo)) {
      if (instance.prefab !== canonical.instances[0].prefab)
        throw new Error(`${instance.id}: incompatible prefab`);
      validateValue(
        templateParameters(`compositions/${templateNames[composition.demo]}`),
        p,
        `${instance.id}.parameters`,
      );
      elementaryOutputs(composition.demo, p);
      return { id: instance.id, ...p };
    }
    switch (instance.prefab) {
      case "Projectile":
        if (
          Object.keys(p).some(
            (k) => !["angle", "velocity", "gravity"].includes(k),
          )
        )
          throw new Error(`${instance.id}: unknown launch parameter`);
        if (
          !validNumber(p.angle, 0, 90) ||
          !validNumber(p.velocity, 5, 40) ||
          !validNumber(p.gravity, 0.001, 100)
        )
          throw new Error(`${instance.id}: invalid launch parameters`);
        return Projectile(
          instance.id,
          { angle: p.angle, velocity: p.velocity, origin: { x: 0, y: 0 } },
          p.gravity,
        );
      case "TrussAssembly": {
        if (
          typeof p.spanScale !== "number" ||
          ![1, 2].includes(p.spanScale) ||
          !validNumber(p.loadPos, 0.05, 0.95) ||
          !validNumber(p.loadTons, 2, 30) ||
          typeof p.dense !== "boolean"
        )
          throw new Error(`${instance.id}: invalid truss parameters`);
        const truss = buildTruss(
          p.spanScale,
          p.dense,
          instance.id,
          p.loadPos,
          p.loadTons,
        );
        const jointIds = new Set(truss.joints.map((j) => j.id));
        for (const m of truss.members)
          if (!jointIds.has(m.a) || !jointIds.has(m.b))
            throw new Error(`${m.id}: unresolved endpoint`);
        for (const part of [...truss.joints, ...truss.members, truss.load]) {
          if (seen.has(part.id))
            throw new Error(`${part.id}: duplicate part identity`);
          seen.add(part.id);
        }
        return truss;
      }
      case "Citizen":
        if (
          typeof p.homeId !== "string" ||
          !["student", "worker"].includes(String(p.role)) ||
          !validNumber(p.seed, 0, 1)
        )
          throw new Error(`${instance.id}: invalid resident parameters`);
        return Citizen(
          instance.id,
          p.homeId,
          p.role as "student" | "worker",
          p.seed,
        );
      case "Building": {
        const b =
          p as unknown as import("../components/traits/Building").Building;
        if (
          ![b.x, b.z, b.w, b.d, b.h].every(Number.isFinite) ||
          b.w <= 0 ||
          b.d <= 0 ||
          b.h <= 0 ||
          !["house", "school", "workshop", "square", "market"].includes(b.kind)
        )
          throw new Error(`${instance.id}: invalid building dimensions`);
        return Building(instance.id, b);
      }
      case "Market":
        if (typeof p.nearSchool !== "boolean")
          throw new Error(`${instance.id}: invalid market setting`);
        return Market(instance.id, p.nearSchool);
      default:
        throw new Error(`${instance.id}: unavailable prefab implementation`);
    }
  });
  for (const entity of staged)
    if ("homeId" in entity)
      for (const id of [
        entity.homeId,
        entity.daytimeId,
        entity.marketId,
        entity.squareId,
      ])
        if (!seen.has(id))
          throw new Error(`${entity.id}: unresolved resident reference ${id}`);
  if (isElementaryDemo(composition.demo) && composition.instances.length !== 1)
    throw new Error("This composition requires exactly one board");
  if (
    composition.demo === "projectile" &&
    (composition.instances.length < 1 || composition.instances.length > 4)
  )
    throw new Error("Projectile compositions require 1–4 instances");
  if (isMathDemo(composition.demo)) {
    stageMathBoard(composition.demo, "defaults", composition.defaults);
    if (composition.instances.length !== 1)
      throw new Error("Math compositions require exactly one board.");
  }
  const actions = isMathDemo(composition.demo)
    ? mathActions[composition.demo]
    : compositions[composition.demo].actions;
  for (const action of composition.actions)
    if (!actions.includes(action))
      throw new Error(`${action}: unsupported action binding`);
  return staged;
}
export function resolveComposition(demo: DemoType) {
  const composition = compositions[demo];
  if (!composition) throw new Error(`Unknown composition: ${demo}`);
  stageComposition(composition);
  return composition;
}
