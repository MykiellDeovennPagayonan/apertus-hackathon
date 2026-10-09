import { publicDefinition } from "../../components/catalog";
import { eclipseGeometry } from "../../components/systems/exploration/eclipse";
import {
  type SignalSample,
  sampleSignal,
  sumSignals,
} from "../../components/systems/exploration/signals";
import { validateValue } from "../parameterSchema";
import type { RuntimeProvider } from "./providers";

function numberParameter(state: Record<string, unknown>, key: string) {
  const value = state[key];
  if (typeof value !== "number") throw new Error(`${key} must be a number`);
  return value;
}
function signalSamples(value: unknown): SignalSample[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 512)
    throw new Error("A signal must contain 2–512 samples");
  return value.map((sample) => {
    if (
      !sample ||
      typeof sample !== "object" ||
      typeof sample.x !== "number" ||
      typeof sample.y !== "number"
    )
      throw new Error("Signal samples require numeric time and pressure");
    return { x: sample.x, y: sample.y };
  });
}
function configurable(
  id: string,
  measure: (s: Record<string, unknown>) => Record<string, unknown>,
): RuntimeProvider {
  return {
    initialize: (n) => {
      measure(n.configuration);
      return structuredClone(n.configuration);
    },
    apply: (s, command, args) => {
      if (!command.startsWith("set:"))
        throw new Error("Unsupported model command");
      const next = { ...s, [command.slice(4)]: args.value };
      validateValue(publicDefinition(id).configuration, next);
      measure(next);
      return next;
    },
    measure,
    capture: (s) => s,
  };
}
export const explorationProviders = new Map<string, RuntimeProvider>([
  [
    "models/SinusoidalSignal",
    configurable("models/SinusoidalSignal", (s) => ({
      points: sampleSignal({
        amplitude: numberParameter(s, "amplitude"),
        frequency: numberParameter(s, "frequency"),
        phase: numberParameter(s, "phase"),
        duration: numberParameter(s, "duration"),
      }),
    })),
  ],
  [
    "models/EclipseGeometry",
    configurable("models/EclipseGeometry", (s) => {
      const geometry = eclipseGeometry({
        moonAngle: numberParameter(s, "moonAngle"),
        moonOffset: numberParameter(s, "moonOffset"),
        moonDistance: numberParameter(s, "moonDistance"),
      });
      return { geometry, event: geometry.event };
    }),
  ],
  [
    "data/SignalSuperposition",
    {
      initialize: () => ({}),
      apply: () => {
        throw new Error("Superposition is controlled through its sources");
      },
      synchronize: (_s, inputs) =>
        inputs.first?.length && inputs.second?.length
          ? sumSignals(
              signalSamples(inputs.first[0]),
              signalSamples(inputs.second[0]),
            )
          : {},
      measure: (s) => s,
    },
  ],
]);
