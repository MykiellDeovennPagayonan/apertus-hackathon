import type { AuthoredDocument } from "../../simulations/runtime/authoring/types";
import { validateAuthoredDocument } from "../../simulations/runtime/authoring/validate";
import { exactKeys, identity, record, revision } from "./schema";

export const STREAM_FRAME_BYTE_LIMIT = 2_200_000;
export const STREAM_BYTE_LIMIT = 64_000_000;
export const CONSTRUCTION_EVENT_LIMIT = 256;
export const constructionPhases = {
  components: "Adding components…",
  connections: "Connecting components…",
  arrangement: "Arranging the experiment…",
  checking: "Checking the experiment…",
} as const;
export type ConstructionPhase = keyof typeof constructionPhases;
export type ConstructionUpdate = {
  type: "construction";
  requestId: string;
  sequence: number;
  draftRevision: number;
  phase: ConstructionPhase;
  document: AuthoredDocument;
  affected: { nodes: string[]; connections: string[] };
  activity: string;
};
export type ConstructionSink = (
  update: ConstructionUpdate,
  signal: AbortSignal,
) => Promise<void>;

/** Structural validation deliberately permits unfinished required inputs. */
export function parseConstructionUpdate(value: unknown): ConstructionUpdate {
  record(value);
  exactKeys(value, [
    "type",
    "requestId",
    "sequence",
    "draftRevision",
    "phase",
    "document",
    "affected",
    "activity",
  ]);
  if (value.type !== "construction")
    throw new Error("Invalid construction event");
  identity(value.requestId);
  revision(value.sequence);
  revision(value.draftRevision);
  if (!value.sequence || Number(value.sequence) > CONSTRUCTION_EVENT_LIMIT)
    throw new Error("Construction sequence exceeds bounds");
  if (
    typeof value.phase !== "string" ||
    !Object.hasOwn(constructionPhases, value.phase)
  )
    throw new Error("Invalid construction phase");
  if (
    typeof value.activity !== "string" ||
    !value.activity.trim() ||
    value.activity.length > 160
  )
    throw new Error("Invalid construction activity");
  record(value.affected);
  exactKeys(value.affected, ["nodes", "connections"]);
  validateAuthoredDocument(value.document);
  const document = value.document;
  for (const key of ["nodes", "connections"] as const) {
    const ids = value.affected[key];
    const known = new Set(
      key === "nodes"
        ? [...document.nodes, ...document.resources].map((n) => n.id)
        : document.connections.map((c) => c.id),
    );
    if (
      !Array.isArray(ids) ||
      ids.length > 1024 ||
      ids.some((id) => typeof id !== "string" || !known.has(id)) ||
      new Set(ids).size !== ids.length
    )
      throw new Error("Invalid construction affected identities");
  }
  return structuredClone(value) as ConstructionUpdate;
}
