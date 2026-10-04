import { validateCommand } from "../runtime/capabilities";
import {
  boolean,
  choice,
  num,
  object,
  validateValue,
} from "../runtime/parameterSchema";
import { parseRecipe, type Recipe, resolveRecipe } from "../runtime/resolver";
import { composeLegacy } from "./composition/migration";
import { type CompositionScene, validateScene } from "./composition/model";
import { pendingConnections } from "./composition/workspace";
import {
  type Slot,
  type TemplateId,
  templateRecipe,
  templates,
} from "./descriptors";
import { requireRecord } from "./records";

export interface ControlRecord {
  id: string;
  capability: string;
  label: string;
  target: string;
  widget: "slider" | "number" | "button" | "toggle" | "select";
  slot: Slot;
  min?: number;
  max?: number;
  step?: number;
  fixed?: unknown;
}
export interface ResultRecord {
  id: string;
  output: string;
  label: string;
  target: string;
  unit: string;
  precision: number;
  slot: Slot;
}
export interface ExperimentDocument {
  documentVersion: 1 | 2;
  scene?: CompositionScene;
  template: TemplateId;
  recipe: Recipe | null;
  lesson: { title: string; instruction: string; explanation: string };
  presentation: {
    layout: "right" | "bottom" | "floating";
    view: TemplateId;
    particles: boolean;
    directShading: boolean;
    camera: "overview" | "close";
    controls: ControlRecord[];
    results: ResultRecord[];
  };
  editor: {
    positions: Record<string, { x: number; y: number }>;
    zoom: number;
    groups?: { id: string; label: string; members: string[] }[];
  };
}
const text = (maxLength: number) => ({ type: "string" as const, maxLength });
const controlSchema = object(
  {
    id: text(80),
    capability: text(80),
    label: text(100),
    target: text(100),
    widget: choice("slider", "number", "button", "toggle", "select"),
    slot: choice("primary", "details"),
    min: num(-10000, 10000),
    max: num(-10000, 10000),
    step: num(0.000001, 10000),
    fixed: object({ bar: choice(0, 1), factor: num(2, 12, "", true) }),
  },
  ["min", "max", "step", "fixed"],
);
const resultSchema = object({
  id: text(80),
  output: text(80),
  label: text(100),
  target: text(100),
  precision: num(0, 6, "", true),
  slot: choice("primary", "details"),
});
function record(
  value: unknown,
  keys: string[],
  path: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${path}: expected object`);
  for (const k of Object.keys(value))
    if (!keys.includes(k)) throw new Error(`${path}: unknown field ${k}`);
  for (const k of keys)
    if (!Object.hasOwn(value, k)) throw new Error(`${path}: missing ${k}`);
}
function boundedText(
  value: unknown,
  max: number,
  path: string,
  required = false,
) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error(
      `${path}: ${required ? "enter text, " : ""}maximum ${max} characters`,
    );
}
export function controlFor(
  doc: ExperimentDocument,
  capability: string,
  id: string,
): ControlRecord {
  const cap = templates[doc.template].controls[capability];
  if (!cap) throw new Error("This action is unavailable for this object");
  return {
    id,
    capability,
    label: cap.label,
    target: cap.action === "RESET" ? "session" : targetFor(doc),
    widget: cap.widget,
    slot: cap.slot,
    ...(cap.min !== undefined
      ? { min: cap.min, max: cap.max, step: cap.step }
      : {}),
    ...(cap.fixed !== undefined ? { fixed: structuredClone(cap.fixed) } : {}),
  };
}
export { requireRecord } from "./records";
export function targetFor(doc: ExperimentDocument) {
  return doc.template === "line"
    ? requireRecord(requireRecipe(doc).assembly?.instances[0]).id
    : templates[doc.template].target;
}
export function resultFor(
  doc: ExperimentDocument,
  output: string,
  id: string,
): ResultRecord {
  const cap = templates[doc.template].outputs[output];
  if (!cap) throw new Error("This output is unavailable for this object");
  return {
    id,
    output,
    label: cap.label,
    target: targetFor(doc),
    unit: cap.unit,
    precision: doc.template === "town" ? 0 : 2,
    slot: "primary",
  };
}
export function fromRecipe(recipe: Recipe): ExperimentDocument {
  const resolved = resolveRecipe(recipe);
  const template: TemplateId =
    resolved.demo === "gas"
      ? "gas"
      : resolved.demo === "fraction-builder"
        ? "fractions"
        : resolved.demo === "town"
          ? "town"
          : "line";
  if (
    template === "line" &&
    (resolved.demo !== "assembly" ||
      !recipe.assembly?.instances.length ||
      recipe.assembly.instances.some(
        (instance) => instance.prefab.ref !== "prefabs/math-foundations/Line",
      ))
  )
    throw new Error(
      "Remix supports gas, fraction boards, town, and Cartesian lines. This recipe needs another authoring adapter.",
    );
  const t = templates[template];
  const doc: ExperimentDocument = {
    documentVersion: 1,
    template,
    recipe: structuredClone(recipe),
    lesson: {
      title: recipe.assembly?.title ?? t.name,
      instruction: t.instruction,
      explanation: recipe.assembly?.learningGoal ?? "",
    },
    presentation: {
      layout: template === "town" ? "floating" : "right",
      view: template,
      particles: true,
      directShading: true,
      camera: "overview",
      controls: [],
      results: [],
    },
    editor: { positions: {}, zoom: 0.7 },
  };
  doc.presentation.controls = Object.keys(t.controls).map((key) =>
    controlFor(doc, key, `control-${key}`),
  );
  doc.presentation.results = Object.keys(t.outputs).map((key) =>
    resultFor(doc, key, `result-${key}`),
  );
  if (template === "line" && (recipe.assembly?.instances.length ?? 0) > 1) {
    const composed = composeLegacy(doc);
    validateDocument(composed);
    return composed;
  }
  validateDocument(doc);
  return doc;
}
export function createDocument(template: TemplateId) {
  return fromRecipe(templateRecipe(template));
}
/** Validate the envelope before invoking the strict legacy recipe loader. Never activate here. */
export function validateDocument(
  input: unknown,
): asserts input is ExperimentDocument {
  const envelope =
    input && typeof input === "object" && "scene" in input
      ? Object.fromEntries(
          Object.entries(input).filter(([key]) => key !== "scene"),
        )
      : input;
  record(
    envelope,
    [
      "documentVersion",
      "template",
      "recipe",
      "lesson",
      "presentation",
      "editor",
    ],
    "document",
  );
  if (envelope.documentVersion !== 1 && envelope.documentVersion !== 2)
    throw new Error("Unsupported experiment document version");
  if (
    typeof envelope.template !== "string" ||
    !Object.hasOwn(templates, envelope.template)
  )
    throw new Error("Unsupported authoring template");
  const doc = input as unknown as ExperimentDocument;
  if (
    doc.documentVersion === 2 &&
    (!doc.scene ||
      doc.scene.version !== 2 ||
      (doc.scene.workspace && doc.scene.workspace.version !== 2))
  )
    throw new Error("Version 2 documents require a version 2 composition");
  if (
    doc.documentVersion === 1 &&
    doc.scene &&
    (doc.scene.kind === "physical" || doc.scene.kind === "diagram")
  )
    throw new Error("This composition requires document version 2");
  record(doc.lesson, ["title", "instruction", "explanation"], "lesson");
  boundedText(doc.lesson.title, 150, "Title");
  boundedText(doc.lesson.instruction, 150, "Instruction");
  boundedText(doc.lesson.explanation, 10000, "Explanation");
  record(
    doc.presentation,
    [
      "layout",
      "view",
      "particles",
      "directShading",
      "camera",
      "controls",
      "results",
    ],
    "presentation",
  );
  if (doc.presentation.view !== doc.template)
    throw new Error("The selected view cannot render this model");
  const layouts = doc.template === "town" ? ["floating"] : ["right", "bottom"];
  if (!layouts.includes(doc.presentation.layout))
    throw new Error("Layout is incompatible with this view");
  validateValue(
    choice("overview", "close"),
    doc.presentation.camera,
    "Camera preset",
  );
  if (doc.template !== "town" && doc.presentation.camera !== "overview")
    throw new Error("Camera settings are only available for the town view");
  validateValue(boolean, doc.presentation.particles, "particles");
  validateValue(boolean, doc.presentation.directShading, "directShading");
  if (Object.hasOwn(doc, "scene")) {
    if (!doc.scene) throw new Error("Composition scene is missing or invalid");
    validateScene(doc.scene, doc.template);
    record(
      doc.editor,
      [
        "positions",
        "zoom",
        ...(Object.hasOwn(doc.editor, "groups") ? ["groups"] : []),
      ],
      "editor",
    );
    if (
      !doc.editor.positions ||
      typeof doc.editor.positions !== "object" ||
      Array.isArray(doc.editor.positions)
    )
      throw new Error("Invalid block positions");
    if (
      doc.recipe !== null ||
      !Array.isArray(doc.presentation.controls) ||
      !Array.isArray(doc.presentation.results) ||
      doc.presentation.controls.length ||
      doc.presentation.results.length
    )
      throw new Error(
        "Composition documents use their own instance bindings and cannot contain a legacy recipe",
      );
    record(
      doc.editor,
      [
        "positions",
        "zoom",
        ...(Object.hasOwn(doc.editor, "groups") ? ["groups"] : []),
      ],
      "editor",
    );
    validateValue(num(0.2, 2), doc.editor.zoom, "Workspace zoom");
    const sceneIds = new Set([
      ...doc.scene.objects.map((o) => o.id),
      ...doc.scene.controls.map((c) => c.id),
      ...doc.scene.measurements.map((m) => m.id),
      ...(doc.scene.workspace?.canvases.map((c) => c.id) ?? []),
      ...(doc.scene.workspace?.trips.map((t) => t.id) ?? []),
    ]);
    for (const [id, point] of Object.entries(doc.editor.positions)) {
      if (!sceneIds.has(id))
        throw new Error(`Position references missing block ${id}`);
      validateValue(
        object({
          x: num(-Number.MAX_VALUE, Number.MAX_VALUE),
          y: num(-Number.MAX_VALUE, Number.MAX_VALUE),
        }),
        point,
        `Position ${id}`,
      );
    }
    validateEditorGroups(doc, sceneIds);
    return;
  }
  if (doc.recipe === null) {
    if (
      !Array.isArray(doc.presentation.controls) ||
      doc.presentation.controls.length ||
      !Array.isArray(doc.presentation.results) ||
      doc.presentation.results.length
    )
      throw new Error("Add an object before adding controls or results");
    record(
      doc.editor,
      [
        "positions",
        "zoom",
        ...(Object.hasOwn(doc.editor, "groups") ? ["groups"] : []),
      ],
      "editor",
    );
    validateValue(num(0.2, 2), doc.editor.zoom, "Workspace zoom");
    if (
      !doc.editor.positions ||
      typeof doc.editor.positions !== "object" ||
      Array.isArray(doc.editor.positions) ||
      Object.keys(doc.editor.positions).length
    )
      throw new Error("An empty canvas cannot contain block positions");
    return;
  }
  const recipe = parseRecipe(JSON.stringify(doc.recipe));
  const resolved = resolveRecipe(recipe);
  const t = templates[doc.template];
  if (recipe.composition.ref !== t.ref)
    throw new Error("Recipe and workbench are incompatible");
  if (
    doc.template === "line" &&
    (recipe.assembly?.instances.length !== 1 ||
      recipe.assembly.instances[0].prefab.ref !==
        "prefabs/math-foundations/Line")
  )
    throw new Error("This workbench supports one registered line");
  const ids = new Set(["object", "view", "lesson", "layout"]);
  const identity = (id: string) => {
    if (!/^[a-zA-Z][\w/-]{0,79}$/.test(id) || ids.has(id))
      throw new Error(`Duplicate or invalid block identity: ${id}`);
    ids.add(id);
  };
  if (
    !Array.isArray(doc.presentation.controls) ||
    doc.presentation.controls.length > 30
  )
    throw new Error("Use at most 30 controls");
  for (const c of doc.presentation.controls) {
    validateValue(controlSchema, c, `Control ${c.id}`);
    identity(c.id);
    const cap = t.controls[c.capability];
    if (!cap || !Object.hasOwn(t.controls, c.capability))
      throw new Error(`${c.id}: unsupported action binding`);
    if (c.target !== (cap.action === "RESET" ? "session" : targetFor(doc)))
      throw new Error(`${c.id}: unknown action target`);
    if (
      c.widget !== cap.widget &&
      !(cap.min !== undefined && ["slider", "number"].includes(c.widget))
    )
      throw new Error(`${c.id}: incompatible widget`);
    if (cap.min !== undefined) {
      if (
        c.min === undefined ||
        c.max === undefined ||
        c.step === undefined ||
        c.min < cap.min ||
        c.max > requireRecord(cap.max) ||
        c.min >= c.max ||
        c.step > c.max - c.min
      )
        throw new Error(
          `${c.label}: range must stay within ${cap.min}–${cap.max} ${cap.unit}`,
        );
      const start = initialParameters(doc)[requireRecord(cap.parameter)];
      if (typeof start !== "number" || start < c.min || start > c.max)
        throw new Error(
          `${c.label}: starting value must fit the control range`,
        );
    } else if (
      c.min !== undefined ||
      c.max !== undefined ||
      c.step !== undefined
    )
      throw new Error(
        `${c.label}: this widget does not accept a numeric range`,
      );
    if (cap.fixed === undefined && c.fixed !== undefined)
      throw new Error(`${c.id}: this action does not accept fixed arguments`);
    const value =
      cap.fixed !== undefined
        ? c.fixed
        : cap.parameter
          ? initialParameters(doc)[cap.parameter]
          : undefined;
    validateCommand(resolved.demo, {
      type: cap.action,
      ...(value !== undefined ? { value } : {}),
    });
    if (cap.fixed !== undefined && c.fixed === undefined)
      throw new Error(`${c.id}: missing fixed action arguments`);
  }
  if (
    !Array.isArray(doc.presentation.results) ||
    doc.presentation.results.length > 30
  )
    throw new Error("Use at most 30 results");
  for (const r of doc.presentation.results) {
    const { unit, ...rest } = r;
    validateValue(resultSchema, rest, `Result ${r.id}`);
    identity(r.id);
    if (
      !Object.hasOwn(t.outputs, r.output) ||
      unit !== t.outputs[r.output].unit ||
      r.target !== targetFor(doc)
    )
      throw new Error(`${r.id}: incompatible output, unit, or target`);
  }
  record(
    doc.editor,
    [
      "positions",
      "zoom",
      ...(Object.hasOwn(doc.editor, "groups") ? ["groups"] : []),
    ],
    "editor",
  );
  validateValue(num(0.2, 2), doc.editor.zoom, "Workspace zoom");
  if (
    !doc.editor.positions ||
    typeof doc.editor.positions !== "object" ||
    Array.isArray(doc.editor.positions)
  )
    throw new Error("Invalid block positions");
  validateEditorGroups(doc, ids);
  for (const [id, point] of Object.entries(doc.editor.positions)) {
    if (!ids.has(id))
      throw new Error(`Position references missing block ${id}`);
    validateValue(
      object({
        x: num(-Number.MAX_VALUE, Number.MAX_VALUE),
        y: num(-Number.MAX_VALUE, Number.MAX_VALUE),
      }),
      point,
      `Position ${id}`,
    );
  }
}
function validateEditorGroups(doc: ExperimentDocument, ids: Set<string>) {
  if (doc.editor.groups === undefined) return;
  if (!Array.isArray(doc.editor.groups) || doc.editor.groups.length > 128)
    throw new Error("Invalid component groups");
  const claimed = new Set<string>();
  const groupIds = new Set<string>();
  for (const group of doc.editor.groups) {
    record(group, ["id", "label", "members"], "Group");
    boundedText(group.id, 80, "Group identity", true);
    boundedText(group.label, 100, "Group label", true);
    if (groupIds.has(group.id) || ids.has(group.id))
      throw new Error("Duplicate group identity");
    groupIds.add(group.id);
    if (!Array.isArray(group.members) || group.members.length < 2)
      throw new Error("Groups need at least two components");
    for (const id of group.members) {
      if (!ids.has(id) || claimed.has(id))
        throw new Error("Invalid or overlapping group membership");
      claimed.add(id);
    }
  }
}

export function initialParameters(
  doc: ExperimentDocument,
): Record<string, unknown> {
  if (!doc.recipe) return {};
  const resolved = resolveRecipe(doc.recipe);
  if (doc.template === "line")
    return { ...requireRecord(resolved.assembly?.instances[0]).parameters };
  return doc.template === "town"
    ? resolved.defaults
    : resolved.instances[0].parameters;
}
export function setInitial(
  doc: ExperimentDocument,
  key: string,
  value: unknown,
) {
  if (doc.template === "line")
    requireRecord(requireRecipe(doc).assembly?.instances[0]).parameters[key] =
      value;
  else requireRecipe(doc).parameters[key] = value;
}
export function parseDocument(source: string): ExperimentDocument {
  const input: unknown = JSON.parse(source);
  if (input && typeof input === "object" && "documentVersion" in input) {
    validateDocument(input);
    return input;
  }
  return fromRecipe(parseRecipe(source));
}
export function serializeDocument(doc: ExperimentDocument) {
  validateDocument(doc);
  return JSON.stringify(doc, null, 2);
}
export function deleteBlock(doc: ExperimentDocument, id: string) {
  if (["object", "view", "lesson", "layout"].includes(id))
    throw new Error(
      "This template requires its object, view and lesson. Choose another template to replace them.",
    );
  doc.presentation.controls = doc.presentation.controls.filter(
    (c) => c.id !== id,
  );
  doc.presentation.results = doc.presentation.results.filter(
    (r) => r.id !== id,
  );
  delete doc.editor.positions[id];
}

/** Blank drafts have no runtime recipe. A model exists only after an explicit addition. */
export function createBlankDocument(
  template: TemplateId,
  layout: ExperimentDocument["presentation"]["layout"],
): ExperimentDocument {
  const doc: ExperimentDocument = {
    documentVersion: 1,
    template,
    recipe: null,
    lesson: { title: "", instruction: "", explanation: "" },
    presentation: {
      layout,
      view: template,
      particles: true,
      directShading: false,
      camera: "overview",
      controls: [],
      results: [],
    },
    editor: { positions: {}, zoom: 1 },
  };
  validateDocument(doc);
  return doc;
}
export function requireRecipe(doc: ExperimentDocument): Recipe {
  if (!doc.recipe) throw new Error("Add an object to your canvas first");
  return doc.recipe;
}
export function addObject(doc: ExperimentDocument) {
  if (doc.recipe)
    throw new Error(
      "This canvas supports one model; remove it before adding another",
    );
  doc.recipe = templateRecipe(doc.template);
}
export function removeObject(doc: ExperimentDocument) {
  doc.recipe = null;
  doc.presentation.controls = [];
  doc.presentation.results = [];
  doc.editor.positions = {};
}
export function validateRunnableDocument(doc: ExperimentDocument) {
  validateDocument(doc);
  if (doc.scene) {
    boundedText(doc.lesson.title, 150, "Title", true);
    boundedText(doc.lesson.instruction, 150, "Instruction", true);
    if (doc.scene.workspace) {
      const pending = pendingConnections(doc.scene);
      if (pending.length) throw new Error(pending[0]);
      return;
    }
    if (!doc.scene.objects.length)
      throw new Error("Add an object before trying this lesson");
    if (
      doc.scene.kind === "town" &&
      !doc.scene.objects.some((o) => o.kind === "ground")
    )
      throw new Error("Add ground before trying this spatial lesson");
    return;
  }
  requireRecipe(doc);
  boundedText(doc.lesson.title, 150, "Title", true);
  boundedText(doc.lesson.instruction, 150, "Instruction", true);
  if (!doc.presentation.controls.some((c) => c.capability === "reset"))
    throw new Error(
      "Add a Reset control so learners can restore starting values",
    );
}

export function isRunnableDocument(doc: ExperimentDocument) {
  try {
    validateRunnableDocument(doc);
    return true;
  } catch {
    return false;
  }
}
