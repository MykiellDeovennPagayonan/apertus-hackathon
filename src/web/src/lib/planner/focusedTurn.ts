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
  allowDone = false,
): Promise<FixerResult> {
  if (!tools.length)
    return { action: "done", request: null, fixes: [], issues: [] };
  if (tools.length > 1) {
    // Separate choosing an operation from writing its arguments. Small local models
    // otherwise copy the combined schema or produce an invalid tool envelope.
    const candidates = tools.map((tool, index) => ({
      candidate: `candidate${index + 1}`,
      tool: tool.tool,
      target:
        tool.schema.type === "object" &&
        tool.schema.properties.target?.type === "enum"
          ? tool.schema.properties.target.values[0]
          : undefined,
      fields:
        tool.schema.type === "object"
          ? Object.keys(tool.schema.properties)
          : [],
      choices:
        tool.schema.type === "object"
          ? Object.fromEntries(
              Object.entries(tool.schema.properties)
                .filter(([, schema]) => schema.type === "enum")
                .map(([key, schema]) => [
                  key,
                  schema.type === "enum" ? schema.values : [],
                ]),
            )
          : {},
    }));
    const selectionSchema = object({
      candidate: choice(
        ...candidates.map((c) => c.candidate),
        ...(allowDone ? ["done"] : []),
      ),
    });
    const selected = await requestStructured<string>(
      [
        {
          role: "system",
          content:
            'Choose the next operation to satisfy the user request. Return ONLY {"candidate":"candidate1"} with one supplied candidate ID. Prefer updating existing component settings for a parameter change. A request to add a way to change a parameter requires add_control for that parameter, not configure. Candidate choices identify the exact command or output. Preserve unrelated components. If done is offered and the requested change is satisfied compared with originalNodes and connections, return {"candidate":"done"}. Prioritize completion over repeating an already applied edit. A relative increase or decrease requires one meaningful change from the original settings, not repeated amplification.',
        },
        {
          role: "user",
          content: JSON.stringify({
            request: prompt,
            candidates: allowDone
              ? [
                  ...candidates,
                  {
                    candidate: "done",
                    tool: "complete",
                    description:
                      "Finish: the requested change has been applied. Do not repeat a relative increase or decrease.",
                  },
                ]
              : candidates,
            context,
            completion: allowDone ? "done is available" : undefined,
          }),
        },
      ],
      (content) => {
        const { value } = parseArgumentJson(content);
        validateValue(selectionSchema, value);
        return (value as { candidate: string }).candidate;
      },
      'Return only {"candidate":"candidate1"} using a listed ID. Do not return tool arguments or a schema.',
      budget.signal,
      {
        budget,
        schema: toJsonSchema(selectionSchema),
        maxTokens: 64,
        stage: `turn_${turn + 1}_candidate`,
        onEvent: (event, data) =>
          budget.trace?.(`turn_${turn + 1}_candidate.${event}`, data),
      },
    );
    if (selected === "done")
      return { action: "done", request: null, fixes: [], issues: [] };
    const index = candidates.findIndex(
      (candidate) => candidate.candidate === selected,
    );
    return focusedTurn(prompt, [tools[index]], context, budget, turn, verify);
  }
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
  if (tools[0].tool === "configure" && tools[0].schema.type === "object") {
    const changes = tools[0].schema.properties.changes;
    if (changes.type === "object") {
      const availableFields = Object.keys(changes.properties);
      // Shared intent has already interpreted the human request. When it names
      // catalog settings, constrain the patch to those names before value generation.
      const interactions =
        (context as { acceptedIntent?: { interactions?: string[] } })
          ?.acceptedIntent?.interactions ?? [];
      const words = new Set(
        interactions.flatMap((interaction) =>
          interaction.toLowerCase().split(/[^a-z0-9_]+/),
        ),
      );
      const interpreted = availableFields.filter((field) =>
        words.has(field.toLowerCase()),
      );
      const fields = interpreted.length ? interpreted : availableFields;
      const fieldSchema = object({
        fields: {
          type: "array",
          items: choice(...fields),
          minItems: 1,
          maxItems: fields.length,
        },
      });
      const selected = await requestStructured<string[]>(
        [
          {
            role: "system",
            content:
              'Select only the existing setting names required by the request. Return ONLY {"fields":["setting-name"]}. Follow the fidelity facts. Include every requested setting and exclude unrelated settings. Choose names, not values or schemas.',
          },
          {
            role: "user",
            content: JSON.stringify({ request: prompt, fields, context }),
          },
        ],
        (content) => {
          const { value } = parseArgumentJson(content);
          validateValue(fieldSchema, value);
          return [...new Set((value as { fields: string[] }).fields)];
        },
        "Return only the fields array with existing setting names. Preserve unrelated settings.",
        budget.signal,
        {
          budget,
          schema: toJsonSchema(fieldSchema),
          maxTokens: 96,
          stage: `turn_${turn + 1}_fields`,
          onEvent: (event, data) =>
            budget.trace?.(`turn_${turn + 1}_fields.${event}`, data),
        },
      );
      tools = [
        {
          ...tools[0],
          schema: {
            ...tools[0].schema,
            properties: {
              ...tools[0].schema.properties,
              changes: object(
                Object.fromEntries(
                  selected.map((field) => [field, changes.properties[field]]),
                ),
              ),
            },
          },
        },
      ];
    }
  }
  const argumentSchema = toJsonSchema(tools[0].schema);
  const doneSchema = object({ action: choice("done") });
  const responseSchema = allowDone
    ? { anyOf: [argumentSchema, toJsonSchema(doneSchema)] }
    : argumentSchema;
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
  const example = schemaDefault(tools[0].schema) as Record<string, unknown>;
  if (
    example &&
    tools[0].tool === "arrange" &&
    tools[0].schema.type === "object"
  ) {
    for (const role of ["main", "controls", "results", "narrowOrder"]) {
      const field = tools[0].schema.properties[role];
      if (field.type === "array" && field.items.type === "enum")
        example[role] = field.maxItems === 0 ? [] : field.items.values;
    }
  }
  if (example && tools[0].tool === "configure") {
    const node = (
      context as { nodes?: { id: string; config: Record<string, unknown> }[] }
    )?.nodes?.find((n) => n.id === example.target);
    if (node) example.changes = {};
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
    tools[0].tool === "add_control" && tools[0].schema.type === "object"
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
  const request = await requestStructured<ToolRequest | null>(
    [
      {
        role: "system",
        content:
          (allowDone
            ? 'If the requested change is already satisfied, return ONLY {"action":"done"}. Otherwise follow these operation instructions. '
            : "") +
          (tools[0].tool === "configure"
            ? 'Edit the existing component to demonstrate the condition in the user request. Return ONLY {"target":"supplied-id","changes":{"setting":newValue}}. Use exact target IDs and actual setting names from the schema. A question such as "what happens if" requests an experiment with that condition applied. Choose a sensible changed value within the contract unless the user supplies a value. The context contains CURRENT settings, not the answer. changes is a patch: include only requested changes, preserving unrelated settings. Never copy the current configuration unchanged; never return schemas, types or parameter definitions. Follow the supplied fidelity facts.'
            : `You provide arguments for the ${tools[0].tool} authoring tool. Return ONLY the argument object matching the schema. The root keys are the parameter names, not argumentSchema or action. Return values, NEVER a schema. For configure, changes is a patch of concrete values for only the requested settings; retain every unrelated setting. Preserve explicit user values; omitted configuration overrides may be {} to keep registered defaults. The application allocates insertion aliases. Copy target IDs and command names exactly. Use concise labels without repeating units that controls already display. When controlLabelPrefix is supplied, the label MUST start with that exact prefix so independent sources remain identifiable. For repeated model instances, include the supplied instance label in each control label. Labels must respect contract units. Keep lesson title under 80 characters and use a concise topic name. Keep lesson instruction under 500 characters and explanation under 1500 characters. Follow the supplied fidelity facts; do not invent outputs, effects or instructions. For arrange, template is the string "scene-with-sidebar"; main, controls, results and narrowOrder are arrays of STRING IDs, such as ["node-id"], NEVER objects like [{"id":"node-id"}]. Copy IDs from exampleResponse. Put appearances in main, controls in controls, and observations in results; never assign the same node to several roles.${fieldInstruction}${scienceInstruction}`),
      },
      {
        role: "user",
        content: JSON.stringify({
          request: prompt,
          completion: allowDone
            ? 'If the requested change is already satisfied, return {"action":"done"}. Otherwise choose the next operation. Preserve unrelated configuration and do not add unrequested components.'
            : undefined,
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
          tool: tools[0].tool,
          responseSchema,
          exampleResponse: example,
        }),
      },
    ],
    (content) => {
      const { value, removed } = parseArgumentJson(content);
      if (
        allowDone &&
        value &&
        typeof value === "object" &&
        "action" in value &&
        value.action === "done"
      ) {
        validateValue(doneSchema, value);
        return null;
      }
      if (removed)
        budget.trace?.("fixer.json_syntax", {
          removed,
          kind: "stray_parenthesis",
        });
      let args: unknown = value;
      if (args && typeof args === "object" && !Array.isArray(args)) {
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
      const selectedTool = tools[0];
      if (
        selectedTool.schema.type === "object" &&
        !("configuration" in selectedTool.schema.properties) &&
        tools[0].tool === "insert_component"
      ) {
        args = { ...(args as Record<string, unknown>), configuration: {} };
      }
      if (selectedTool.tool === "insert_component")
        args = { ...(args as Record<string, unknown>), alias: insertionAlias };
      if (selectedTool.tool === "arrange")
        args = { ...(args as Record<string, unknown>), preserveLocked: true };
      validateValue(originalTools[0].schema, args);
      if (
        labelPrefix &&
        selectedTool.tool === "add_control" &&
        !String((args as Record<string, unknown>).label).startsWith(labelPrefix)
      )
        throw new Error(`Control label must begin with "${labelPrefix}"`);
      return { tool: tools[0].tool, arguments: args } as ToolRequest;
    },
    `Return ONLY a values object using the root keys in exampleResponse. NEVER return a schema, argumentSchema, or tool wrapper. No changes have been executed.${fieldInstruction}${scienceInstruction}`,
    budget.signal,
    {
      budget,
      verify: (operation) => {
        if (operation) verify?.(operation);
      },
      schema: responseSchema,
      maxTokens: 512,
      stage: `turn_${turn + 1}`,
      onEvent: (event, data) =>
        budget.trace?.(`turn_${turn + 1}.${event}`, data),
    },
  );
  return { action: request ? "tool" : "done", request, fixes: [], issues: [] };
}
