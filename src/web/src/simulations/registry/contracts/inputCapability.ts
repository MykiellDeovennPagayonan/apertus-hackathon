import { commandPresentation } from "./commandPresentation";
import { parameterLeaves } from "./controlContract";
import type { PublicDefinition } from "./publicDefinition";

export type InputCapability = {
  id: string;
  definition: string;
  command: string;
  field: string;
  names: string[];
  units: string[];
  fields: string[];
};
export type InputRequirement = {
  interaction: string;
  capabilities: string[];
};

export function inputName(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => !["a", "an", "the", "its"].includes(word))
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
    .join(" ");
}

/** Identities come from command contracts, including derived quantities absent from configuration. */
export function inputCapability(
  definition: PublicDefinition,
  command: string,
  field: string,
): InputCapability {
  const presentation = commandPresentation(command, definition.id);
  const leaves = parameterLeaves(definition.commands[command].arguments).filter(
    (leaf) => !field || leaf.path === field,
  );
  const property = command.startsWith("set:") ? command.slice(4) : undefined;
  const names = [
    presentation.label,
    ...presentation.legacyLabels,
    property,
    property ? definition.outputs[property]?.description : undefined,
    field && field !== "value" ? field.split(".").at(-1) : undefined,
    presentation.presentation[field || "value"]?.label,
  ].filter((name): name is string => !!name);
  return {
    id: JSON.stringify([definition.id, command, field]),
    definition: definition.id,
    command,
    field,
    names: [...new Set(names)],
    fields: leaves.map((leaf) => leaf.path),
    units: [
      ...new Set(
        leaves.flatMap(({ schema }) =>
          "unit" in schema ? [schema.unit ?? ""] : [],
        ),
      ),
    ],
  };
}

/** Longer registered names take precedence over a generic name within the same phrase. */
export function namedInputRequirements(
  text: string,
  capabilities: Pick<InputCapability, "id" | "names">[],
): InputRequirement[] {
  const phrase = ` ${inputName(text)} `;
  const matches = capabilities.flatMap((capability) =>
    capability.names.flatMap((label) => {
      const name = inputName(label);
      if (name.length < 2) return [];
      const start = phrase.indexOf(` ${name} `);
      return start < 0
        ? []
        : [{ name, start, end: start + name.length, id: capability.id }];
    }),
  );
  const retained = matches.filter(
    (match) =>
      !matches.some(
        (other) =>
          other.start <= match.start &&
          other.end >= match.end &&
          other.name.length > match.name.length,
      ),
  );
  return [...new Set(retained.map((match) => match.name))].map(
    (interaction) => ({
      interaction,
      capabilities: [
        ...new Set(
          retained
            .filter((match) => match.name === interaction)
            .map((match) => match.id),
        ),
      ],
    }),
  );
}

/** Read only requested changes, excluding the outcome clause and explicitly negated actions. */
export function inputRequestSpans(prompt: string) {
  const changes =
    /\b(?:adjust|change|changing|modify|vary|move|drag|resize|manipulate|increase|decrease|choose|select|set|based on)\s+([^?!.;]+)/gi;
  return [...prompt.matchAll(changes)].flatMap((match) => {
    const before = prompt.slice(0, match.index).trim();
    if (/(?:do not|don't|never|without)\s*(?:\w+\s+){0,2}$/i.test(before))
      return [];
    if (/^set\s+up\b/i.test(match[0])) return [];
    return [
      match[1].split(
        /\b(?:affect|affects|to see|and see|observe|watch|without|instead)\b/i,
      )[0],
    ];
  });
}
