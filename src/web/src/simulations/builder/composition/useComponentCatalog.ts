"use client";

import { useEffect, useRef, useState } from "react";
import { publicDefinition } from "../../components/catalog";
import {
  builtInRecipe,
  builtInRecipes,
} from "../../components/composites/catalog";
import {
  selectionRecipe,
  validateRecipe,
} from "../../runtime/authoring/recipes";
import type { regenerateTruss } from "../../runtime/authoring/regenerateTruss";
import { requireValue } from "../../runtime/authoring/requireValue";
import { DocumentRuntime } from "../../runtime/authoring/runtime";
import type {
  AuthoredDocument,
  CompositeRecipe,
  Endpoint,
  ExposedParameter,
  Layout,
  Port,
} from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";
import type { ExperimentDocument } from "../document";
import {
  addCatalogComponent,
  insertComposite,
} from "../editor/compositeCommands";
import { RecipeRepository } from "../library/RecipeRepository";
import { libraryChoices } from "./libraryChoices";

const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Change could not be applied";
const compatible = (source: Port, target: Port) =>
  (target.kind === "command"
    ? source.kind === "event"
    : target.kind === "attachment"
      ? source.kind === "attachment"
      : ["value", "dataset", "grid"].includes(source.kind) &&
        ["value", "dataset", "grid"].includes(target.kind)) &&
  (target.unit === "*" || source.unit === target.unit);
function resolveExternalBindings(
  recipe: CompositeRecipe,
  authored: AuthoredDocument,
  selection: string[],
) {
  const selected = [...authored.nodes, ...authored.resources].filter((n) =>
      selection.includes(n.id),
    ),
    result: Record<string, Endpoint> = {};
  for (const external of recipe.externalPorts) {
    const candidates: Endpoint[] = [];
    for (const node of selected) {
      const definition = publicDefinition(node.definition);
      if (external.direction === "input") {
        for (const [port, contract] of Object.entries(definition.outputs))
          if (compatible(contract, external.port))
            candidates.push({ node: node.id, port });
      } else {
        for (const [port, contract] of Object.entries(definition.inputs))
          if (compatible(external.port, contract))
            candidates.push({ node: node.id, port });
        if (external.port.kind === "event")
          for (const port of Object.keys(definition.commands))
            candidates.push({ node: node.id, port });
      }
    }
    if (candidates.length !== 1)
      throw new Error(
        `${recipe.title} needs one selected compatible endpoint for ${external.name}; found ${candidates.length}.`,
      );
    result[external.name] = candidates[0];
  }
  return result;
}
const download = (value: unknown, filename: string) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export function useComponentCatalog(
  doc: ExperimentDocument,
  edit: (
    change: (d: ExperimentDocument) => void,
    group?: string | null,
    action?: string,
  ) => boolean,
) {
  const document = requireValue(doc.authored);
  const [selection, select] = useState<string[]>([]),
    [query, search] = useState(""),
    [category, categorize] = useState("all"),
    [recipes, setRecipes] = useState<CompositeRecipe[]>([]),
    [feedback, report] = useState(""),
    [recovery, retain] = useState(""),
    [name, setName] = useState("My prebuilt"),
    [tags, setTags] = useState(""),
    [parameterTargets, setParameterTargets] = useState<string[]>([]),
    [compatibility, setCompatibility] = useState<"all" | "compatible">("all"),
    [recipePreview, setRecipePreview] = useState<CompositeRecipe | null>(null),
    [destination, setDestination] = useState("");
  useEffect(() => {
    try {
      setRecipes(new RecipeRepository(localStorage).read());
    } catch (e) {
      report(errorText(e));
    }
  }, []);
  const [regeneration, setRegeneration] = useState<ReturnType<
    typeof regenerateTruss
  > | null>(null);
  const regenerationDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (regeneration) regenerationDialog.current?.showModal();
  }, [regeneration]);
  const allRecipes = [
    ...new Map(
      [...recipes, ...builtInRecipes].map((r) => [`${r.id}@${r.version}`, r]),
    ).values(),
  ];
  const resolve = (id: string, version: number) =>
    allRecipes.find((r) => r.id === id && r.version === version) ??
    builtInRecipe(id, version);
  const change = (
    action: string,
    mutate:
      | ((d: AuthoredDocument) => void)
      | ((d: AuthoredDocument) => AuthoredDocument),
  ) =>
    edit(
      (d) => {
        try {
          const next = mutate(requireValue(d.authored));
          if (next) d.authored = next;
          if (d.authored) d.authored.editor = structuredClone(d.editor);
          validateAuthoredDocument(d.authored);
          new DocumentRuntime(requireValue(d.authored));
          d.lesson = structuredClone(d.authored?.lesson);
          report("");
        } catch (e) {
          report(errorText(e));
          throw e;
        }
      },
      null,
      action,
    );
  const insert = (
    recipe: CompositeRecipe,
    overrides: Record<string, unknown> = {},
  ) => {
    try {
      const prefix = crypto.randomUUID(),
        externalBindings = resolveExternalBindings(recipe, document, selection),
        next = insertComposite(
          document,
          recipe,
          resolve,
          (id) => `${prefix}/${id}`,
          overrides,
          externalBindings,
          destination,
        );
      if (!change(`Insert ${recipe.title}`, () => next)) return false;
      select(
        next.nodes
          .filter((n) => !document.nodes.some((old) => old.id === n.id))
          .map((n) => n.id),
      );
      return true;
    } catch (e) {
      report(errorText(e));
      return false;
    }
  };
  const add = (id: string) => {
    const identity = crypto.randomUUID();
    let selected = identity;
    const accepted = change(`Add ${publicDefinition(id).title}`, (d) => {
      selected = addCatalogComponent(d, id, identity, destination, selection);
    });
    if (accepted) select([selected]);
    return accepted;
  };
  const saveRecipe = async () => {
    try {
      const recipe = makeSelectionRecipe();
      if (!navigator.locks)
        throw new Error(
          "This browser cannot coordinate local saves; export your recipe instead.",
        );
      await navigator.locks.request("apertus-composites-v1", () =>
        setRecipes(new RecipeRepository(localStorage).save(recipe)),
      );
      report(
        `Saved ${recipe.title}${recipe.externalPorts.length ? ` with ${recipe.externalPorts.length} external ports` : ""}.`,
      );
    } catch (e) {
      report(errorText(e));
    }
  };
  const makeSelectionRecipe = () => {
    const recipe = selectionRecipe(document, selection, {
      id: `user/${crypto.randomUUID()}`,
      title: name,
      description: document.lesson.instruction,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    const used = new Set<string>();
    recipe.parameters = parameterTargets.map((target): ExposedParameter => {
      const [nodeId, field] = target.split("\u0000"),
        node = requireValue(
          [...recipe.document.nodes, ...recipe.document.resources].find(
            (n) => n.id === nodeId,
          ),
        ),
        definition = publicDefinition(node.definition),
        schema =
          definition.configuration.type === "object"
            ? requireValue(definition.configuration.properties[field])
            : (() => {
                throw new Error(
                  `${node.label}: configuration cannot expose fields`,
                );
              })();
      let parameterName = field;
      if (used.has(parameterName)) parameterName = `${node.label} ${field}`;
      let suffix = 2;
      const base = parameterName;
      while (used.has(parameterName)) parameterName = `${base} ${suffix++}`;
      used.add(parameterName);
      return {
        name: parameterName,
        node: nodeId,
        field,
        schema,
        default: structuredClone(node.configuration[field]),
      };
    });
    validateRecipe(recipe);
    return recipe;
  };
  const selectedComponents = [...document.nodes, ...document.resources].filter(
    (n) => selection.includes(n.id),
  );
  const componentCompatibility = (
    definition: ReturnType<typeof publicDefinition>,
  ) => {
    if (!selectedComponents.length)
      return {
        compatible: true,
        reason: "Available in a new or existing workspace scope.",
      };
    if (definition.application)
      return {
        compatible: selectedComponents.some(
          (n) => n.definition === definition.application?.target,
        ),
        reason: `Select ${publicDefinition(definition.application.target).title}.`,
      };
    const matches = selectedComponents.some((node) => {
      const selectedDefinition = publicDefinition(node.definition);
      return (
        Object.values(selectedDefinition.outputs).some((out) =>
          Object.values(definition.inputs).some((input) =>
            compatible(out, input),
          ),
        ) ||
        Object.values(definition.outputs).some((out) =>
          Object.values(selectedDefinition.inputs).some((input) =>
            compatible(out, input),
          ),
        )
      );
    });
    const sharedPlacement = selectedComponents.some((node) =>
      publicDefinition(node.definition).placement.some((p) =>
        definition.placement.includes(p),
      ),
    );
    return {
      compatible:
        matches || sharedPlacement || definition.category === "layout",
      reason:
        matches || sharedPlacement
          ? "Compatible with the current selection."
          : `Needs ${definition.placement.join(" or ")} placement.`,
    };
  };
  const recipeCompatibility = (recipe: CompositeRecipe) => {
    if (!recipe.externalPorts.length)
      return { compatible: true, reason: "Self-contained prebuilt." };
    try {
      resolveExternalBindings(recipe, document, selection);
      return {
        compatible: true,
        reason: "Required external ports match the current selection.",
      };
    } catch (e) {
      return { compatible: false, reason: errorText(e) };
    }
  };
  const importRecipe = async (text: string) => {
    retain(text);
    try {
      const recipe: CompositeRecipe = JSON.parse(text);
      validateRecipe(recipe);

      if (!navigator.locks)
        throw new Error(
          "Local saving needs browser locks; export the retained recipe.",
        );
      await navigator.locks.request("apertus-composites-v1", () =>
        setRecipes(new RecipeRepository(localStorage).save(recipe)),
      );
      retain("");
      report("Prebuilt imported. Choose it in the library to insert.");
    } catch (e) {
      report(errorText(e));
    }
  };
  const components = [...document.nodes, ...document.resources];
  const _hidden = new Set(
    document.groups.filter((g) => g.collapsed).flatMap((g) => g.members),
  );
  const layoutTargets: Layout[] = [];
  const collect = (l: Layout) => {
    layoutTargets.push(l);
    l.children.forEach(collect);
  };
  collect(document.layout);
  const choices = libraryChoices(category, query).filter(
    (d) => compatibility === "all" || componentCompatibility(d).compatible,
  );
  return {
    document,
    selection,
    select,
    query,
    search,
    category,
    categorize,
    recipes,
    feedback,
    report,
    recovery,
    retain,
    name,
    setName,
    tags,
    setTags,
    parameterTargets,
    setParameterTargets,
    compatibility,
    setCompatibility,
    recipePreview,
    setRecipePreview,
    regeneration,
    setRegeneration,
    regenerationDialog,
    allRecipes,
    resolve,
    change,
    insert,
    add,
    saveRecipe,
    makeSelectionRecipe,
    selectedComponents,
    componentCompatibility,
    recipeCompatibility,
    importRecipe,
    components,
    layoutTargets,
    choices,
    destination,
    setDestination,
  };
}
export type ComponentCatalog = ReturnType<typeof useComponentCatalog>;
export { download };
