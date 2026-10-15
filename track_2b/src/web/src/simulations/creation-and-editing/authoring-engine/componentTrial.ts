import { parameterLeaves } from "../../registry/contracts/controlContract";
import { schemaDefault } from "../../registry/contracts/defaults";
import { publicDefinition } from "../../registry/index";
import { createPublicNode } from "../../registry/recipes/modelRecipe";
import { inspectSource } from "../runtime-engine/imported/contract";
import { htmlComponent } from "../validator/componentEvidence";
import {
  validateAuthoredDocument,
  validateConnection,
} from "../validator/document";
import { insertComposite } from "./composites";
import { connectAuthored } from "./connections";
import {
  type AuthoredDocument,
  type CompositeRecipe,
  type Endpoint,
  emptyLayout,
} from "./document";

export type ComponentSuggestion = {
  id: string;
  label: string;
  from: Endpoint;
  to: Endpoint;
  definition?: string;
  configuration?: Record<string, unknown>;
};

export function componentTrial(
  recipe: CompositeRecipe,
  workspace?: AuthoredDocument,
) {
  const original = htmlComponent(recipe);
  if (!original) throw new Error("Choose a standalone HTML component.");
  let prefix = "html-trial";
  while (
    workspace &&
    [...workspace.nodes, ...workspace.resources].some((n) =>
      n.id.startsWith(prefix),
    )
  )
    prefix += "-next";
  const document = workspace
    ? insertComposite(
        workspace,
        recipe,
        () => {
          throw new Error("Standalone components have no nested dependencies.");
        },
        (id) => `${prefix}/${id}`,
        {},
        {},
        "",
      )
    : structuredClone(recipe.document);
  const node = document.nodes.find(
    (n) => n.id === (workspace ? `${prefix}/${original.id}` : original.id),
  );
  if (!node) throw new Error("Component was not inserted.");
  const manifest = inspectSource(String(node.configuration.source));
  const suggestions: ComponentSuggestion[] = [];
  const add = (
    key: string,
    label: string,
    definition: string,
    configuration: Record<string, unknown>,
    port: string,
    output = false,
  ) => {
    const id = `${prefix}/suggested-${key}`;
    suggestions.push({
      id,
      label,
      definition,
      configuration,
      from: output ? { node: node.id, port } : { node: id, port: "submit" },
      to: output ? { node: id, port: "value" } : { node: node.id, port },
    });
  };
  for (const [name, d] of Object.entries(manifest.inputs)) {
    const type = d.schema.type;
    const widget =
      (type === "number" || type === "integer") &&
      d.schema.minimum < d.schema.maximum
        ? "NumberInput"
        : type === "boolean"
          ? "Toggle"
          : (type === "enum" && !d.schema.values.includes(null)) ||
              (type === "string" && d.schema.enum)
            ? "Select"
            : "Form";
    const label = `${name}${d.unit ? ` · ${d.unit}` : ""}`;
    add(
      `input-${name}`,
      `${label} → ${widget === "Form" ? "value editor" : publicDefinition(`controls/${widget}`).title}`,
      `controls/${widget}`,
      {
        label,
        mode: "immediate",
        initial: JSON.stringify({
          value: Object.hasOwn(node.configuration.inputs as object, name)
            ? (node.configuration.inputs as Record<string, unknown>)[name]
            : Object.hasOwn(d, "default")
              ? d.default
              : schemaDefault(d.schema),
        }),
        ...(widget === "Form"
          ? {
              fields: parameterLeaves({
                type: "object",
                properties: { value: d.schema },
              }).map((leaf) => ({
                parameter: leaf.path,
                label:
                  leaf.path === "value"
                    ? label
                    : `${label} · ${leaf.path.slice(6)}`,
                widget: "Field",
              })),
            }
          : { parameter: "value" }),
      },
      `set:${name}`,
    );
  }
  for (const [name, action] of Object.entries(manifest.actions)) {
    const empty =
      action.arguments.type === "object" &&
      !Object.keys(action.arguments.properties).length;
    add(
      `action-${name}`,
      `${name} → ${empty ? "action button" : "action form"}`,
      empty ? "controls/Button" : "controls/Form",
      {
        label: name,
        mode: "submit",
        initial: JSON.stringify(schemaDefault(action.arguments)),
      },
      name,
    );
  }
  for (const [name, d] of Object.entries(manifest.outputs)) {
    const structured = d.schema.type === "object" || d.schema.type === "array";
    add(
      `output-${name}`,
      `${name}${d.unit ? ` · ${d.unit}` : ""} → ${structured ? "data inspector" : "readout"}`,
      structured ? "displays/Inspector" : "displays/Readout",
      { label: name, precision: 3 },
      name,
      true,
    );
  }
  if (workspace) {
    for (const existing of [...workspace.nodes, ...workspace.resources]) {
      const definition = publicDefinition(existing);
      for (const output of Object.keys(definition.outputs))
        for (const input of Object.keys(manifest.inputs)) {
          const from = { node: existing.id, port: output },
            to = { node: node.id, port: input };
          try {
            validateConnection(document, {
              id: "suggestion",
              from,
              to,
              kind: "value",
            });
            suggestions.push({
              id: `existing-input/${existing.id}/${output}/${input}`,
              label: `${existing.label} · ${output} → ${input}`,
              from,
              to,
            });
          } catch {
            /* Incompatible endpoints are not suggestions. */
          }
        }
      for (const output of Object.keys(manifest.outputs))
        for (const input of Object.keys(definition.inputs)) {
          const from = { node: node.id, port: output },
            to = { node: existing.id, port: input };
          try {
            validateConnection(document, {
              id: "suggestion",
              from,
              to,
              kind: "value",
            });
            if (
              document.connections.some(
                (c) => c.to.node === to.node && c.to.port === to.port,
              ) &&
              definition.inputs[input].cardinality !== "many"
            )
              continue;
            suggestions.push({
              id: `existing-output/${output}/${existing.id}/${input}`,
              label: `${output} → ${existing.label} · ${input}`,
              from,
              to,
            });
          } catch {
            /* Preserve existing incompatible or occupied inputs. */
          }
        }
    }
  }
  return { document, suggestions };
}

export function applyComponentSuggestions(
  document: AuthoredDocument,
  suggestions: ComponentSuggestion[],
  selected: string[],
) {
  let next = structuredClone(document);
  const suppliedInputs = new Set<string>();
  for (const id of selected) {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) throw new Error("This suggestion is no longer available.");
    if (
      suggestion.to.port.startsWith("set:") ||
      suggestion.id.startsWith("existing-input/")
    ) {
      const key = `${suggestion.to.node}/${suggestion.to.port.replace(/^set:/, "")}`;
      if (suppliedInputs.has(key))
        throw new Error(
          `${suggestion.to.port.replace(/^set:/, "")}: choose one input source, a control or an existing output.`,
        );
      suppliedInputs.add(key);
    }
    if (suggestion.definition) {
      const endpoint = suggestion.definition.startsWith("controls/")
        ? suggestion.to.node
        : suggestion.from.node;
      const component = next.nodes.find((n) => n.id === endpoint);
      if (!component) throw new Error("Missing component endpoint.");
      const node = createPublicNode(suggestion.definition, id, component.scope);
      Object.assign(node.configuration, suggestion.configuration);
      next.nodes.push(node);
      next.layout.children.push({ ...emptyLayout(`layout/${id}`), node: id });
    }
    next = connectAuthored(
      next,
      suggestion.from,
      suggestion.to,
      `connection/${id}`,
    );
  }
  validateAuthoredDocument(next, true);
  return next;
}
