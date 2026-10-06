import type { CompositionScene } from "../runtime/composition/types";
export interface CompositionLessonInput {
  scene?: CompositionScene;
  template: string;
  lesson: { instruction: string; explanation: string };
  presentation: { layout: "right" | "bottom" | "floating" };
}
