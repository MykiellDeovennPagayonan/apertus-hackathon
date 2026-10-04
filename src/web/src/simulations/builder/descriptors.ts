import { modelProvider } from "../runtime/assembly";
import { operations } from "../runtime/capabilities";
import type { Recipe } from "../runtime/resolver";

export type TemplateId = "gas" | "fractions" | "line" | "town";
export type Slot = "primary" | "details";
export interface ControlCapability {
  label: string;
  action: string;
  parameter?: string;
  unit: string;
  widget: "slider" | "number" | "button" | "toggle" | "select";
  min?: number;
  max?: number;
  step?: number;
  choices?: number[];
  fixed?: unknown;
  slot: Slot;
}
export interface Template {
  name: string;
  group: string;
  instruction: string;
  ref: string;
  target: string;
  controls: Record<string, ControlCapability>;
  outputs: Record<string, { label: string; unit: string }>;
}
const reset: ControlCapability = {
  label: "Reset",
  action: "RESET",
  unit: "",
  widget: "button",
  slot: "primary",
};
const playing: ControlCapability = {
  label: "Play",
  action: "SET_PLAYING",
  parameter: "playing",
  unit: "",
  widget: "toggle",
  slot: "primary",
};
// Ranges and units are sourced from the command providers, never inferred from a canvas.
function gasControl(
  parameter: string,
  label: string,
  step: number,
  slot: Slot,
): ControlCapability {
  const action = `SET_${parameter.toUpperCase()}`;
  const args = operations.gas[action].arguments;
  const schema = args.type === "object" ? args.properties.value : undefined;
  if (!schema || schema.type !== "number")
    throw new Error("Missing gas numeric contract");
  return {
    label,
    parameter,
    action,
    unit: schema.unit ?? "",
    min: schema.minimum,
    max: schema.maximum,
    step,
    widget: "slider",
    slot,
  };
}
export const templates: Record<TemplateId, Template> = {
  gas: {
    name: "Gas Pressure",
    group: "2D physical experiment",
    instruction: "Make the container smaller. What happens to the pressure?",
    ref: "compositions/GasPressureExperiment",
    target: "session",
    controls: {
      volume: gasControl("volume", "Volume", 0.05, "primary"),
      temperature: gasControl("temperature", "Temperature", 10, "details"),
      amount: gasControl("amount", "Amount of gas", 0.1, "details"),
      playing: { ...playing, label: "Particle motion", slot: "details" },
      reset,
    },
    outputs: { pressureKPa: { label: "Pressure", unit: "kPa" } },
  },
  fractions: {
    name: "Fraction Builder",
    group: "2D diagram",
    instruction: "Split a bar into more pieces. Does its shaded amount change?",
    ref: "compositions/FractionBuilderExperiment",
    target: "session",
    controls: {
      splitA: {
        label: "Split A ×2",
        action: "SUBDIVIDE_FRACTION",
        fixed: { bar: 0, factor: 2 },
        unit: "",
        widget: "button",
        slot: "primary",
      },
      splitB: {
        label: "Split B ×2",
        action: "SUBDIVIDE_FRACTION",
        fixed: { bar: 1, factor: 2 },
        unit: "",
        widget: "button",
        slot: "primary",
      },
      reset,
    },
    outputs: { relation: { label: "Comparison", unit: "" } },
  },
  line: {
    name: "Line slope",
    group: "2D Cartesian plane",
    instruction: "Change the slope and intercept. What happens to the line?",
    ref: "assemblies/GeneratedExperiment",
    target: "line/main",
    controls: {
      slope: {
        label: "Slope",
        action: "SET_SLOPE",
        parameter: "slope",
        unit: "1",
        min: -20,
        max: 20,
        step: 0.1,
        widget: "slider",
        slot: "primary",
      },
      intercept: {
        label: "Intercept",
        action: "SET_INTERCEPT",
        parameter: "intercept",
        unit: "math units",
        min: -100,
        max: 100,
        step: 1,
        widget: "number",
        slot: "primary",
      },
      reset,
    },
    outputs: {
      equation: { label: "Equation", unit: "1" },
      yAtZero: { label: "y at x = 0", unit: "math units" },
      yAtOne: { label: "y at x = 1", unit: "math units" },
      rise: { label: "Rise", unit: "1" },
      run: { label: "Run", unit: "1" },
    },
  },
  town: {
    name: "Town Routine",
    group: "3D spatial scene",
    instruction: "Follow the residents through their daily routine.",
    ref: "compositions/TownExperiment",
    target: "session",
    controls: {
      time: {
        label: "Time",
        action: "SET_TIME",
        parameter: "time",
        unit: "hour",
        min: 0,
        max: 24,
        step: 0.25,
        widget: "slider",
        slot: "primary",
      },
      speed: {
        label: "Speed",
        action: "SET_SPEED",
        parameter: "speed",
        unit: "×",
        widget: "select",
        choices: [1, 2, 4],
        slot: "primary",
      },
      playing,
      closeRoad: {
        label: "Close road",
        action: "CLOSE_ROAD",
        unit: "",
        widget: "button",
        slot: "primary",
      },
      openRoad: {
        label: "Open road",
        action: "OPEN_ROAD",
        unit: "",
        widget: "button",
        slot: "details",
      },
      reset,
    },
    outputs: {
      time: { label: "Time", unit: "hour" },
      traveling: { label: "Residents traveling", unit: "" },
    },
  },
};
export function templateRecipe(id: TemplateId): Recipe {
  const recipe: Recipe = {
    schemaVersion: 1,
    composition: { ref: templates[id].ref, version: 1 },
    parameters: {},
  };
  if (id === "line") {
    const provider = modelProvider("prefabs/math-foundations/Line");
    const observations = provider.requiredObservations.map((output) => ({
      id: `observe-${output}`,
      instance: "line/main",
      output,
      unit: provider.outputs[output].unit,
    }));
    recipe.assembly = {
      version: 1,
      title: "Line slope",
      learningGoal: templates.line.instruction,
      instances: [
        {
          id: "line/main",
          label: "Line",
          prefab: { ref: provider.ref, version: 1 },
          parameters: { ...provider.defaults },
        },
      ],
      observations,
      connections: observations.map((o) => ({
        type: "observation-source",
        from: { instance: o.instance, output: o.output },
        to: o.id,
      })),
      controls: Object.keys(provider.actions).map((action) => ({
        instance: "line/main",
        action,
      })),
      views: [
        {
          ref: "views/AssemblyScene",
          observations: observations.map((o) => o.id),
        },
      ],
    };
  }
  return recipe;
}
