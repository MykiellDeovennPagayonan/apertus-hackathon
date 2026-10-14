import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
} from "../../../registry/contracts/parameterSchema";
import { base } from "../../../registry/definitions/shared";

const text: ParameterSchema = {
  type: "string",
  minLength: 0,
  maxLength: 10000,
};
export const conversionPairs = {
  UnitConversion: {
    title: "Metres to centimetres",
    from: "m",
    to: "cm",
    scale: 100,
    offset: 0,
  },
  CentimetresToMetres: {
    title: "Centimetres to metres",
    from: "cm",
    to: "m",
    scale: 0.01,
    offset: 0,
  },
  SecondsToMinutes: {
    title: "Seconds to minutes",
    from: "s",
    to: "min",
    scale: 1 / 60,
    offset: 0,
  },
  MinutesToSeconds: {
    title: "Minutes to seconds",
    from: "min",
    to: "s",
    scale: 60,
    offset: 0,
  },
  CelsiusToKelvin: {
    title: "Celsius to kelvin (absolute)",
    from: "°C",
    to: "K",
    scale: 1,
    offset: 273.15,
  },
  KelvinToCelsius: {
    title: "Kelvin to Celsius (absolute)",
    from: "K",
    to: "°C",
    scale: 1,
    offset: -273.15,
  },
  CelsiusDifferenceToKelvin: {
    title: "Celsius difference to kelvin difference",
    from: "Δ°C",
    to: "ΔK",
    scale: 1,
    offset: 0,
  },
} as const;
const pure = (
  id: string,
  title: string,
  schema: ParameterSchema,
  defaults: Record<string, unknown>,
): PublicDefinition => ({
  ...base(id, title, "behaviors", schema, defaults),
  placement: ["logic"],
  runtimeProvider: id,
  presentationProvider: undefined,
  lifecycle: {
    authored: Object.keys(defaults),
    presentation: [],
    clock: false,
    reset: "authored",
    capture: false,
  },
});
export const authoringDefinitions: PublicDefinition[] = [
  ...["TextInput", "EntityPicker"].map((name) => ({
    ...base(
      `controls/${name}`,
      name === "TextInput" ? "Text input" : "Entity picker",
      "controls",
      object({
        label: text,
        mode: choice("submit", "immediate"),
        initial: text,
        targetDefinition: text,
      }),
      {
        label: name === "TextInput" ? "Text input" : "Entity picker",
        mode: "submit",
        initial: "{}",
        targetDefinition: "",
      },
    ),
    outputs: {
      submit: {
        kind: "event" as const,
        unit: "",
        cardinality: "many" as const,
      },
    },
    description:
      name === "EntityPicker"
        ? "Submit a reference to a compatible component in this runtime scope."
        : "Submit validated text to a declared command.",
  })),
  ...["Formula", "Legend"].map((name) => ({
    ...base(
      `displays/${name}`,
      name === "Formula" ? "Formula display" : "Legend",
      "displays",
      object({ label: text, text }),
      { label: name, text: name === "Formula" ? "x = 0" : "[]" },
    ),
    inputs: {
      value: {
        kind: "value" as const,
        unit: "*",
        optional: true,
        crossScope: true,
      },
    },
    description:
      name === "Formula"
        ? "Display a bound exact value or authored equation as text."
        : "Display authored or bound labeled color entries.",
  })),
  ...["number", "boolean", "text", "record", "list"].map((type) => ({
    ...pure(
      type === "number" ? "data/Literal" : `data/Literal-${type}`,
      `Literal (${type})`,
      object({ json: text }),
      {
        json:
          type === "number"
            ? "0"
            : type === "boolean"
              ? "true"
              : type === "text"
                ? '"Text"'
                : type === "record"
                  ? "{}"
                  : "[]",
      },
    ),
    description: `A bounded, validated ${type} JSON constant.`,
    outputs: {
      value: {
        kind: "value" as const,
        unit: type === "number" ? "1" : type === "boolean" ? "boolean" : "",
        schema: type === "boolean" ? boolean : undefined,
        crossScope: true,
      },
    },
  })),
  {
    ...pure(
      "data/FieldSelector",
      "Field selector",
      object({
        path: text,
        resultType: choice("number", "boolean", "text", "record", "list"),
      }),
      { path: "value", resultType: "number" },
    ),
    description:
      "Read a declared own-property path from a record or list; rejects missing fields and unsafe paths.",
    inputs: {
      source: { kind: "value", unit: "*", optional: true, crossScope: true },
    },
    outputs: { value: { kind: "value", unit: "1", crossScope: true } },
  },
  {
    ...pure("data/Expression", "Expression", object({ expression: text }), {
      expression: '{"op":"add","args":["x","y"]}',
    }),
    description:
      "Bounded numeric JSON expressions: x, y, numbers, and add/subtract/multiply/divide/min/max/abs/negate operations. No executable code.",
    inputs: {
      x: {
        kind: "value",
        unit: "1",
        schema: num(-1e12, 1e12),
        optional: true,
        crossScope: true,
      },
      y: {
        kind: "value",
        unit: "1",
        schema: num(-1e12, 1e12),
        optional: true,
        crossScope: true,
      },
    },
    outputs: {
      value: {
        kind: "value",
        unit: "1",
        schema: num(-1e12, 1e12),
        crossScope: true,
      },
    },
  },
  ...Object.entries(conversionPairs).map(([name, pair]) => ({
    ...pure(
      `data/${name}`,
      name === "UnitConversion"
        ? "Unit conversion · metres to centimetres"
        : pair.title,
      object({}),
      {},
    ),
    description: `Explicit conversion from ${pair.from} to ${pair.to}. ${pair.offset ? "Absolute temperature, not a temperature difference." : "Quantity semantics are preserved."}`,
    inputs: {
      value: {
        kind: "value" as const,
        unit: pair.from,
        schema: num(-1e12, 1e12),
        optional: true,
        crossScope: true,
      },
    },
    outputs: {
      value: {
        kind: "value" as const,
        unit: pair.to,
        schema: num(-1e12, 1e12),
        crossScope: true,
      },
    },
    assumptions: [
      "Fixed dimension-compatible conversion; coordinate frames are never converted.",
    ],
  })),
  {
    ...base(
      "resources/Theme",
      "Theme",
      "resources",
      object({
        label: text,
        accent: text,
        background: text,
        foreground: text,
        fontSize: num(12, 32),
        font: choice("system", "serif", "mono"),
      }),
      {
        label: "Theme",
        accent: "#245bcb",
        background: "#ffffff",
        foreground: "#172334",
        fontSize: 16,
        font: "system",
      },
    ),
    runtimeProvider: "resources/Theme",
    outputs: { theme: { kind: "value", unit: "theme", crossScope: true } },
    description:
      "Bounded color and typography tokens for explicitly connected layout sections.",
    lifecycle: {
      authored: [
        "label",
        "accent",
        "background",
        "foreground",
        "fontSize",
        "font",
      ],
      presentation: [],
      clock: false,
      reset: "authored",
      capture: false,
    },
  },
];
export const presentationFields = {
  mobileColumns: num(1, 6, "", true),
  alignment: choice("stretch", "start", "center", "end"),
  font: choice("inherit", "system", "serif", "mono"),
  fontSize: num(12, 32),
};
export const conditionInputs = {
  visible: {
    kind: "value" as const,
    unit: "",
    schema: boolean,
    optional: true,
    crossScope: true,
  },
  disabled: {
    kind: "value" as const,
    unit: "",
    schema: boolean,
    optional: true,
    crossScope: true,
  },
};
