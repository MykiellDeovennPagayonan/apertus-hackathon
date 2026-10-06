"use client";
import dynamic from "next/dynamic";
import type { ActionResult } from "../../runtime/commands";
import type { CompositionScene } from "../../runtime/composition/types";
import type { PersonSnapshot } from "../systems/ScheduledTripSystem";
import type { SceneObject } from "../traits/SceneObjects";
import { CartesianView } from "./CartesianView";
import { DisplayView } from "./DisplayView";

const AuthoredTownView = dynamic(() => import("./AuthoredTownView"), {
  ssr: false,
  loading: () => <p>Loading 3D scene…</p>,
});
export type CompositionCanvasProps = {
  scene: CompositionScene;
  people: PersonSnapshot[];
  selected: string;
  authoring: boolean;
  active: boolean;
  resetToken: string;
  onSelect: (id: string) => void;
  onChange: (o: SceneObject) => void;
  onCommit: (o: SceneObject) => void;
  onCanvasCommit?: (
    viewport: Pick<
      CompositionScene["canvas"],
      "xMin" | "xMax" | "yMin" | "yMax"
    >,
  ) => void;
  onPiece: (id: string, index: number) => ActionResult;
};
/** React/Three view providers are loaded only by presentation, never by schema lookup. */
export const compositionViewProviders = {
  cartesian: CartesianView,
  physical: DisplayView,
  diagram: DisplayView,
  town: AuthoredTownView,
};
export function CompositionCanvas(props: CompositionCanvasProps) {
  const View = compositionViewProviders[props.scene.kind];
  return <View {...props} />;
}
