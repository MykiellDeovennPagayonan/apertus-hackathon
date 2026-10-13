"use client";

import { createContext } from "react";
import type { Snapshot } from "../../runtime-engine/DocumentRuntime";
import type { CompositionScene } from "../../runtime-engine/composition/types";
import type { SceneObject } from "../../../legacy/components/traits/SceneObjects";

export type AuthorControls = {
  authoring?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onAuthorChange?: (node: SceneObject) => void;
  onCanvasChange?: (
    nodeId: string,
    viewport: Pick<
      CompositionScene["canvas"],
      "xMin" | "xMax" | "yMin" | "yMax"
    >,
  ) => void;
};

export const MotionContext = createContext(true);
export const AuthorContext = createContext<AuthorControls>({});
export const SnapshotContext = createContext<Snapshot>({
  state: {},
  outputs: {},
});
