import { validateValue } from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import type { CompositeRecipe } from "../authoring-engine/document";
import { assertData, validateAuthoredDocument } from "./document";
export function validateRecipe(r: CompositeRecipe) {
  assertData(r);
  if (
    !r ||
    ![1, 2].includes(r.recipeVersion) ||
    typeof r.id !== "string" ||
    !r.id ||
    !Number.isInteger(r.version) ||
    r.version < 1 ||
    typeof r.title !== "string" ||
    !r.title.trim() ||
    typeof r.description !== "string" ||
    !Array.isArray(r.tags) ||
    r.tags.some((t) => typeof t !== "string") ||
    !Array.isArray(r.nested) ||
    !Array.isArray(r.dependencies) ||
    !Array.isArray(r.parameters) ||
    !Array.isArray(r.externalPorts) ||
    !Array.isArray(r.assumptions)
  )
    throw new Error("recipe: invalid format or metadata");
  if (
    r.discovery &&
    (![
      "component",
      "object",
      "model",
      "preset",
      "composite",
      "experiment",
    ].includes(r.discovery.kind) ||
      ![
        "objects",
        "controls",
        "displays",
        "canvases",
        "models",
        "layout",
        "composites",
        "experiments",
      ].includes(r.discovery.group) ||
      typeof r.discovery.summary !== "string" ||
      !r.discovery.summary.trim() ||
      typeof r.discovery.placement !== "string" ||
      !r.discovery.placement.trim())
  )
    throw new Error("recipe: invalid discovery metadata");
  if (r.recipeVersion === 2) {
    if (r.nested.length)
      throw new Error("Current recipes must be fully expanded");
    const used = new Set(
      [...r.document.nodes, ...r.document.resources].map(
        (node) => `${node.definition}@${node.version}`,
      ),
    );
    const declared = r.dependencies.map(
      (dependency) => `${dependency.id}@${dependency.version}`,
    );
    if (
      declared.length !== new Set(declared).size ||
      declared.some((key) => !used.has(key))
    )
      throw new Error(
        "Current recipe dependencies must have exactly one entry per used definition version",
      );

    if (r.document.lesson.title !== r.title)
      throw new Error("Recipe and lesson titles must agree");
    if (
      r.catalog &&
      (typeof r.catalog.icon !== "string" ||
        !r.catalog.icon.trim() ||
        ![
          "physics",
          "mathematics",
          "science",
          "social-systems",
          "chemistry",
          "economics",
        ].includes(r.catalog.category) ||
        !Number.isInteger(r.catalog.order))
    )
      throw new Error("Invalid recipe catalog metadata");
    for (const parameter of r.parameters) {
      const child = [...r.document.nodes, ...r.document.resources].find(
        (n) => n.id === parameter.node,
      );
      if (
        JSON.stringify(child?.configuration[parameter.field]) !==
        JSON.stringify(parameter.default)
      )
        throw new Error(
          `${parameter.name}: default differs from authored configuration`,
        );
    }
  }
  validateAuthoredDocument(r.document);
  for (const dep of r.dependencies) publicDefinition(dep.id, dep.version);
  for (const n of [...r.document.nodes, ...r.document.resources])
    if (
      !r.dependencies.some(
        (d) => d.id === n.definition && d.version === n.version,
      )
    )
      throw new Error(`${n.id}: undeclared recipe dependency`);
  const params = new Set<string>();
  for (const p of r.parameters) {
    const n = [...r.document.nodes, ...r.document.resources].find(
      (n) => n.id === p.node,
    );
    if (params.has(p.name) || !n || !Object.hasOwn(n.configuration, p.field))
      throw new Error(`${p.name}: invalid exposed parameter`);
    params.add(p.name);
    validateValue(p.schema, p.default, p.name);
    const def = publicDefinition(n);
    if (
      def.configuration.type !== "object" ||
      !def.configuration.properties[p.field] ||
      JSON.stringify(def.configuration.properties[p.field]) !==
        JSON.stringify(p.schema)
    )
      throw new Error(
        `${p.name}: parameter schema must match child configuration`,
      );
  }
  const external = new Set<string>();
  for (const p of r.externalPorts) {
    const n = [...r.document.nodes, ...r.document.resources].find(
      (n) => n.id === p.endpoint?.node,
    );
    if (
      !n ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      external.has(p.name) ||
      !["input", "output"].includes(p.direction) ||
      (p.required !== undefined && typeof p.required !== "boolean")
    )
      throw new Error(`${p.name}: invalid external port`);
    external.add(p.name);
    const def = publicDefinition(n);
    const port =
      p.direction === "input"
        ? (def.inputs[p.endpoint.port] ??
          (def.commands[p.endpoint.port]
            ? { kind: "command", unit: "" }
            : undefined))
        : def.outputs[p.endpoint.port];
    if (!port || JSON.stringify(port) !== JSON.stringify(p.port))
      throw new Error(`${p.name}: external port contract mismatch`);
  }
}
