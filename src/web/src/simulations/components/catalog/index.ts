import { assemblyModels } from "../../runtime/assembly";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { Port, PublicDefinition } from "../../runtime/authoring/types";
import { boolean, num, object } from "../../runtime/parameterSchema";
import { liveExplorationCommands } from "../controls/interactionPolicy";
import { componentDefinitions } from "../registry";
import { agentDefinitions } from "./agents";
import { authoringDefinitions } from "./authoring";
import { cycleDefinitions } from "./biogeochemistry";
import { definitionDiscovery } from "./discovery";
import { ecologyControlDefinitions } from "./ecologyControls";
import { explorationDefinitions } from "./exploration";
import { applyExplorationTeaching } from "./explorationTeaching";
import { genericDefinitions } from "./generic";
import {
  learningAppearances,
  learningDefinitions,
  resourceDefinitions,
} from "./learningModels";
import { operationDefinitions } from "./operations";
import { scienceDefinitions } from "./science";
import { spatialDefinitions } from "./spatial";

/** Data-only definitions; executable legacy implementations are adapted in runtime/authoring/providers. */
export const publicDefinitions = new Map<string, PublicDefinition>();
function register(definition: PublicDefinition) {
  if (publicDefinitions.has(definition.id))
    throw new Error(`Duplicate public definition ${definition.id}`);
  publicDefinitions.set(definition.id, definition);
}
for (const d of [
  ...genericDefinitions,
  ...ecologyControlDefinitions,
  ...scienceDefinitions,
  ...cycleDefinitions,
  ...agentDefinitions,
  ...explorationDefinitions,
  ...authoringDefinitions,
  ...spatialDefinitions,
  ...operationDefinitions,
  ...learningDefinitions,
  ...learningAppearances,
  ...resourceDefinitions,
])
  register(d);
requireValue(publicDefinitions.get("layout/Repeater")).inputs = {
  value: { kind: "dataset", unit: "*", optional: true, crossScope: true },
};
for (const d of Object.values(componentDefinitions)) {
  const { id: _id, ...defaults } = d.create("object");
  const schema =
    d.schema.type === "object"
      ? object(
          Object.fromEntries(
            Object.entries(d.schema.properties).filter(([k]) => k !== "id"),
          ),
          d.schema.optional,
        )
      : d.schema;
  register({
    id: d.id,
    version: 1,
    title: d.label,
    discovery: {
      kind: "object",
      group: "objects",
      summary: d.description,
      placement: "Uses a compatible canvas",
    },
    description: d.description,
    category: "models",
    tags: [d.space, d.kind],
    configuration: schema,
    defaults,
    inputs: Object.fromEntries(
      Object.entries(d.properties).map(([key, p]) => [
        key,
        {
          kind: "value",
          unit: p.unit ?? "",
          schema: p.toggle ? boolean : num(p.min, p.max, p.unit, p.integer),
          optional: true,
        },
      ]),
    ),
    outputs: {
      ...Object.fromEntries(
        Object.entries(d.outputContracts).map(([key, p]) => [
          key,
          { kind: "value", unit: p.unit ?? "", crossScope: true } as Port,
        ]),
      ),
      model: { kind: "attachment", unit: d.id, cardinality: "many" },
      appearance: { kind: "attachment", unit: d.space, cardinality: "many" },
    },
    commands: {
      ...(d.kind === "fraction-bar"
        ? {
            togglePiece: {
              arguments: object({ index: num(0, 11, "", true) }),
              description: "Toggle one authored fraction piece",
              timing: "live" as const,
            },
          }
        : {}),
      ...Object.fromEntries(
        Object.entries(d.properties).map(([key, p]) => [
          `set:${key}`,
          {
            arguments: object({
              value: p.toggle ? boolean : num(p.min, p.max, p.unit, p.integer),
            }),
            description: p.label,
            submission: "continuous" as const,
            timing: "live" as const,
          },
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(d.actions ?? {}).map(([key, a]) => [
          key,
          {
            arguments: a.schema,
            description: a.label,
            timing: "live" as const,
          },
        ]),
      ),
      reset: {
        arguments: object({}),
        description: "Restore this object's authored starting values",
        timing: "rebuild",
      },
    },
    placement: [d.space, "logic"],
    lifecycle: {
      authored: Object.keys(defaults).filter(
        (k) => !d.presentation.includes(k),
      ),
      presentation: d.presentation,
      clock: false,
      reset: "authored",
      capture: true,
    },
    assumptions: [],
    runtimeProvider: d.id,
  });
}
for (const m of assemblyModels) {
  const fields =
    m.parameters.type === "object" ? Object.keys(m.parameters.properties) : [];
  register({
    id: m.ref,
    version: m.version,
    title: m.name,
    description: m.description,
    category: "models",
    tags: [m.ref.split("/")[1], m.presentation, ...(m.tags ?? [])],
    configuration: m.parameters,
    defaults: m.defaults,
    inputs: {},
    outputs: Object.fromEntries(
      Object.entries(m.outputs).map(([key, o]) => [
        key,
        {
          kind: /points|series/i.test(key)
            ? "dataset"
            : /grid/i.test(key)
              ? "grid"
              : "value",
          unit: o.unit,
          ...(o.schema ? { schema: o.schema } : {}),
          crossScope: true,
        } as Port,
      ]),
    ),
    commands: {
      ...Object.fromEntries(
        Object.entries(m.actions).map(([key, command]) => [
          key,
          liveExplorationCommands.has(key)
            ? { ...command, submission: "continuous" as const }
            : command,
        ]),
      ),
      RESET: {
        arguments: object({}),
        timing: "rebuild",
        description: "Restore this instance's authored starting configuration",
      },
    },
    placement: ["logic"],
    lifecycle: {
      authored: fields,
      presentation: [],
      clock: Boolean(m.step),
      reset: "authored",
      capture: Boolean(m.configuration),
    },
    assumptions: m.assumptions,
    runtimeProvider: m.ref,
  });
  register({
    ...requireValue(publicDefinitions.get(m.ref)),
    id: `resources/${m.ref.replaceAll("/", "-")}`,
    title: `${m.name} preset`,
    category: "resources",
    inputs: {},
    outputs: {},
    commands: {},
    runtimeProvider: undefined,
    presentationProvider: "resources/preset",
    application: { target: m.ref },
    lifecycle: { ...publicDefinition(m.ref).lifecycle, clock: false },
  });
  const id = `appearance/${m.presentation}`;
  register({
    id,
    version: 1,
    title: `${m.name} appearance`,
    learnerLayout: m.ref.startsWith("prefabs/biogeochemistry/")
      ? "scene-first"
      : undefined,
    description: m.ref.startsWith("prefabs/biogeochemistry/")
      ? `Display an attached ${m.name} model snapshot. ${m.description}`
      : `Display an attached ${m.name} model snapshot`,
    category: "appearance",
    tags: [m.ref.split("/")[1]],
    configuration:
      m.ref.startsWith("prefabs/science/") ||
      m.ref.startsWith("prefabs/biogeochemistry/")
        ? object(
            { question: { type: "string", minLength: 0, maxLength: 180 } },
            ["question"],
          )
        : object({}),
    defaults: {},
    inputs: { model: { kind: "attachment", unit: m.ref } },
    outputs: {},
    commands: {},
    placement: ["lesson"],
    lifecycle: {
      authored:
        m.ref.startsWith("prefabs/science/") ||
        m.ref.startsWith("prefabs/biogeochemistry/")
          ? ["question"]
          : [],
      presentation: [],
      clock: false,
      reset: "authored",
      capture: false,
    },
    assumptions: m.assumptions,
    presentationProvider: id,
  });
  publicDefinition(m.ref).outputs.configuration = {
    kind: "value",
    unit: "",
    schema: m.parameters,
    crossScope: true,
  };
  publicDefinition(m.ref).outputs.appearance = {
    kind: "attachment",
    unit: m.ref,
    cardinality: "many",
  };
}
export function publicDefinition(id: string, version = 1): PublicDefinition {
  const d = publicDefinitions.get(id);
  if (!d) throw new Error(`${id}: unknown public component`);
  if (d.version !== version)
    throw new Error(`${id}: unsupported version ${version}`);
  return d;
}

for (const id of [
  "prefabs/AuthoredGround",
  "prefabs/AuthoredBuilding",
  "prefabs/AuthoredRoad",
  "prefabs/AuthoredPerson",
]) {
  const def = publicDefinition(id);
  def.outputs.data = { kind: "value", unit: "town/object" };
  if (id === "prefabs/AuthoredPerson" && def.configuration.type === "object") {
    const schedule = def.configuration.properties.schedule;
    if (schedule.type === "array" && schedule.items.type === "object")
      schedule.items.properties.target = {
        type: "string",
        minLength: 0,
        maxLength: 160,
      };
  }
  if (id === "prefabs/AuthoredPerson")
    def.configurationReferences = {
      "schedule.*.target": "prefabs/AuthoredBuilding",
    };
}
publicDefinition("canvases/town").inputs.timeline = {
  kind: "attachment",
  unit: "town/timeline",
  optional: true,
};

applyExplorationTeaching(publicDefinitions);

// Author-facing metadata is separate from runtime identity and execution contracts.
for (const definition of publicDefinitions.values()) {
  definition.discovery = definitionDiscovery(definition);
  if (definition.description === definition.title)
    definition.description = definition.discovery.summary;
}
