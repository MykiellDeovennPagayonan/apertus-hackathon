import type { CompositionScene } from "../../runtime/composition/types";
import type { Recipe } from "../../runtime/resolver";
import type { Slot, TemplateId } from "../descriptors";
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
  documentVersion: 1 | 2 | 3;
  recipeMetadata?: Omit<
    import("../../runtime/authoring/types").CompositeRecipe,
    "document"
  >;
  authored?: import("../../runtime/authoring/types").AuthoredDocument;
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
    pan?: { x: number; y: number };
    groups?: { id: string; label: string; members: string[] }[];
  };
}
