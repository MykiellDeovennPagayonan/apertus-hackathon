import { publicDefinition } from "../../../registry/index";
import {
  type CompositeRecipe,
  emptyAuthoredDocument,
  emptyLayout,
} from "../document";
import { defaults, IMPORTED_HTML, inspectSource } from "../../runtime-engine/imported/contract";
export function htmlRecipe(
  source: string,
  inputs: Record<string, unknown>,
  settings: Record<string, unknown>,
): CompositeRecipe {
  const manifest = inspectSource(source);
  const document = emptyAuthoredDocument();
  document.scopes.push({ id: "scope/component", label: manifest.name });
  const node = {
    id: "component",
    definition: IMPORTED_HTML,
    version: 1,
    label: manifest.name,
    scope: "scope/component",
    configuration: {
      source,
      settings: { ...defaults(manifest.settings), ...settings },
      inputs,
    },
  };
  document.nodes.push(node);
  document.layout.children.push({
    ...emptyLayout("layout/component"),
    node: node.id,
  });
  document.lesson = {
    title: manifest.name,
    instruction: manifest.description,
    explanation: "",
  };
  const definition = publicDefinition(node);
  return {
    recipeVersion: 1,
    id: `imported/${manifest.id}`,
    version: manifest.version,
    title: manifest.name,
    description: manifest.description,
    tags: ["imported", "html"],
    discovery: {
      kind: "component",
      group: "displays",
      summary: manifest.description,
      placement: "Independent HTML panel",
    },
    document,
    nested: [],
    parameters: [],
    externalPorts: [
      ...Object.entries(definition.inputs).map(([name, port]) => ({
        name,
        endpoint: { node: node.id, port: name },
        direction: "input" as const,
        port,
        required: false,
      })),
      ...Object.keys(manifest.actions).map((name) => ({
        name: `action-${name}`,
        endpoint: { node: node.id, port: name },
        direction: "input" as const,
        port: { kind: "command" as const, unit: "" },
        required: false,
      })),
      ...Object.entries(definition.outputs).map(([name, port]) => ({
        name: `output-${name}`,
        endpoint: { node: node.id, port: name },
        direction: "output" as const,
        port,
        required: false,
      })),
    ],
    dependencies: [{ id: IMPORTED_HTML, version: 1 }],
    assumptions: [
      "Imported HTML panel; technical checks do not establish scientific correctness.",
    ],
  };
}
