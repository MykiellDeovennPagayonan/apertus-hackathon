import {
  num,
  object,
  type ParameterSchema,
} from "../parameterSchema";
export type ActionSpec = {
  label: string;
  schema: ParameterSchema;
  defaults: { factor?: number };
};
export const actionSpecs = {
  subdivide: {
    label: "Subdivide",
    schema: object({ factor: num(2, 12, "", true) }),
    defaults: { factor: 2 },
  },
  reset: { label: "Reset", schema: object({}), defaults: {} },
};
