import { retiredControls } from "./contracts/controlContract";
import type {
  DiscoveryMetadata,
  PublicDefinition,
} from "./contracts/publicDefinition";
export const discoverySections = [
  { id: "objects", title: "Shapes and objects", icon: "◇" },
  { id: "controls", title: "Controls", icon: "↔" },
  { id: "displays", title: "Displays", icon: "▤" },
  { id: "canvases", title: "Canvases", icon: "▧" },
  { id: "models", title: "Models and behaviors", icon: "ƒ" },
  { id: "layout", title: "Layout and resources", icon: "▦" },
  { id: "composites", title: "Composites", icon: "⬡" },
  { id: "experiments", title: "Complete experiments", icon: "✧" },
] as const;
const summaries: Record<string, string> = {
  "controls/NumberInput":
    "Let learners enter a number to change a connected value.",
  "controls/Slider": "Adjust a connected value by dragging a slider.",
  "controls/Toggle": "Switch a connected setting on or off.",
  "controls/Button": "Run a connected action with one click.",
  "controls/Form":
    "Collect values and apply them together to a connected action.",
  "controls/Select": "Let learners choose from a list of values.",
  "displays/Text":
    "Add instructions, an explanation, or a heading to your lesson.",
  "displays/Readout": "Show a live numeric result from a connected component.",
  "displays/Chart": "Plot a connected dataset to reveal patterns and changes.",
  "displays/Heatmap": "Show a connected grid as a map of colored values.",
  "displays/DataTable": "Present connected data in rows and columns.",
  "displays/StatusMessage": "Show a message based on a connected result.",
  "displays/Histogram": "Compare the frequency of values in connected data.",
  "displays/Inspector": "Inspect the current values of a connected component.",
  "prefabs/AuthoredLine":
    "Draw one line and explore its slope and intercept on a Cartesian plane.",
  "operations/LineIntersection": "Find where two connected lines meet.",
  "operations/FractionComparison":
    "Compare the values of two connected fraction bars.",
};
export function definitionDiscovery(d: PublicDefinition): DiscoveryMetadata {
  const group =
    d.discovery?.group ??
    (d.category === "controls" ||
    d.category === "displays" ||
    d.category === "canvases"
      ? d.category
      : d.category === "models" || d.category === "behaviors"
        ? "models"
        : "layout");
  const kind =
    d.discovery?.kind ??
    (d.application
      ? "preset"
      : d.category === "models"
        ? "model"
        : "component");
  const fallback: Record<PublicDefinition["category"], string> = {
    models: `Calculate and explore ${d.title.toLowerCase()} with connected controls and results.`,
    behaviors: `Add ${d.title.toLowerCase()} behavior to connected components.`,
    controls: "Let learners change a connected setting or run an action.",
    displays: "Present a connected result in your lesson.",
    canvases: `Arrange and display compatible objects on a ${d.title.toLowerCase()}.`,
    appearance: "Add a visual representation of a connected model.",
    resources: "Provide reusable values or settings for your experiment.",
    layout: `Organize lesson content using a ${d.title.toLowerCase()}.`,
  };
  return {
    kind,
    group,
    summary:
      summaries[d.id] ??
      (d.application
        ? `Apply reusable starting settings to a selected ${d.title.replace(/ preset$/i, "").toLowerCase()}.`
        : d.category === "appearance" &&
            d.description === d.title.replace(/ appearance$/i, "")
          ? `Show a live view of a connected ${d.description.toLowerCase()} model.`
          : d.description.trim() && d.description.trim() !== d.title.trim()
            ? d.description
            : fallback[d.category]),
    placement:
      d.discovery?.placement ??
      (d.application
        ? "Applies to a selected model"
        : d.category === "canvases"
          ? "Adds a new canvas"
          : d.outputs.appearance?.kind === "attachment"
            ? "Uses a compatible canvas"
            : d.category === "models" ||
                d.category === "behaviors" ||
                d.category === "resources"
              ? "Connect in the workspace"
              : "Adds to the lesson page"),
  };
}
export function searchRank(title: string, query: string) {
  const name = title.toLowerCase(),
    term = query.trim().toLowerCase();
  return name === term
    ? 0
    : name.startsWith(term)
      ? 1
      : name.includes(term)
        ? 2
        : 3;
}
export function discoverableDefinition(definition: PublicDefinition) {
  return (
    !retiredControls.has(definition.id) &&
    !definition.id.startsWith("resources/prefabs-")
  );
}
