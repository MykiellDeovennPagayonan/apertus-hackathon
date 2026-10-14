import { boolean, choice, num, object } from "../contracts/parameterSchema";
import type { PublicDefinition } from "../contracts/publicDefinition";
import { base, text } from "./shared";
export const displaysDefinitions: PublicDefinition[] = [
  ...[
    "Readout",
    "TrialSummary",
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
      object(
        {
          label: text,
          precision: num(0, 8, "", true),
          tone: choice("neutral", "success", "warning", "error"),
          ...(["DataTable", "Chart", "Histogram", "Heatmap"].includes(name)
            ? {
                columns: {
                  type: "array" as const,
                  minItems: 1,
                  maxItems: 32,
                  items: object(
                    {
                      key: text,
                      label: text,
                      unit: text,
                      type: choice("number", "string", "boolean"),
                      precision: num(0, 8, "", true),
                    },
                    ["unit", "type", "precision"],
                  ),
                },
                series: {
                  type: "array" as const,
                  minItems: 1,
                  maxItems: 6,
                  items: text,
                },
                xKey: text,
                xLabel: text,
                xUnit: text,
                yLabel: text,
                yUnit: text,
                rowLabel: text,
                columnLabel: text,
                valueLabel: text,
                valueUnit: text,
              }
            : {}),
        },
        [
          "tone",
          "columns",
          "series",
          "xKey",
          "xLabel",
          "xUnit",
          "yLabel",
          "yUnit",
          "rowLabel",
          "columnLabel",
          "valueLabel",
          "valueUnit",
        ],
      ),
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
    object(
      {
        text,
        variant: choice("heading", "body", "callout"),
        border: boolean,
        borderColor: text,
        borderWidth: num(0, 20),
        borderRadius: num(0, 200),
        backgroundColor: text,
        opacity: num(0, 1),
      },
      [
        "border",
        "borderColor",
        "borderWidth",
        "borderRadius",
        "backgroundColor",
        "opacity",
      ],
    ),
    {
      text: "Text",
      variant: "body",
      border: false,
      borderColor: "#d5cdbb",
      borderWidth: 1,
      borderRadius: 0,
      backgroundColor: "transparent",
      opacity: 1,
    },
  ),
  {
    ...base(
      "displays/Box",
      "Box",
      "displays",
      object({
        border: boolean,
        borderColor: text,
        borderWidth: num(0, 20),
        borderRadius: num(0, 200),
        backgroundColor: text,
        opacity: num(0, 1),
      }),
      {
        border: false,
        borderColor: "#d5cdbb",
        borderWidth: 1,
        borderRadius: 12,
        backgroundColor: "#edf2e8",
        opacity: 1,
      },
    ),
    description:
      "A decorative box. Resize, style, and layer it behind or in front of lesson content.",
    discovery: {
      kind: "component",
      group: "layout",
      summary: "A decorative box for backgrounds and visual grouping.",
      placement: "Adds to the lesson page",
    },
  },
];
