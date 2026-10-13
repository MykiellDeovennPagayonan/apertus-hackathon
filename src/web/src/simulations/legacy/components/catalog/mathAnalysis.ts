import { command, mathAnalysis } from "../../../domains/math-analysis/models";
import type { CompositionRequirements } from "./explorationTeaching";

/** Essential opening controls, not every supported authoring operation. */
export const mathAnalysisControls: Record<
  string,
  {
    operation: string;
    label: string;
    type: "Slider" | "Button" | "Select";
    initial?: unknown;
    min?: number;
    max?: number;
    step?: number;
  }[]
> = {
  "house-prices": [
    {
      operation: "price",
      label: "Final house price (currency units)",
      type: "Slider",
      initial: 160,
      min: 0,
      max: 1000,
      step: 10,
    },
  ],
  "score-spread": [
    {
      operation: "spread",
      label: "Class B spread (points)",
      type: "Slider",
      initial: 10,
      min: 0,
      max: 30,
      step: 1,
    },
  ],
  "survey-sampling": [
    { operation: "draw", label: "Draw 20 surveys", type: "Button" },
    {
      operation: "set_sampleSize",
      label: "Survey size",
      type: "Slider",
      initial: 20,
      min: 20,
      max: 500,
      step: 20,
    },
  ],
  "study-regression": [
    {
      operation: "score",
      label: "Final student's score (points)",
      type: "Slider",
      initial: 90,
      min: 0,
      max: 100,
      step: 1,
    },
  ],
  "feasible-choices": [
    {
      operation: "set_notebooks",
      label: "Notebooks",
      type: "Slider",
      initial: 2,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      operation: "set_pens",
      label: "Pens",
      type: "Slider",
      initial: 4,
      min: 0,
      max: 10,
      step: 1,
    },
  ],
  "conditional-bags": [
    { operation: "reveal", label: "Reveal blue evidence", type: "Button" },
    {
      operation: "set_prior",
      label: "Chance of first bag",
      type: "Slider",
      initial: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  "teams-and-podiums": [
    { operation: "toggle", label: "Switch team / podium", type: "Button" },
    {
      operation: "set_selected",
      label: "People selected",
      type: "Slider",
      initial: 3,
      min: 0,
      max: 5,
      step: 1,
    },
  ],
  "loan-payments": [
    { operation: "next", label: "Next monthly payment", type: "Button" },
    {
      operation: "set_extra",
      label: "Extra payment (currency units/month)",
      type: "Slider",
      initial: 0,
      min: 0,
      max: 200,
      step: 10,
    },
  ],
  "instantaneous-velocity": [
    { operation: "shrink", label: "Halve the time interval", type: "Button" },
    {
      operation: "set_time",
      label: "Selected time (s)",
      type: "Slider",
      initial: 3,
      min: 0,
      max: 9,
      step: 0.1,
    },
  ],
  "accumulated-water": [
    { operation: "refine", label: "Double the rectangles", type: "Button" },
    {
      operation: "set_rule",
      label: "Rectangle rule",
      type: "Select",
      initial: "left",
    },
  ],
};
export const mathAnalysisRequirements: Record<string, CompositionRequirements> =
  Object.fromEntries(
    mathAnalysis.models.map((model) => {
      const kind = model.ref.split("/")[2];
      const controls = mathAnalysisControls[kind];
      return [
        model.ref,
        {
          topic: model.name,
          selectionKey: kind,
          selectionGroup: "math-analysis",
          commands: controls.map((c) => command(kind, c.operation)),
          observations: [],
          appearance: `appearance/${model.presentation}`,
          guidance: `${model.description} ${model.assumptions.join(" ")} Use one independent attached scene and only ${controls.map((c) => `${c.type}: ${c.label}, command ${command(kind, c.operation)}${c.min !== undefined ? `, minimum ${c.min}, maximum ${c.max}, step ${c.step}, initial ${c.initial}` : ""}`).join("; ")}. Use the existing scene-with-sidebar arrangement with essential controls beside the scene. Fit the entire board above the bottom change composer. The scene shows essential quantities; no extra readout dashboard, playback toolbar or authoring settings in the opening. Keep default parameters unless the learner specifies values. Observation arrays are authored with stable IDs; add/remove by editing the array while retaining other IDs. A maximum of two independent model instances supports side-by-side comparisons. Follow-up edits change only requested fields. Unsupported extensions clarify or reject and retain the last accepted lesson.`,
        },
      ];
    }),
  );
export function mathAnalysisArguments(
  commandName: string,
  state: Record<string, unknown>,
) {
  for (const model of mathAnalysis.models) {
    const kind = model.ref.split("/")[2];
    if (!commandName.startsWith(`MA_${kind.toUpperCase()}_`)) continue;
    if (model.parameters.type === "object") {
      const key = Object.keys(model.parameters.properties).find(
        (field) => command(kind, `set_${field}`) === commandName,
      );
      if (key) return { value: state[key] };
    }
    if (commandName === command("house-prices", "price")) {
      const houses = state.houses as { value: number }[];
      return houses.length
        ? { value: houses[houses.length - 1].value }
        : undefined;
    }
    if (commandName === command("study-regression", "score")) {
      const students = state.students as { y: number }[];
      return students.length
        ? { value: students[students.length - 1].y }
        : undefined;
    }
    if (commandName === command("score-spread", "spread")) {
      const second = state.second as number[];
      return second.length === 5
        ? { value: (second[4] - second[0]) / 4 }
        : undefined;
    }
    return;
  }
}

export const mathAnalysisLiveCommands = new Set(
  mathAnalysis.models.flatMap((model) => {
    const kind = model.ref.split("/")[2];
    const fields =
      model.parameters.type === "object" ? model.parameters.properties : {};
    return [
      ...Object.entries(fields)
        .filter(([, schema]) =>
          ["number", "integer", "enum"].includes(schema.type),
        )
        .map(([field]) => command(kind, `set_${field}`)),
      ...["price", "score", "spread"].map((operation) =>
        command(kind, operation),
      ),
    ].filter((key) => Boolean(model.actions[key]));
  }),
);
