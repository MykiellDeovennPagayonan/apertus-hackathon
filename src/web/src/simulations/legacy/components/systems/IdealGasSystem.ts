import { validateValue } from "../../../registry/contracts/parameterSchema";
import {
  type GasMetrics,
  type GasState,
  gasInputSchema,
} from "../traits/GasState";
/** The single validated conversion boundary: mmol → mol, L → m³, Pa → kPa. */
export function IdealGasSystem(inputs: GasState): GasMetrics {
  validateValue(gasInputSchema, inputs, "gas");
  const pressurePa =
    ((inputs.amount / 1000) * 8.314462618 * inputs.temperature) /
    (inputs.volume / 1000);
  return { pressurePa, pressureKPa: pressurePa / 1000 };
}
