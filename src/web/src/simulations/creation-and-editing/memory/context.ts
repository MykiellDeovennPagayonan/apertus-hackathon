import { createHash } from "node:crypto";
import type {
  CorrectionKind,
  MemoryContext,
  MemoryIssue,
  RepairEpisode,
} from "./contracts";

// Bump when validation or evidence semantics change without a schema change.
export const MEMORY_REVISION = "composer-repair-v2";
export const GUIDANCE: Record<CorrectionKind, string> = {
  flat_arguments:
    "Return the current stage's argument object directly using the current responseSchema keys. Do not add an extra operation or schema envelope around those keys. The application owns operation and target envelopes.",
  evaluated_numbers:
    "For fields whose current contract requires a number, return an evaluated JSON number. Do not return arithmetic expressions or numeric strings. Preserve the requested quantity and current units.",
};

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
export const fingerprint = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");

export function contractKey(
  schema: Record<string, unknown>,
  context: MemoryContext,
): string {
  const fields = context.fields ?? {};
  const properties = (schema.properties ?? {}) as Record<string, unknown>;
  // Preserve schemas and semantic field identities, but exclude generated wire IDs.
  const shape = Object.entries(properties)
    .map(([key, value]) => ({
      field: fields[key] ?? key,
      schema: value,
      required:
        (schema.required as string[] | undefined)?.includes(key) ?? false,
    }))
    .sort((a, b) => canonical(a).localeCompare(canonical(b)));
  const { properties: _properties, required: _required, ...rest } = schema;
  return fingerprint({
    revision: MEMORY_REVISION,
    contextRevision: context.revision,
    tools: [...context.tools].sort(),
    shape,
    rest,
  });
}

export function classifyIssue(
  episode: RepairEpisode,
  phase: "schema" | "semantic",
  message: string,
  details?: Record<string, unknown>,
): MemoryIssue {
  const known =
    typeof details?.code === "string" ? details.code.split(":")[0] : "";
  const code =
    known ||
    (/JSON|Unexpected token|Unterminated|nesting|trailing/i.test(message)
      ? "invalid_json"
      : /unknown field/i.test(message)
        ? "unknown_field"
        : /expected (number|integer)|Invalid value/i.test(message)
          ? "invalid_value"
          : phase === "schema"
            ? "invalid_schema"
            : "invalid_semantics");
  let path = typeof details?.path === "string" ? details.path : "$";
  path = path
    .split(".")
    .map((segment) => episode.context.fields?.[segment] ?? segment)
    .join(".");
  path = path.replace(/\[\d+\]/g, "[]").slice(0, 200);
  return {
    code,
    phase,
    path,
    message: message.slice(0, 600),
    family: fingerprint({
      revision: MEMORY_REVISION,
      stage: episode.stage,
      contract: episode.contract,
      code,
      path,
    }),
  };
}

function object(content: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(content);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

export type VerifiedCorrection = {
  kind: CorrectionKind;
  family: string;
  key: string;
  proof: {
    code: string;
    phase: string;
    correction: CorrectionKind;
    revision: string;
  };
};

export function verifiedCorrections(
  episode: RepairEpisode,
): VerifiedCorrection[] {
  // shortcut: only envelope and exact numeric-string repairs are provable; add a verifier before learning semantic corrections.
  if (
    !episode.complete ||
    !episode.scope.startsWith("account:") ||
    !["created", "updated", "runtime_action"].includes(episode.outcome)
  )
    return [];
  const accepted = episode.attempts.at(-1);
  if (!accepted?.accepted) return [];
  const value = object(accepted.content);
  const properties = episode.schema.properties as
    | Record<string, { type?: string }>
    | undefined;
  if (!value || !properties || episode.schema.additionalProperties !== false)
    return [];
  if (
    Object.keys(value).some((key) => !Object.hasOwn(properties, key)) ||
    ((episode.schema.required ?? []) as string[]).some(
      (key) => !Object.hasOwn(value, key),
    )
  )
    return [];
  const result: VerifiedCorrection[] = [];
  for (const attempt of episode.attempts) {
    if (!attempt.issue || attempt.accepted || attempt.issue.phase !== "schema")
      continue;
    const rejected = object(attempt.content);
    if (!rejected) continue;
    let kind: CorrectionKind | undefined;
    const keys = Object.keys(rejected);
    const wrapper = keys[0];
    if (
      keys.length === 1 &&
      ["operations", "arguments", "changes", "schema"].includes(wrapper) &&
      !Object.hasOwn(properties, wrapper) &&
      canonical(rejected[wrapper]) === canonical(value)
    )
      kind = "flat_arguments";
    const numeric = Object.entries(properties).filter(([, schema]) =>
      ["number", "integer"].includes(schema.type ?? ""),
    );
    // Verify an unchanged numeric string's value, never infer arithmetic or intent.
    if (
      !kind &&
      Object.keys(rejected).length === Object.keys(value).length &&
      Object.keys(value).every((key) => Object.hasOwn(rejected, key))
    ) {
      const changed = Object.keys(value).filter(
        (key) => canonical(value[key]) !== canonical(rejected[key]),
      );
      if (
        changed.length &&
        changed.every(
          (key) =>
            numeric.some(([field]) => field === key) &&
            typeof rejected[key] === "string" &&
            /^-?\d+(?:\.\d+)?$/.test(rejected[key] as string) &&
            typeof value[key] === "number" &&
            Number(rejected[key]) === value[key],
        )
      )
        kind = "evaluated_numbers";
    }
    if (!kind) continue;
    const key = fingerprint({
      revision: MEMORY_REVISION,
      stage: episode.stage,
      contract: episode.contract,
      family: attempt.issue.family,
      kind,
    });
    if (!result.some((entry) => entry.key === key))
      result.push({
        kind,
        family: attempt.issue.family,
        key,
        proof: {
          code: attempt.issue.code,
          phase: attempt.issue.phase,
          correction: kind,
          revision: MEMORY_REVISION,
        },
      });
    if (result.length === 2) break;
  }
  return result;
}
