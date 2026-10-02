import { GRAVITIES } from "../components/resources/GravityPresets";
import { templateDemo, templateParameters } from "./capabilities";
import type { CompositionDefinition } from "./definition";
import { validateValue } from "./parameterSchema";
import { compositions, stageComposition } from "./validation";
export interface Recipe {
  schemaVersion: 1;
  composition: { ref: string; version: 1 };
  parameters: Record<string, unknown>;
  instances?: {
    id: string;
    prefab: { ref: string; version: 1 };
    parameters: { angle: number; speed: number; gravityPreset: string };
  }[];
  views?: {
    ref: string;
    version: 1;
    binding: "world" | "results" | "time-series";
  }[];
}
/** Only bindings with implemented adapters are accepted. Free assembly currently supports ballistic prefabs. */
export function resolveRecipe(recipe: Recipe): CompositionDefinition {
  if (recipe.schemaVersion !== 1 || recipe.composition.version !== 1)
    throw new Error("Unsupported recipe version");
  const demo = templateDemo(recipe.composition.ref);
  validateValue(
    templateParameters(recipe.composition.ref),
    recipe.parameters,
    "parameters",
  );
  const composition: CompositionDefinition = structuredClone(
    compositions[demo],
  );
  composition.id = recipe.composition.ref.split("/")[1];
  const p = recipe.parameters;
  if (demo === "projectile") {
    const gravityName = String(p.gravityPreset ?? "Earth"),
      gravity = GRAVITIES[gravityName],
      speed = Number(p.speed ?? 20);
    if (p.angle !== undefined && p.angles !== undefined)
      throw new Error("Use angle or angles, not both");
    let angles = p.angles as number[] | undefined;
    if (!angles)
      angles =
        composition.id === "AngleComparisonExperiment"
          ? [30, 60]
          : [Number(p.angle ?? 45)];
    composition.defaults = {
      ...composition.defaults,
      angle: angles[0],
      velocity: speed,
      gravity,
      gravityName,
      compareAngle: angles[1] ?? null,
    };
    composition.instances = angles.map((angle, i) => ({
      id: i === 0 ? "projectile/primary" : "projectile/secondary",
      prefab: "Projectile",
      parameters: { angle, velocity: speed, gravity },
    }));
    if (recipe.instances) {
      if (recipe.instances.length < 1 || recipe.instances.length > 4)
        throw new Error("Assembly requires 1–4 projectiles");
      composition.instances = recipe.instances.map((i) => {
        if (i.prefab.ref !== "prefabs/Projectile" || i.prefab.version !== 1)
          throw new Error(`${i.id}: unknown prefab or version`);
        validateValue(
          templateParameters("compositions/ProjectileExperiment"),
          i.parameters,
          `${i.id}.parameters`,
        );
        if (!/^[a-z][a-zA-Z0-9/_-]{0,79}$/.test(i.id))
          throw new Error("Invalid instance identity");
        return {
          id: i.id,
          prefab: "Projectile",
          parameters: {
            angle: i.parameters.angle,
            velocity: i.parameters.speed,
            gravity: GRAVITIES[i.parameters.gravityPreset],
          },
        };
      });
      const first = composition.instances[0];
      composition.defaults = {
        ...composition.defaults,
        angle: first.parameters.angle,
        velocity: first.parameters.velocity,
        gravity: first.parameters.gravity,
        gravityName: recipe.instances[0].parameters.gravityPreset,
        compareAngle: composition.instances[1]?.parameters.angle ?? null,
      };
    }
  } else {
    if (recipe.instances)
      throw new Error(`${demo}: custom prefab assembly is unavailable`);
    composition.defaults = { ...composition.defaults, ...p };
    if (demo !== "town")
      composition.instances = [
        {
          ...composition.instances[0],
          parameters: { ...composition.instances[0].parameters, ...p },
        },
      ];
  }
  if (demo === "projectile") {
    composition.components.views = [
      ...composition.components.views,
      "ResultsTableView",
      "ComparisonView",
      "EntityInspectorView",
      "TimeSeriesView",
    ];
    composition.components.traits = [
      ...composition.components.traits,
      "MeasurementProbe",
    ];
    composition.components.systems = [
      ...composition.components.systems,
      "MeasurementSamplingSystem",
    ];
    composition.systems = [...composition.systems, "MeasurementSamplingSystem"];
  }
  if (recipe.views) {
    if (recipe.views.length < 1 || recipe.views.length > 6)
      throw new Error("Select 1–6 views");
    const supported: Record<string, string[]> = {
      "views/SVGWorldView": ["world"],
      "views/ResultsTableView": ["results"],
      "views/EntityInspectorView": ["world"],
      ...(demo === "projectile"
        ? {
            "views/ComparisonView": ["results"],
            "views/TimeSeriesView": ["time-series"],
            "views/XYGraphView": ["results"],
          }
        : {}),
      ...(demo === "town" ? { "views/ThreeWorldView": ["world"] } : {}),
    };
    if (demo === "town") delete supported["views/SVGWorldView"];
    const seen = new Set<string>();
    for (const v of recipe.views) {
      if (v.version !== 1 || !supported[v.ref]?.includes(v.binding))
        throw new Error(
          `${v.ref}: incompatible view or missing ${v.binding} dataset`,
        );
      if (seen.has(v.ref)) throw new Error(`${v.ref}: duplicate binding`);
      seen.add(v.ref);
    }
    composition.components.views = recipe.views.map((v) => v.ref.split("/")[1]);
  }
  stageComposition(composition);
  return composition;
}
export function serializeRecipe(recipe: Recipe) {
  resolveRecipe(recipe);
  return JSON.stringify(recipe, null, 2);
}
export function parseRecipe(text: string): Recipe {
  if (text.length > 16000) throw new Error("Recipe exceeds size limit");
  const r = JSON.parse(text);
  if (
    !r ||
    typeof r !== "object" ||
    Array.isArray(r) ||
    Object.keys(r).some(
      (k) =>
        ![
          "schemaVersion",
          "composition",
          "parameters",
          "instances",
          "views",
        ].includes(k),
    )
  )
    throw new Error("Invalid recipe envelope");
  validateValue(
    {
      type: "object",
      properties: {
        ref: { type: "string", maxLength: 100 },
        version: { type: "enum", values: [1] },
      },
    },
    r.composition,
    "composition",
  );
  if (Object.hasOwn(r, "instances"))
    validateValue(
      {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            id: { type: "string", maxLength: 80 },
            prefab: {
              type: "object",
              properties: {
                ref: { type: "string", maxLength: 100 },
                version: { type: "enum", values: [1] },
              },
            },
            parameters: {
              type: "object",
              properties: {
                angle: { type: "number", minimum: 0, maximum: 90 },
                speed: { type: "number", minimum: 5, maximum: 40 },
                gravityPreset: {
                  type: "enum",
                  values: ["Earth", "Moon", "Mars", "Jupiter"],
                },
              },
            },
          },
        },
      },
      r.instances,
      "instances",
    );
  if (Object.hasOwn(r, "views"))
    validateValue(
      {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            ref: { type: "string", maxLength: 100 },
            version: { type: "enum", values: [1] },
            binding: {
              type: "enum",
              values: ["world", "results", "time-series"],
            },
          },
        },
      },
      r.views,
      "views",
    );
  resolveRecipe(r);
  return r;
}
