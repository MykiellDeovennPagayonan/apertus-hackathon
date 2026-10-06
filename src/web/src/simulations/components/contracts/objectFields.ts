import { num, object } from "../../runtime/parameterSchema";
export const string = { type: "string", maxLength: 100 } as const;
export const optionalText = { ...string, minLength: 0 };
export const color = { type: "string", maxLength: 7 } as const;
export const position = num(-100, 100);
export const point = object({ x: num(-1000, 1000), y: num(-1000, 1000) });
export const base = { id: string, label: string, color };

export const displaySchema = object({
  x: num(-100, 100),
  y: num(-100, 100),
  width: num(5, 100),
  height: num(5, 100),
});
