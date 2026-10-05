import type { ExperimentDocument } from "../document";

export type HistoryEntry = {
  id: string;
  document: ExperimentDocument;
  label: string;
};
export function isTextEditing(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "input:not([type='range']):not([type='checkbox']):not([type='radio']):not([type='button']):not([type='color']), textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']",
      ),
    )
  );
}
export function describeEdit(
  before: ExperimentDocument,
  after: ExperimentDocument,
) {
  const components = (d: ExperimentDocument) =>
    d.scene
      ? [
          ...d.scene.objects,
          ...d.scene.controls,
          ...d.scene.measurements,
          ...(d.scene.workspace?.canvases ?? []),
          ...(d.scene.workspace?.trips ?? []),
        ]
      : [...d.presentation.controls, ...d.presentation.results];
  const a = components(before),
    b = components(after);
  const added = b.filter((v) => !a.some((old) => old.id === v.id));
  const removed = a.filter((v) => !b.some((next) => next.id === v.id));
  if (added.length)
    return added.length === 1
      ? `Add ${added[0].label}`
      : `Add ${added.length} components`;
  if (removed.length)
    return removed.length === 1
      ? `Delete ${removed[0].label}`
      : `Delete ${removed.length} components`;
  if (
    JSON.stringify(before.editor.groups) !== JSON.stringify(after.editor.groups)
  )
    return "Change groups";
  if (
    JSON.stringify(before.editor.positions) !==
    JSON.stringify(after.editor.positions)
  )
    return "Move components";
  if (JSON.stringify(before.lesson) !== JSON.stringify(after.lesson))
    return "Edit lesson settings";
  if (
    JSON.stringify(before.scene?.workspace?.placements) !==
    JSON.stringify(after.scene?.workspace?.placements)
  )
    return "Change canvas connection";
  const changed = b.filter(
    (v) =>
      JSON.stringify(v) !== JSON.stringify(a.find((old) => old.id === v.id)),
  );
  return changed.length === 1 ? `Edit ${changed[0].label}` : "Edit experiment";
}
