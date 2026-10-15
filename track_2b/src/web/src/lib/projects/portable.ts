import { ProjectError } from "./types";
/** Community export wrapper keeps attribution alongside a runtime-native payload. */
export function unwrapPortable(input: unknown): {
  payload: unknown;
  publicationId?: string;
} {
  if (input && typeof input === "object" && "apertusExportVersion" in input) {
    const value = input as Record<string, unknown>;
    if (
      value.apertusExportVersion !== 1 ||
      !value.payload ||
      typeof value.publicationId !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.publicationId)
    )
      throw new ProjectError("Unsupported or invalid community export.");
    return { payload: value.payload, publicationId: value.publicationId };
  }
  return { payload: input };
}
