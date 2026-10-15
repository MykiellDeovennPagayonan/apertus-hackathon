import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import { num, object } from "../../../registry/contracts/parameterSchema";
import { text, base } from "../../../registry/definitions/shared";
export const genericDefinitions: PublicDefinition[] = [
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
    lifecycle: {
      authored: ["rows", "key"],
      presentation: ["label"],
      clock: false,
      reset: "authored",
      capture: false,
    },
    outputs: { rows: { kind: "dataset", unit: "1", crossScope: true } },
  }
];
