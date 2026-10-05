import type { PublicDefinition } from "../../runtime/authoring/types";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
} from "../../runtime/parameterSchema";

const text: ParameterSchema = {
  type: "string",
  minLength: 0,
  maxLength: 10000,
};
export const base = (
  id: string,
  title: string,
  category: PublicDefinition["category"],
  configuration = object({ label: text }),
  defaults: Record<string, unknown> = { label: title },
): PublicDefinition => ({
  id,
  version: 1,
  title,
  description: title,
  category,
  tags: ["general"],
  configuration,
  defaults,
  inputs: {},
  outputs: {},
  commands: {},
  placement: ["lesson"],
  lifecycle: {
    authored: Object.keys(defaults),
    presentation: Object.keys(defaults),
    clock: false,
    reset: "authored",
    capture: false,
  },
  assumptions: [],
  presentationProvider: id,
});
export const genericDefinitions: PublicDefinition[] = [
  ...["NumberInput", "Form", "Slider", "Toggle", "Select", "Button"].map(
    (name) => ({
      ...base(
        `controls/${name}`,
        name === "NumberInput"
          ? "Number input"
          : name === "Button"
            ? "Action button"
            : name.replace(/([a-z])([A-Z])/g, "$1 $2"),
        "controls",
        object({
          label: text,
          mode: choice("submit", "immediate"),
          initial: text,
        }),
        { label: name, mode: "submit", initial: "{}" },
      ),
      outputs: {
        submit: {
          kind: "event" as const,
          unit: "",
          cardinality: "many" as const,
        },
      },
    }),
  ),
  ...[
    "Readout",
    "StatusMessage",
    "DataTable",
    "Chart",
    "Histogram",
    "Heatmap",
    "Inspector",
  ].map((name) => ({
    ...base(
      `displays/${name}`,
      name.replace(/([a-z])([A-Z])/g, "$1 $2"),
      "displays",
      object({ label: text, precision: num(0, 8, "", true) }),
      { label: name, precision: 3 },
    ),
    inputs: {
      value: {
        kind: "value" as const,
        unit: "*",
        optional: true,
        crossScope: true,
      },
    },
  })),
  base(
    "displays/Text",
    "Text",
    "displays",
    object({ text, variant: choice("heading", "body", "callout") }),
    { text: "Text", variant: "body" },
  ),
  ...[
    "Stack",
    "Row",
    "Grid",
    "Panel",
    "Disclosure",
    "Tabs",
    "Split",
    "Repeater",
  ].map((name) =>
    base(
      `layout/${name}`,
      name,
      "layout",
      object({
        label: text,
        gap: num(0, 64),
        columns: num(1, 6, "", true),
        itemKey: text,
      }),
      { label: name, gap: 16, columns: 2, itemKey: "id" },
    ),
  ),
  {
    ...base(
      "resources/Dataset",
      "Dataset",
      "resources",
      object({ label: text, rows: text, key: text }),
      { label: "Dataset", rows: "[]", key: "id" },
    ),
    runtimeProvider: "resources/Dataset",
    outputs: { rows: { kind: "dataset", unit: "1", crossScope: true } },
  },
  ...["cartesian", "diagram", "physical", "town"].map((kind) => ({
    ...base(
      `canvases/${kind}`,
      (
        {
          cartesian: "Cartesian plane",
          diagram: "2D diagram",
          physical: "2D physical canvas",
          town: "3D spatial scene",
        } as Record<string, string>
      )[kind],
      "canvases",
      object({
        xMin: num(-10000, 10000),
        xMax: num(-10000, 10000),
        yMin: num(-10000, 10000),
        yMax: num(-10000, 10000),
        grid: boolean,
        snap: num(0, 100),
      }),
      { xMin: -5, xMax: 5, yMin: -5, yMax: 5, grid: true, snap: 0.5 },
    ),
    inputs: {
      objects: {
        kind: "attachment" as const,
        unit: kind,
        cardinality: "many" as const,
        optional: true,
      },
    },
  })),
];
