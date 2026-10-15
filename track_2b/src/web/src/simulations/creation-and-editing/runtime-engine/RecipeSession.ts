import type { GenerationRequest } from "../input/contracts";
import type { Coverage, GenerationResult } from "../input/results";
import { parseGenerationResult } from "../input/results";
import { publicDefinition } from "../../registry/index";
import type { CompositeRecipe } from "../authoring-engine/document";
import { loadRecipe } from "./loadRecipe";
import { parseRecipe } from "../validator/parseRecipe";
import { serializeRecipe } from "../authoring-engine/serializeRecipe";

/** One learner clock; follow-ups capture settings without animation checkpoints. */
export class RecipeSession {
  readonly sessionId: string;
  authoredRevision = 0;
  interactionRevision = 0;
  requestId: string | null;
  coverage: Coverage | null;
  recipe: CompositeRecipe;
  readonly runtime: ReturnType<typeof loadRecipe>["runtime"];
  private frame = 0;
  private unsubscribe: () => void;
  private history: {
    recipe: CompositeRecipe;
    coverage: Coverage | null;
    requestId: string | null;
  }[] = [];
  private redoHistory: typeof this.history = [];
  private listeners = new Set<() => void>();
  animationEnabled = false;
  constructor(
    source: unknown,
    provenance?: { requestId: string; coverage: Coverage },
    sessionId = `recipe-${globalThis.crypto.randomUUID()}`,
  ) {
    const candidate = loadRecipe(source);
    if (
      !candidate.document.nodes.length ||
      !candidate.document.lesson.title.trim() ||
      !candidate.document.lesson.instruction.trim()
    )
      throw new Error("A learner recipe needs content, title and instructions");
    this.recipe = candidate.recipe;
    this.runtime = candidate.runtime;
    this.sessionId = sessionId;
    this.requestId = provenance?.requestId ?? null;
    this.coverage = provenance?.coverage ?? null;
    this.unsubscribe = this.runtime.subscribeInteractions(() => {
      this.interactionRevision++;
      this.publish();
    });
  }
  get document() {
    return this.runtime.document;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish() {
    for (const listener of this.listeners) listener();
  }
  start() {
    if (
      typeof requestAnimationFrame === "undefined" ||
      this.frame ||
      !this.document.nodes.some((n) => publicDefinition(n).lifecycle.clock)
    )
      return;
    let previous: number | undefined;
    const tick = (now: number) => {
      const reduced =
        typeof matchMedia !== "undefined" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (previous !== undefined && (!reduced || this.animationEnabled))
        this.runtime.step(Math.min(0.1, Math.max(0, (now - previous) / 1000)));
      previous = now;
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  setAnimation = (enabled: boolean) => {
    this.animationEnabled = enabled;
    this.publish();
  };
  advanceTime = (delta: number) => {
    if (!Number.isFinite(delta) || delta <= 0 || delta > 1)
      return {
        accepted: false as const,
        error: "Choose a timestep from zero to one second.",
      };
    this.runtime.step(delta);
    return { accepted: true as const };
  };
  acceptUpdate(
    result: Extract<GenerationResult, { status: "created" | "updated" }>,
  ) {
    if (
      result.status !== "updated" ||
      result.expectedSessionId !== this.sessionId ||
      result.expectedAuthoredRevision !== this.authoredRevision ||
      (result.expectedInteractionRevision !== undefined &&
        result.expectedInteractionRevision !== this.interactionRevision)
    )
      throw new Error(
        "This lesson changed while the request was running. Submit the change again.",
      );
    const candidate = loadRecipe(result.recipe); // Prepare before altering the active runtime.
    if (JSON.stringify(candidate.document) === JSON.stringify(this.document)) {
      this.requestId = result.requestId;
      this.publish();
      return;
    }
    this.runtime.updateDocument(candidate.document);
    this.history.push(this.checkpoint());
    if (this.history.length > 20) this.history.shift();
    this.redoHistory = [];
    this.recipe = candidate.recipe;
    if (result.coverage) this.coverage = structuredClone(result.coverage);
    this.requestId = result.requestId;
    this.authoredRevision++;
    this.publish();
    this.start();
  }
  private checkpoint() {
    return structuredClone({
      recipe: this.recipe,
      coverage: this.coverage,
      requestId: this.requestId,
    });
  }
  undo() {
    const previous = this.history.at(-1);
    if (!previous) return false;
    try {
      this.runtime.updateDocument(previous.recipe.document);
      this.history.pop();
      this.redoHistory.push(this.checkpoint());
      this.recipe = previous.recipe;
      this.coverage = previous.coverage;
      this.requestId = previous.requestId;
      this.authoredRevision++;
      this.publish();
      return true;
    } catch {
      return false;
    }
  }
  redo() {
    const next = this.redoHistory.at(-1);
    if (!next) return false;
    try {
      this.runtime.updateDocument(next.recipe.document);
      this.redoHistory.pop();
      this.history.push(this.checkpoint());
      this.recipe = next.recipe;
      this.coverage = next.coverage;
      this.requestId = next.requestId;
      this.authoredRevision++;
      this.publish();
      return true;
    } catch {
      return false;
    }
  }
  get canUndo() {
    return this.history.length > 0;
  }
  get canRedo() {
    return this.redoHistory.length > 0;
  }
  serialize() {
    return serializeRecipe(this.recipe, this.document);
  }
  requestContext(): GenerationRequest["active"] {
    const snapshot = this.runtime.getSnapshot();
    const compact = (value: unknown, depth = 0): unknown => {
      if (depth > 3) return undefined;
      if (
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        (typeof value === "string" && value.length <= 500)
      )
        return value;
      if (Array.isArray(value))
        return value.length <= 8
          ? value
              .map((v) => compact(v, depth + 1))
              .filter((v) => v !== undefined)
          : undefined;
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value)
            .filter(
              ([key]) =>
                !["tokens", "joints", "members", "responses"].includes(key),
            )
            .map(([key, v]) => [key, compact(v, depth + 1)])
            .filter(([, v]) => v !== undefined),
        );
      return undefined;
    };
    const runtimeContext = Object.fromEntries(
      [...this.document.nodes, ...this.document.resources].map((n) => [
        n.id,
        compact(snapshot.state[n.id]) ?? {},
      ]),
    );
    return {
      sessionId: this.sessionId,
      authoredRevision: this.authoredRevision,
      interactionRevision: this.interactionRevision,
      recipe: parseRecipe(serializeRecipe(this.recipe, this.runtime.capture())),
      runtimeContext,
    };
  }
  snapshot() {
    return structuredClone({
      requestId: this.requestId,
      sessionId: this.sessionId,
      authoredRevision: this.authoredRevision,
      interactionRevision: this.interactionRevision,
      recipe: parseRecipe(this.serialize()),
      coverage: this.coverage,
      state: this.runtime.getSnapshot(),
    });
  }
  dispose() {
    this.runtime.dispose();
    if (typeof cancelAnimationFrame !== "undefined")
      cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.unsubscribe();
    this.listeners.clear();
  }
}
let current: RecipeSession | null = null;
export const getRecipeSession = () => current;
export function disposeRecipeSession() {
  current?.dispose();
  current = null;
}
export function activateRecipeSession(
  source: unknown,
  provenance?: { requestId: string; coverage: Coverage },
  beforeCreate?: () => void,
) {
  const candidate = new RecipeSession(source, provenance);
  beforeCreate?.();
  disposeRecipeSession();
  current = candidate;
  candidate.start();
  return candidate;
}
export function acceptGenerationResult(
  source: GenerationResult,
  request: GenerationRequest,
  beforeCreate?: () => void,
) {
  const result = parseGenerationResult(source, request);
  if (result.status === "created") {
    const candidate = new RecipeSession(result.recipe, {
      requestId: result.requestId,
      coverage: result.coverage,
    });
    beforeCreate?.();
    disposeRecipeSession();
    current = candidate;
    candidate.start();
    return candidate;
  }
  if (!current) throw new Error("No active recipe session");
  if (result.status === "updated") {
    current.acceptUpdate(result);
    return current;
  }
  if (result.status === "runtime_action") {
    if (
      result.expectedSessionId !== current.sessionId ||
      result.expectedInteractionRevision !== current.interactionRevision ||
      request.active?.authoredRevision !== current.authoredRevision
    )
      throw new Error(
        "The lesson changed during the request. Submit the action again.",
      );
    const accepted = current.runtime.dispatch(result.commands);
    if (!accepted.accepted) throw new Error(accepted.error);
    current.requestId = result.requestId;
    return current;
  }
  throw new Error("This result has no lesson to activate");
}
