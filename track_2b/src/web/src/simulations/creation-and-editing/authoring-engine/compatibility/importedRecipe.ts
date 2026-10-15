import { publicDefinition } from "../../../registry/index";
import {
  defaults,
  IMPORTED_HTML,
  inspectSource,
  type VerificationReport,
} from "../../runtime-engine/imported/contract";
import {
  type CompositeRecipe,
  emptyAuthoredDocument,
  emptyLayout,
} from "../document";
export function htmlRecipe(
  source: string,
  inputs: Record<string, unknown>,
  settings: Record<string, unknown>,
  report?: VerificationReport,
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
      ...(report ? { verification: JSON.stringify(report) } : {}),
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
    recipeVersion: 2,
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
