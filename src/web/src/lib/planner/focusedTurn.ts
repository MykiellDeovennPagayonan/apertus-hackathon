import { publicDefinitions } from "../../simulations/components/catalog";
import { schemaDefault } from "../../simulations/components/composites/catalog";
import type { ToolRequest } from "../../simulations/runtime/authoring/operations";
import {
  choice,
  object,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { toJsonSchema } from "../apertus/structuredSchema";
import { requestStructured } from "../apertus/transport";
import { parseArgumentJson } from "./argumentJson";
import type { GenerationBudget } from "./budget";
import type { FixerResult } from "./formatFixer";
import type { AllowedTurnTool } from "./turnSchema";

/** Application owns the envelope; inference supplies only the chosen operation's arguments. */
export async function focusedTurn(
  prompt: string,
  tools: AllowedTurnTool[],
  context: unknown,
  budget: GenerationBudget,
  turn: number,
  verify?: (request: ToolRequest) => void,
): Promise<FixerResult> {
  if (!tools.length)
    return { action: "done", request: null, fixes: [], issues: [] };
  // IDs are allocated by the application. Inference controls component choices
  // and configuration, never uniqueness or an empty configuration contract.
  const originalTools = tools;
  const aliases = (context as { aliases?: string[] })?.aliases ?? [];
  let aliasIndex = turn + 1;
  while (aliases.includes(`part_${aliasIndex}`)) aliasIndex++;
  const insertionAlias = `part_${aliasIndex}`;
  tools = tools.map((tool) => {
    if (tool.schema.type !== "object") return tool;
    if (tool.tool === "arrange") {
      const { preserveLocked: _locked, ...properties } = tool.schema.properties;
      return { ...tool, schema: { ...tool.schema, properties } };
    }
    if (tool.tool !== "insert_component") return tool;
    const {
      alias: _alias,
      configuration,
      ...properties
    } = tool.schema.properties;
    const empty =
      configuration?.type === "object" &&
      !Object.keys(configuration.properties).length;
    return {
      ...tool,
      schema: {
        ...tool.schema,
        properties: empty ? properties : { ...properties, configuration },
      },
    };
  });
  const single = tools.length === 1;
  const schemas = tools.map((tool, i) => ({
    id: `candidate${i + 1}`,
    tool: tool.tool,
    arguments: tool.schema,
  }));
  const responseSchema = single
    ? toJsonSchema(tools[0].schema)
    : {
        anyOf: schemas.map((s) =>
          toJsonSchema(
            object({ candidate: choice(s.id), arguments: s.arguments }),
          ),
        ),
      };
  const contextNodes =
    (
      context as {
        nodes?: { id: string; definition: string; instanceLabel: string }[];
      }
    )?.nodes ?? [];
  const targetSchema =
    tools[0]?.tool === "add_control" && tools[0].schema.type === "object"
      ? tools[0].schema.properties.target
      : undefined;
  const targetId =
    targetSchema?.type === "enum" ? targetSchema.values[0] : undefined;
  const controlTarget = contextNodes.find((node) => node.id === targetId);
  const labelPrefix =
    controlTarget &&
    contextNodes.filter((node) => node.definition === controlTarget.definition)
      .length > 1
      ? controlTarget.instanceLabel
      : undefined;
  const definitions = tools.flatMap((t) => {
    if (t.schema.type !== "object") return [];
    const definition = t.schema.properties.definition;
    return definition?.type === "enum"
      ? definition.values.flatMap((id) => {
          const d = publicDefinitions.get(String(id));
          return d
            ? [{ id: d.id, defaults: d.defaults, description: d.description }]
            : [];
        })
      : [];
  });
  const example = single
    ? (schemaDefault(tools[0].schema) as Record<string, unknown>)
    : null;
  if (
    example &&
    tools[0].tool === "arrange" &&
    tools[0].schema.type === "object"
  ) {
    for (const role of ["main", "controls", "results", "narrowOrder"]) {
      const field = tools[0].schema.properties[role];
      if (field.type === "array" && field.items.type === "enum")
        example[role] = field.items.values;
    }
  }
  if (example && tools[0].tool === "insert_component") {
    if ("configuration" in example) example.configuration = {};
  }
  if (
    example &&
    labelPrefix &&
    controlTarget &&
    tools[0].schema.type === "object"
  ) {
    const command = tools[0].schema.properties.command;
    if (command.type === "enum") {
      const description = publicDefinitions.get(controlTarget.definition)
        ?.commands[String(command.values[0])]?.description;
      example.label = `${labelPrefix} ${description ?? "control"}`;
    }
  }
  const fieldContract =
    single &&
    tools[0].tool === "add_control" &&
    tools[0].schema.type === "object"
      ? tools[0].schema.properties.field
      : undefined;
  const fieldInstruction =
    fieldContract?.type === "enum"
      ? ` For add_control, field MUST be one of ${JSON.stringify(fieldContract.values)}. Field is the command argument path, not the model setting name. Copy that literal exactly.`
      : "";
  const scienceInstruction = contextNodes.some(
    (node) =>
      node.definition.startsWith("prefabs/science/") ||
      node.definition.startsWith("prefabs/biogeochemistry/"),
  )
    ? " For a science lesson, write the lesson instruction as one concise learning question specific to the user's investigation. A science appearance may override it with its editable question field (maximum 180 characters). Choose only condition controls needed for that investigation; retain trusted scientific feedback from model outputs."
    : "";
  const request = await requestStructured<ToolRequest>(
    [
      {
        role: "system",
        content: single
          ? `You provide arguments for the ${tools[0].tool} authoring tool. Return ONLY the argument object matching the schema. The root keys are the parameter names, not argumentSchema or action. Return values, NEVER a schema. Preserve explicit user values; omitted configuration overrides may be {} to keep registered defaults. The application allocates insertion aliases. Copy target IDs and command names exactly. Use concise labels without repeating units that controls already display. When controlLabelPrefix is supplied, the label MUST start with that exact prefix so independent sources remain identifiable. For repeated model instances, include the supplied instance label in each control label. Labels must respect contract units. Keep lesson title under 80 characters and use a concise topic name. Keep lesson instruction under 500 characters and explanation under 1500 characters. Follow the supplied fidelity facts; do not invent outputs, effects or instructions. For arrange, template is the string "scene-with-sidebar"; main, controls, results and narrowOrder are arrays of STRING IDs, such as ["node-id"], NEVER objects like [{"id":"node-id"}]. Copy IDs from exampleResponse. Put appearances in main, controls in controls, and observations in results; never assign the same node to several roles.${fieldInstruction}${scienceInstruction}`
          : "Choose one listed legal authoring candidate. Return ONLY {candidate,arguments}; arguments must match that candidate's schema. Copy IDs and port names exactly. Connect distinct source instances when combining two signals.",
      },
      {
        role: "user",
        content: JSON.stringify({
          request: prompt,
          controlLabelPrefix: labelPrefix,
          context:
            tools[0]?.tool === "insert_component"
              ? { instance: insertionAlias }
              : tools[0]?.tool === "arrange"
                ? undefined
                : context,
          definitions,
          commandContracts: tools.flatMap((tool) => {
            if (tool.tool !== "add_control" || tool.schema.type !== "object")
              return [];
            const target = tool.schema.properties.target;
            const command = tool.schema.properties.command;
            const nodes =
              (context as { nodes?: { id: string; definition: string }[] })
                ?.nodes ?? [];
            const node = nodes.find(
              (n) => target.type === "enum" && n.id === target.values[0],
            );
            const d = node && publicDefinitions.get(node.definition);
            return d && command.type === "enum"
              ? [
                  {
                    command: command.values[0],
                    contract: d.commands[String(command.values[0])],
                  },
                ]
              : [];
          }),
          ...(single
            ? { tool: tools[0].tool, responseSchema, exampleResponse: example }
            : { candidates: schemas, responseSchema }),
        }),
      },
    ],
    (content) => {
      const { value, removed } = parseArgumentJson(content);
      if (removed)
        budget.trace?.("fixer.json_syntax", {
          removed,
          kind: "stray_parenthesis",
        });
      let index = 0,
        args: unknown = value;
      if (!single) {
        const selected = value as { candidate: string; arguments: unknown };
        index = schemas.findIndex((s) => s.id === selected.candidate);
        if (index < 0) throw new Error("Unknown authoring candidate");
        args = selected.arguments;
      }
      if (single && args && typeof args === "object" && !Array.isArray(args)) {
        const wrapped = args as Record<string, unknown>;
        if (
          Object.keys(wrapped).length === 1 &&
          (wrapped.argument || wrapped.arguments)
        ) {
          args = wrapped.argument ?? wrapped.arguments;
          budget.trace?.("fixer.argument_wrapper", {
            kind: "singleton_wrapper",
          });
        }
        if (
          args &&
          typeof args === "object" &&
          "version" in args &&
          (args as Record<string, unknown>).version === "1"
        ) {
          args = { ...args, version: 1 };
          budget.trace?.("fixer.version", {
            kind: "stringified_registered_version",
          });
        }
      }
      const selectedTool = tools[index];
      if (
        selectedTool.schema.type === "object" &&
        !("configuration" in selectedTool.schema.properties) &&
        tools[index].tool === "insert_component"
      ) {
        args = { ...(args as Record<string, unknown>), configuration: {} };
      }
      if (selectedTool.tool === "insert_component")
        args = { ...(args as Record<string, unknown>), alias: insertionAlias };
      if (selectedTool.tool === "arrange")
        args = { ...(args as Record<string, unknown>), preserveLocked: true };
      validateValue(originalTools[index].schema, args);
      if (
        labelPrefix &&
        selectedTool.tool === "add_control" &&
        !String((args as Record<string, unknown>).label).startsWith(labelPrefix)
      )
        throw new Error(`Control label must begin with "${labelPrefix}"`);
      return { tool: tools[index].tool, arguments: args } as ToolRequest;
    },
    `Return ONLY a values object using the root keys in exampleResponse. NEVER return a schema, argumentSchema, or tool wrapper. No changes have been executed.${fieldInstruction}${scienceInstruction}`,
    budget.signal,
    {
      budget,
      verify,
      schema: responseSchema,
      maxTokens: 512,
      stage: `turn_${turn + 1}`,
      onEvent: (event, data) =>
        budget.trace?.(`turn_${turn + 1}.${event}`, data),
    },
  );
  return { action: "tool", request, fixes: [], issues: [] };
}
