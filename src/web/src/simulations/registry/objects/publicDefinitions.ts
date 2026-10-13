import { boolean, num, object } from "../contracts/parameterSchema";
import type { Port, PublicDefinition } from "../contracts/publicDefinition";
import { componentDefinitions } from "./registry";
export const objectDefinitions: PublicDefinition[] = [];
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
  objectDefinitions.push({
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
