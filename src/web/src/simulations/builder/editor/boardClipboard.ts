import { reconcileBoard } from "../../runtime/authoring/board";
import {
  isDrawingItem,
  removeBoardDrawings,
} from "../../runtime/authoring/drawings";
import type { ExperimentDocument } from "../document";
import { type ComponentClipboard, pasteComponents } from "./selection";
export type BoardClipboard = ComponentClipboard & { itemIds: string[] };
export function pasteBoardContent(
  target: ExperimentDocument,
  clipboard: BoardClipboard,
) {
  const source = clipboard.document.authored?.presentation;
  if (
    !target.authored ||
    source?.mode !== "board" ||
    target.authored.presentation?.mode !== "board"
  )
    return;
  const before = new Set(
    target.authored.presentation.items.map((item) => item.id),
  );
  if (clipboard.ids.length) pasteComponents(target, clipboard);
  const p = target.authored.presentation;
  if (p?.mode !== "board") return;
  const mapping = new Map<string, string>();
  const chosen = source.items.filter((item) =>
    clipboard.itemIds.includes(item.id),
  );
  const added = p.items.filter((item) => !before.has(item.id));
  for (const item of chosen) {
    if (isDrawingItem(item)) {
      const copy = structuredClone(item);
      copy.id = `drawing/${crypto.randomUUID()}`;
      copy.rect.x += 40;
      copy.rect.y += 40;
      copy.locked = false;
      p.items.push(copy);
      mapping.set(item.id, copy.id);
      p.version = 2;
    } else {
      const copy = added.find((candidate) =>
        candidate.layoutId?.endsWith(`/${item.layoutId}`),
      );
      if (copy) mapping.set(item.id, copy.id);
    }
  }
  let top = Math.max(
    -1,
    ...p.items.filter((item) => before.has(item.id)).map((item) => item.zIndex),
  );
  for (const item of [...chosen].sort((a, b) => a.zIndex - b.zIndex)) {
    const copy = p.items.find(
      (candidate) => candidate.id === mapping.get(item.id),
    );
    if (copy) copy.zIndex = ++top;
  }
  for (const group of source.groups) {
    if (
      !group.members.some((id) =>
        chosen.some((item) => item.id === id && isDrawingItem(item)),
      )
    )
      continue;
    const members = group.members.flatMap((id) =>
      mapping.has(id) ? [mapping.get(id) as string] : [],
    );
    if (members.length > 1)
      p.groups.push({ ...group, id: `group/${crypto.randomUUID()}`, members });
  }
  reconcileBoard(target.authored);
}
export function deleteBoardDrawingContent(
  target: ExperimentDocument,
  ids: string[],
) {
  const p = target.authored?.presentation;
  if (p?.mode === "board")
    removeBoardDrawings(
      p,
      ids.filter((id) =>
        p.items.some((item) => item.id === id && isDrawingItem(item)),
      ),
    );
}
