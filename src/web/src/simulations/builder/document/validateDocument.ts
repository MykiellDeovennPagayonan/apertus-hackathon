import { validateAuthoredDocument } from "../../runtime/authoring/validate";
import { validateCommand } from "../../runtime/capabilities";
import { validateScene } from "../../runtime/composition/index";
import {
  boolean,
  choice,
  num,
  object,
  validateValue,
} from "../../runtime/parameterSchema";
import { requireRecord } from "../../runtime/records";
import { parseRecipe, resolveRecipe } from "../../runtime/resolver";
import { templates } from "../descriptors";
import { pendingConnections } from "../editor/workspaceCommands";
import { initialParameters, requireRecipe, targetFor } from "./legacy";
import type { ExperimentDocument } from "./types";

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
export function validateDocument(
  input: unknown,
): asserts input is ExperimentDocument {
  if (
    input &&
    typeof input === "object" &&
    "documentVersion" in input &&
    input.documentVersion === 3
  ) {
    const doc = input as ExperimentDocument;
    validateAuthoredDocument(doc.authored);
    if (
      doc.scene ||
      doc.recipe ||
      doc.presentation.controls.length ||
      doc.presentation.results.length
    )
      throw new Error(
        "Canonical documents cannot contain independently editable legacy bindings",
      );
    if (JSON.stringify(doc.lesson) !== JSON.stringify(doc.authored.lesson))
      throw new Error("Canonical lesson metadata is out of sync");
    return;
  }
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

export function validateRunnableDocument(doc: ExperimentDocument) {
  validateDocument(doc);
  if (doc.authored) {
    validateAuthoredDocument(doc.authored, true);
    return;
  }
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
