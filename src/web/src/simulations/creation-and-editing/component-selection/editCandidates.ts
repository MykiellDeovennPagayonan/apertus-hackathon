import { readoutLabel } from "../../registry/contracts/observations";
import {
  choice,
  object,
  type ParameterSchema,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import { editableFields } from "../authoring-engine/configurationPatch";
import { patchSchema } from "../authoring-engine/operations";
import { boardLayouts } from "../authoring-engine/presentation/board";
import { buildTurnTools } from "../authoring-engine/tools";
import { currentConfiguration as capturedConfiguration } from "../input/context";
import type { GenerationRequest } from "../input/contracts";
export function editCandidates(request: GenerationRequest) {
  const active = request.active!;
  const document = active.recipe.document;
  const instances = [...document.nodes, ...document.resources];
  const candidates = [
    ...[
      ...instances.flatMap((node) => {
        const configuration = publicDefinition(node).configuration;
        return configuration.type === "object" &&
          Object.keys(configuration.properties).length
          ? [
              {
                tool: "configure",
                schema: object({
                  target: choice(node.id),
                  changes: patchSchema(configuration),
                }),
              },
            ]
          : [];
      }),
      ...buildTurnTools(document, []).filter(
        (tool) => tool.tool !== "configure" && tool.tool !== "remove",
      ),
    ].map((tool, index) => ({
      id:
        (tool.tool === "configure" || tool.tool === "resize") &&
        tool.schema.type === "object" &&
        tool.schema.properties.target.type === "enum"
          ? `${tool.tool}:${tool.schema.properties.target.values[0]}`
          : `edit${index + 1}`,
      kind: "edit",
      tool: tool.tool,
      schema: tool.schema,
      node: "",
      command: "",
      description: "",
    })),
    ...document.nodes.map((node) => ({
      id: `remove:${node.id}`,
      kind: "edit",
      tool: "remove",
      schema: object({
        targets: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: choice(node.id),
        },
      }),
      node: node.id,
      command: "",
      description: "",
    })),
    ...(request.destination === "builder"
      ? []
      : instances.flatMap((node) =>
          Object.entries(publicDefinition(node).commands).map(
            ([command, contract]) => ({
              id: `runtime:${node.id}:${command}`,
              kind: "runtime",
              tool: "command",
              schema: contract.arguments,
              node: node.id,
              command,
              description: contract.description,
            }),
          ),
        )),
  ].map((candidate, index) => ({
    ...candidate,
    id: `${candidate.kind === "runtime" ? "action" : candidate.tool}${index + 1}`,
  }));
  const properties = (schema?: ParameterSchema) =>
    schema?.type === "object" ? schema.properties : {};
  const candidateFields = (candidate: (typeof candidates)[number]) =>
    candidate.tool === "configure"
      ? editableFields(properties(candidate.schema).changes)
      : candidate.tool === "resize"
        ? Object.fromEntries(
            Object.entries(properties(candidate.schema)).filter(
              ([field]) => field !== "target",
            ),
          )
        : candidate.tool === "set_lesson"
          ? properties(candidate.schema)
          : {};
  const presentationItem = (candidate: (typeof candidates)[number]) => {
    const target = properties(candidate.schema).target;
    return document.presentation?.mode === "board"
      ? document.presentation.items.find(
          (item) => target?.type === "enum" && item.id === target.values[0],
        )
      : undefined;
  };
  const currentConfiguration = (id: string) =>
    capturedConfiguration(request, id);
  const context = {
    request: request.prompt,
    clarification: request.clarification,
    currentLesson: document.lesson,
    destination: request.destination ?? "lesson",
    connections: document.connections,
    presentation:
      document.presentation?.mode === "board"
        ? document.presentation.items.map((item) => ({
            id: item.id,
            node: boardLayouts(document).find(
              (layout) => layout.id === item.layoutId,
            )?.node,
            bounds: item.rect,
            locked: item.locked,
          }))
        : [],
    nodes: instances.map((node) => {
      const definition = publicDefinition(node);
      const meanings = document.connections
        .flatMap((wire) => {
          const peer = instances.find(
            (instance) =>
              instance.id ===
              (wire.kind === "command" ? wire.to.node : wire.from.node),
          );
          if (!peer) return [];
          if (
            definition.category === "controls" &&
            wire.kind === "command" &&
            wire.from.node === node.id
          )
            return [publicDefinition(peer).commands[wire.to.port]?.description];
          if (
            ["appearance", "canvases"].includes(definition.category) &&
            wire.kind === "attachment" &&
            wire.to.node === node.id
          )
            return [publicDefinition(peer).description];
          if (
            definition.category === "displays" &&
            wire.kind === "value" &&
            wire.to.node === node.id
          )
            return [
              publicDefinition(peer).outputs[wire.from.port]?.description,
            ];
          return [];
        })
        .filter(Boolean);
      const binding = document.connections.find(
        (connection) =>
          connection.kind === "value" && connection.to.node === node.id,
      );
      const source = instances.find(
        (instance) => instance.id === binding?.from.node,
      );
      const label =
        typeof node.configuration.label === "string" && node.configuration.label
          ? node.configuration.label
          : node.label;
      return {
        id: node.id,
        label: node.label,
        visibleName:
          node.definition === "displays/Readout"
            ? readoutLabel(
                label,
                source?.definition,
                binding?.from.port,
                source && binding
                  ? publicDefinition(source).outputs[binding.from.port]?.unit
                  : "",
              )
            : label,
        definition: node.definition,
        category: publicDefinition(node).category,
        title: publicDefinition(node).title,
        meaning: [definition.description, ...new Set(meanings)]
          .join(" ")
          .slice(0, 800),
        currentConfiguration: currentConfiguration(node.id),
        runtime: active.runtimeContext[node.id],
        assumptions: publicDefinition(node).assumptions,
      };
    }),
  };
  const componentChoices = context.nodes.map((node) => ({
    node_id: node.id,
    visible_name: node.visibleName,
    definition: node.definition,
  }));
  const candidateChoices = candidates.map((candidate) => {
    const target =
      properties(candidate.schema).target ??
      properties(candidate.schema).source;
    const nodeId =
      candidate.tool === "resize"
        ? boardLayouts(document).find(
            (layout) => layout.id === presentationItem(candidate)?.layoutId,
          )?.node
        : target?.type === "enum"
          ? target.values[0]
          : candidate.node;
    const node = context.nodes.find((node) => node.id === nodeId);
    return {
      id: candidate.id,
      mode: candidate.kind,
      operation: candidate.tool,
      fieldContracts: candidateFields(candidate),
      ...(node
        ? {
            component: {
              visibleName: node.visibleName,
              category: node.category,
              definition: node.definition,
              meaning: node.meaning,
            },
            ...(candidate.tool === "configure"
              ? { currentConfiguration: node.currentConfiguration }
              : {}),
          }
        : {}),
      ...(candidate.tool === "resize"
        ? {
            presentation: context.presentation.find(
              (item) => target?.type === "enum" && item.id === target.values[0],
            ),
          }
        : {}),
      ...(node ? { node: node.id } : {}),
      ...(candidate.kind === "runtime"
        ? {
            command: candidate.command,
            description: candidate.description,
            currentState: active.runtimeContext[candidate.node],
          }
        : {}),
      fixedArguments:
        candidate.tool === "remove"
          ? { targets: [candidate.node] }
          : Object.fromEntries(
              Object.entries(properties(candidate.schema))
                .filter(([, schema]) => schema.type === "enum")
                .map(([key, schema]) => [
                  key,
                  schema.type === "enum" ? schema.values : [],
                ]),
            ),
    };
  });
  const selectionCatalog = {
    components: context.nodes.map((node) => ({
      id: node.id,
      visibleName: node.visibleName,
      category: node.category,
      definition: node.definition,
      meaning: node.meaning,
      currentConfiguration: node.currentConfiguration,
      runtime: node.runtime,
      candidates: candidateChoices
        .filter((candidate) => candidate.node === node.id)
        .map((candidate) => ({
          ...candidate,
          component: undefined,
          currentConfiguration: undefined,
          currentState: undefined,
          node: undefined,
          fieldContracts: Object.keys(candidate.fieldContracts).length
            ? candidate.fieldContracts
            : undefined,
          fixedArguments: ["configure", "remove", "resize", "command"].includes(
            candidate.operation,
          )
            ? undefined
            : candidate.fixedArguments,
        })),
    })),
    candidates: candidateChoices.filter((candidate) => !candidate.node),
  };
  return {
    active,
    document,
    instances,
    candidates,
    properties,
    candidateFields,
    presentationItem,
    currentConfiguration,
    context,
    componentChoices,
    candidateChoices,
    selectionCatalog,
  };
}
export type EditCandidates = ReturnType<typeof editCandidates>;
