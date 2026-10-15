import type { CreationArguments } from "../composer/recipeArguments";

/** Check explicit numeric clauses in the verified teaching vocabulary. Interpretation
 * still belongs to Apertus; these checks prevent recognized quantities being lost or
 * swapped and never select a recipe or fill an omitted override. */
export function verifyExplicitQuantities(
  prompt: string,
  slug: string,
  arguments_: CreationArguments,
) {
  const number = "([0-9]+(?:\\.[0-9]+)?)";
  const same = (actual: unknown, expected: number, field: string) => {
    if (
      typeof actual !== "number" ||
      Math.abs(actual - expected) > Math.max(1, Math.abs(expected)) * 1e-10
    )
      throw new Error(
        `${field}: preserve the explicit quantity ${expected} from the original request`,
      );
  };
  const first = arguments_.instances[0];
  if (slug === "arithmetic") {
    const task = first.overrides.task as
      | { operation?: string; a?: number; b?: number }
      | undefined;
    const a = prompt.match(
      new RegExp(
        `\\b(?:start(?:ing)? (?:with|at)|first number (?:is|to|at))\\s+${number}`,
        "i",
      ),
    );
    const b = prompt.match(
      new RegExp(`\\b(add|subtract|take away)\\s+${number}`, "i"),
    );
    if (a) same(task?.a, Number(a[1]), "task.a");
    if (b) {
      same(task?.b, Number(b[2]), "task.b");
      if (
        task?.operation !== (b[1].toLowerCase() === "add" ? "add" : "subtract")
      )
        throw new Error(
          "task.operation: preserve the requested arithmetic operation",
        );
    }
    if (
      /\b(?:wait|press|click|tap)\b/i.test(prompt) &&
      first.overrides.looping === true
    )
      throw new Error(
        "looping: this request requires a learner-controlled activity",
      );
  }
  if (slug === "area-perimeter") {
    const factors: Record<string, number> = {
      m: 1,
      metre: 1,
      metres: 1,
      meter: 1,
      meters: 1,
      cm: 0.01,
      centimetre: 0.01,
      centimetres: 0.01,
      centimeter: 0.01,
      centimeters: 0.01,
      mm: 0.001,
      millimetre: 0.001,
      millimetres: 0.001,
      millimeter: 0.001,
      millimeters: 0.001,
      km: 1000,
      kilometre: 1000,
      kilometres: 1000,
      kilometer: 1000,
      kilometers: 1000,
      ft: 0.3048,
      feet: 0.3048,
      foot: 0.3048,
    };
    const dimension = new RegExp(
      `${number}\\s*(${Object.keys(factors)
        .sort((a, b) => b.length - a.length)
        .join("|")})\\b\\s+(wide|high|tall)`,
      "gi",
    );
    const mentions = [...prompt.matchAll(dimension)];
    const markers = [...prompt.matchAll(/\b([A-Z])\s+(?:is|starts?|has)\b/g)];
    for (const match of mentions) {
      const marker = markers
        .filter((m) => (m.index ?? 0) < (match.index ?? 0))
        .at(-1);
      const instance = marker
        ? arguments_.instances.find((i) => i.alias === marker[1])
        : arguments_.instances.length === 1
          ? first
          : undefined;
      if (!instance)
        throw new Error("Preserve explicit rectangle instance identities");
      const field = match[3].toLowerCase() === "wide" ? "width" : "height";
      same(
        instance.overrides[field],
        Number(match[1]) * factors[match[2].toLowerCase()],
        `${instance.alias}.${field} (metres)`,
      );
    }
    if (
      /\b(?:start|initially)\b[^.!?]*\bsame perimeter\b/i.test(prompt) &&
      arguments_.instances.length > 1
    ) {
      const perimeters = arguments_.instances.map(
        (i) => 2 * (Number(i.overrides.width) + Number(i.overrides.height)),
      );
      if (
        perimeters.some((value) => !Number.isFinite(value)) ||
        perimeters.some((value) => Math.abs(value - perimeters[0]) > 1e-10)
      )
        throw new Error("Preserve the initial equal-perimeter constraint");
    }
  }
  if (slug === "bridge") {
    const load = prompt.match(
      new RegExp(
        `${number}[ -]*(tonnes?|tons?|t|kilograms?|kg)\\b(?:[- ]+load)?`,
        "i",
      ),
    );
    if (load) {
      const requested =
        Number(load[1]) * (/^(?:kg|kilogram)/i.test(load[2]) ? 0.001 : 1);
      const expected = Math.min(30, Math.max(2, requested));
      same(first.overrides.magnitude, expected, "load.magnitude (tonnes)");
    }
    if (/\b(?:start|initially)\b[^.!?]*\bhalfway\b/i.test(prompt))
      same(first.overrides.position, 0.5, "load.position");
    const position = prompt.match(
      /\b(?:start|initially)\b[^.!?]*?\b([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:across|along)/i,
    );
    if (position) {
      const requested = Number(position[1]) / 100;
      const expected = Math.min(0.95, Math.max(0.05, requested));
      same(first.overrides.position, expected, "load.position");
    }
  }
}
