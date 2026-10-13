import { object, type ParameterSchema } from "../contracts/parameterSchema";
import type { PublicDefinition } from "../contracts/publicDefinition";
export const text: ParameterSchema = {
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
