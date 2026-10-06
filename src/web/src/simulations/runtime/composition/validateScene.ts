import type { CompositionScene } from "./types";
import { validateSingleScene } from "./validateSingleScene";
import { validateWorkspace } from "./validateWorkspace";
export function validateScene(
  scene: CompositionScene,
  template: string,
  validateStarts = true,
) {
  if (
    scene?.version === 1 &&
    (scene.kind === "physical" || scene.kind === "diagram")
  )
    throw new Error(
      "Physical and diagram compositions require scene version 2",
    );
  if (scene?.workspace) validateWorkspace(scene, template, validateStarts);
  else validateSingleScene(scene, template, validateStarts);
}
