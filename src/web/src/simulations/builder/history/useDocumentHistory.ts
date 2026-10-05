import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ExperimentDocument } from "../document/types";
import { validateDocument } from "../document/validateDocument";
import { describeEdit, type HistoryEntry, isTextEditing } from "./entries";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";
export function useDocumentHistory(
  doc: ExperimentDocument | null,
  setDoc: Dispatch<SetStateAction<ExperimentDocument | null>>,
  setValid: Dispatch<SetStateAction<ExperimentDocument | null>>,
  setError: Dispatch<SetStateAction<string>>,
  setNotice: Dispatch<SetStateAction<string>>,
  expanded: boolean,
  playingSaved: boolean,
) {
  const [past, setPast] = useState<HistoryEntry[]>([]),
    [future, setFuture] = useState<HistoryEntry[]>([]);
  const editingGroup = useRef<string | null>(null);
  const activateEdit = (next: ExperimentDocument) => {
    if (next.authored)
      next = {
        ...next,
        authored: { ...next.authored, editor: structuredClone(next.editor) },
      };
    setDoc(next);
    try {
      validateDocument(next);
      setValid(next);
      setError("");
    } catch (e) {
      setError(message(e));
    }
  };
  const edit = (
    change: (next: ExperimentDocument) => void,
    group: string | null = null,
    action?: string,
  ) => {
    if (!doc) return false;
    try {
      const next = structuredClone(doc);
      change(next);
      if (next.authored) {
        next.authored.editor = structuredClone(next.editor);
        next.lesson = structuredClone(next.authored.lesson);
        validateDocument(next);
      }
      if (JSON.stringify(next) === JSON.stringify(doc)) return false;
      if (!group || editingGroup.current !== group)
        setPast((p) => [
          ...p.slice(-99),
          {
            id: crypto.randomUUID(),
            document: doc,
            label: action ?? describeEdit(doc, next),
          },
        ]);
      editingGroup.current = group;
      setFuture([]);
      activateEdit(next);
      setNotice("");
      return true;
    } catch (e) {
      setNotice(message(e));
      return false;
    }
  };
  const undo = () => {
    editingGroup.current = null;
    if (!doc || !past.length) return;
    const entry = past[past.length - 1];
    setFuture((f) => [
      { id: entry.id, document: doc, label: entry.label },
      ...f,
    ]);
    activateEdit({
      ...entry.document,
      editor: { ...entry.document.editor, zoom: doc.editor.zoom },
    });
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    editingGroup.current = null;
    if (!doc || !future.length) return;
    setPast((p) => [
      ...p.slice(-99),
      { id: future[0].id, document: doc, label: future[0].label },
    ]);
    activateEdit({
      ...future[0].document,
      editor: { ...future[0].document.editor, zoom: doc.editor.zoom },
    });
    setFuture((f) => f.slice(1));
  };
  const keyboardHistory = useRef({ undo, redo, enabled: false });
  keyboardHistory.current = {
    undo,
    redo,
    enabled: Boolean(doc) && !playingSaved && !expanded,
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !keyboardHistory.current.enabled ||
        isTextEditing(event.target) ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      )
        return;
      const value = event.key.toLowerCase();
      if (value === "z" || value === "y") {
        event.preventDefault();
        if (value === "y" || event.shiftKey) keyboardHistory.current.redo();
        else keyboardHistory.current.undo();
      }
    };
    const endEditGroup = () => {
      editingGroup.current = null;
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerup", endEditGroup);
    window.addEventListener("focusout", endEditGroup);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerup", endEditGroup);
      window.removeEventListener("focusout", endEditGroup);
    };
  }, []);

  const resetHistory = useCallback(() => {
    editingGroup.current = null;
    setPast([]);
    setFuture([]);
  }, []);
  return { past, future, edit, undo, redo, resetHistory };
}
