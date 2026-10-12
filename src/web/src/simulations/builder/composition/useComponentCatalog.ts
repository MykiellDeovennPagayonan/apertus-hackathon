"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { unwrapPortable } from "../../../lib/projects/portable";
import { publicDefinition } from "../../components/catalog";
import {
  builtInRecipe,
  builtInRecipes,
} from "../../components/composites/catalog";
import { reconcileBoard } from "../../runtime/authoring/board";
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
  ExposedParameter,
  Layout,
} from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";
import { parseRecipe } from "../../runtime/recipes/schema";
import type { ExperimentDocument } from "../document";
import { planInsertion } from "../editor/insertionPlan";
import {
  loadComponentLibrary,
  saveComponentRecipe,
} from "../library/persistence";
import { type Feedback, makeFeedback } from "./feedback";
import { libraryChoices } from "./libraryChoices";

const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Change could not be applied";
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
  const { data: account } = useSession();
  const ownerId = account?.user.id;
  const document = requireValue(doc.authored);
  const [selection, select] = useState<string[]>([]),
    [query, search] = useState(""),
    [category, categorize] = useState("all"),
    [recipes, setRecipes] = useState<CompositeRecipe[]>([]),
    [message, setMessage] = useState<Feedback | null>(null),
    [recovery, retain] = useState(""),
    [name, setName] = useState("My prebuilt"),
    [tags, setTags] = useState(""),
    [parameterTargets, setParameterTargets] = useState<string[]>([]),
    [compatibility, setCompatibility] = useState<"all" | "compatible">("all"),
    [destination, setDestination] = useState("");
  const feedback = message?.body ?? "";
  const report = (
    text: string,
    severity: Feedback["severity"] = "error",
    action = "Update component",
    code = "component.update",
  ) => setMessage(text ? makeFeedback(text, severity, action, code) : null);
  const destinationMissing =
    !!destination &&
    !document.nodes.some(
      (n) =>
        n.id === destination &&
        publicDefinition(n).category === "canvases",
    );
  const chooseDestination = (value: string) => {
    setDestination(value);
    report("");
  };
  useEffect(() => {
    let disposed = false;
    loadComponentLibrary(ownerId)
      .then((entries) => {
        if (!disposed) setRecipes(entries);
      })
      .catch((e: unknown) => {
        if (disposed) return;
        setMessage(
          makeFeedback(
            errorText(e),
            "error",
            "open the saved library",
            "library.read",
          ),
        );
      });
    return () => {
      disposed = true;
    };
  }, [ownerId]);
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
          if (next) {
            d.authored = next;
            Object.assign(d.editor.positions, next.editor.positions);
          }
          const validIds = new Set(
            [
              ...(d.authored?.nodes ?? []),
              ...(d.authored?.resources ?? []),
              ...(d.authored?.groups ?? []),
            ].map((n) => n.id),
          );
          for (const id of Object.keys(d.editor.positions))
            if (!validIds.has(id)) delete d.editor.positions[id];
          if (d.authored) d.authored.editor = structuredClone(d.editor);
          if (d.authored) reconcileBoard(d.authored);
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
  const execute = (
    request: Parameters<typeof planInsertion>[1],
    action: string,
  ) => {
    try {
      const plan = planInsertion(
        document,
        request,
        destination,
        selection,
        resolve,
        crypto.randomUUID(),
      );
      if (!change(action, () => plan.document)) {
        report(
          "The change was rejected. Your experiment is unchanged. Review the settings and try again.",
          "error",
          action,
          "insertion.rejected",
        );
        return false;
      }
      select(plan.selected);
      return true;
    } catch (e) {
      report(errorText(e), "error", action, "insertion.rejected");
      return false;
    }
  };
  const insert = (
    recipe: CompositeRecipe,
    overrides: Record<string, unknown> = {},
  ) => execute({ recipe, overrides }, `Insert ${recipe.title}`);
  const add = (id: string) =>
    execute({ definition: id }, `Add ${publicDefinition(id).title}`);
  const saveRecipe = async () => {
    try {
      const recipe = makeSelectionRecipe();
      setRecipes(await saveComponentRecipe(recipe, ownerId));
      report(
        `Saved ${recipe.title}${recipe.externalPorts.length ? ` with ${recipe.externalPorts.length} external ports` : ""}.`,
        "success",
        "Save assembly",
        "library.saved",
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
        definition = publicDefinition(node),
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
  let checkPrefix = "catalog-check";
  while (
    [...document.nodes, ...document.resources, ...document.groups].some(
      (n) => n.id === checkPrefix || n.id.startsWith(`${checkPrefix}/`),
    )
  )
    checkPrefix += "-next";
  const selectedComponents = [...document.nodes, ...document.resources].filter(
    (n) => selection.includes(n.id),
  );
  // Searching and opening Details must not repeat insertion planning for every card.
  // Invalidate when the document, destination, bindings or local recipe library changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Invalidate the planning cache when insertion context changes.
  const checks = useMemo(
    () => ({
      components: new Map<string, { compatible: boolean; reason: string }>(),
      recipes: new Map<string, { compatible: boolean; reason: string }>(),
    }),
    [document, selection, destination, recipes],
  );
  const componentChecks = checks.components;
  const recipeChecks = checks.recipes;
  const componentCompatibility = (
    definition: ReturnType<typeof publicDefinition>,
  ) => {
    const existing = componentChecks.get(definition.id);
    if (existing) return existing;
    let result: { compatible: boolean; reason: string };
    try {
      const plan = planInsertion(
        document,
        { definition: definition.id },
        destination,
        selection,
        resolve,
        checkPrefix,
      );
      result = { compatible: true, reason: plan.summary };
    } catch (e) {
      result = { compatible: false, reason: errorText(e) };
    }
    componentChecks.set(definition.id, result);
    return result;
  };
  const recipeCompatibility = (recipe: CompositeRecipe) => {
    const key = `${recipe.id}@${recipe.version}`;
    const existing = recipeChecks.get(key);
    if (existing) return existing;
    let result: { compatible: boolean; reason: string };
    try {
      const plan = planInsertion(
        document,
        { recipe },
        destination,
        selection,
        resolve,
        checkPrefix,
      );
      result = { compatible: true, reason: plan.summary };
    } catch (e) {
      result = { compatible: false, reason: errorText(e) };
    }
    recipeChecks.set(key, result);
    return result;
  };
  const importRecipe = async (text: string, saveCopy = false) => {
    retain(text);
    try {
      const portable = unwrapPortable(JSON.parse(text));
      const recipe = parseRecipe(portable.payload);
      validateRecipe(recipe);
      if (saveCopy) {
        recipe.id = `user/${crypto.randomUUID()}`;
        recipe.title = `${recipe.title} (copy)`;
      } else if (allRecipes.some((r) => r.id === recipe.id))
        throw new Error(
          "This identity already exists. Save a separate copy to keep both assemblies.",
        );
      setRecipes(
        await saveComponentRecipe(recipe, ownerId, portable.publicationId),
      );
      retain("");
      report(
        `Saved ${recipe.title} to your library.`,
        "success",
        "Import assembly",
        "import.saved",
      );
      return { recipe, error: null };
    } catch (e) {
      const failure = makeFeedback(
        errorText(e),
        "error",
        "Save imported assembly",
        "import.persistence",
      );
      setMessage(failure);
      return { recipe: null, error: failure };
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
    message,
    destinationMissing,
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
    setDestination: chooseDestination,
  };
}
export type ComponentCatalog = ReturnType<typeof useComponentCatalog>;
export { download };
