import { publicDefinition } from "../../../../registry/index";
import { GRAVITIES } from "../../../components/resources/GravityPresets";
import type { DocumentRuntime, ScopedCommand } from "../../../../creation-and-editing/runtime-engine/DocumentRuntime";
import type { UIAction } from "../../types";

/** Legacy planner verbs are translated here; current recipes never assemble through aliases. */
export function recipeCommands(
  runtime: DocumentRuntime,
  commands: UIAction[],
): ScopedCommand[] {
  const nodes = runtime.document.nodes.filter(
    (node) => publicDefinition(node).category === "models",
  );
  return commands.flatMap((action) => {
    const candidates =
      action.target && action.target !== "session"
        ? nodes.filter((node) => node.id === action.target)
        : nodes;
    if (!candidates.length)
      throw new Error(`${action.target}: unknown recipe target`);
    return candidates.flatMap((node) => {
      let command = action.type;
      let value = action.value;
      if (node.definition === "models/Projectile") {
        const fields: Record<string, string> = {
          SET_ANGLE: "angle",
          SET_VELOCITY: "velocity",
          SET_GRAVITY: "gravity",
          SET_PLAYING: "playing",
          SET_SLOW_MO: "slowMo",
        };
        if (fields[command]) command = `set:${fields[command]}`;
        if (action.type === "SET_GRAVITY" && typeof value === "string")
          value = GRAVITIES[value];
        if (["SHOW_VECTORS", "HIDE_VECTORS"].includes(command)) {
          value = command === "SHOW_VECTORS";
          command = "set:showVectors";
        }
        if (command === "COMPARE_ANGLE") {
          if (
            node !==
            nodes.filter((n) => n.definition === "models/Projectile")[1]
          )
            return [];
          command = "set:angle";
        }
      }
      const definition = publicDefinition(node);
      if (!definition.commands[command]) {
        if (!action.target || action.target === "session") return [];
        throw new Error(`${node.label}: ${action.type} is unavailable`);
      }
      return [
        {
          node: node.id,
          command,
          arguments: value === undefined ? {} : { value },
        },
      ];
    });
  });
}
