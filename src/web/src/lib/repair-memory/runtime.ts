import { randomUUID } from "node:crypto";
import type { TraceSink } from "../../simulations/creation-and-editing/budget";
import type { JsonSchema } from "../../simulations/creation-and-editing/input/inference/structuredSchema";
import {
  classifyIssue,
  contractKey,
  MEMORY_REVISION,
} from "../../simulations/creation-and-editing/memory/context";
import type {
  MemoryContext,
  MemoryMode,
  RepairEpisode,
  RepairLesson,
  RequestMemory,
  StageMemory,
} from "../../simulations/creation-and-editing/memory/contracts";
import { accountScope, memoryMode } from "./config";
import { embed } from "./embeddings";
import { lookupLessons, saveEpisodes } from "./postgres";

type Dependencies = {
  embed: typeof embed;
  lookup: typeof lookupLessons;
  save: typeof saveEpisodes;
};

export class RepairMemory implements RequestMemory {
  private readonly occurrence = randomUUID();
  private readonly episodes: RepairEpisode[] = [];
  private readonly cache = new Map<string, Promise<RepairLesson[]>>();
  private lookupMs = 750;
  private readonly reported = new Set<string>();
  private finished = false;
  constructor(
    private readonly scope: string | null,
    private readonly mode: Exclude<MemoryMode, "off">,
    private readonly trace?: TraceSink,
    private readonly dependencies: Dependencies = {
      embed,
      lookup: lookupLessons,
      save: saveEpisodes,
    },
  ) {
    if (scope) accountScope(scope);
  }

  private report(event: string, data: Record<string, unknown>) {
    this.trace?.(event, data);
    if (!this.reported.has(event)) {
      this.reported.add(event);
      console.warn(`repair_memory: ${event}`);
    }
  }

  begin(
    stage: string | undefined,
    schema: JsonSchema | undefined,
    model: string,
    context?: MemoryContext,
  ): StageMemory | undefined {
    if (
      this.finished ||
      !stage ||
      !schema ||
      (![
        "edit_arguments",
        "assembly_setting_value",
        "configure_selected_recipe",
        "authoring_arguments",
        "runtime_command_arguments",
        "compatible_additions",
      ].includes(stage) &&
        !/^turn_\d+$/.test(stage))
    )
      return;
    const stableStage = /^turn_\d+$/.test(stage)
      ? "authoring_arguments"
      : stage;
    const projection = context ?? { tools: [], revision: MEMORY_REVISION };
    if (
      JSON.stringify(schema).length > 8000 ||
      JSON.stringify(projection).length > 2000
    )
      return;
    if (this.episodes.length >= 8) {
      const ordinary = this.episodes.findIndex(
        (episode) =>
          episode.attempts.at(-1)?.accepted &&
          !episode.usedLessons.length &&
          !episode.attempts.some((attempt) => attempt.issue),
      );
      if (ordinary < 0) return;
      this.episodes.splice(ordinary, 1);
    }
    const episode: RepairEpisode = {
      id: randomUUID(),
      occurrence: this.occurrence,
      scope: this.scope ?? "",
      stage: stableStage,
      contract: contractKey(schema, projection),
      model,
      context: structuredClone(projection),
      schema: structuredClone(schema),
      attempts: [],
      usedLessons: [],
      complete: true,
      outcome: "failed",
    };
    this.episodes.push(episode);
    const record = (
      content: string,
      accepted: boolean,
      phase?: "schema" | "semantic",
      message?: string,
      details?: Record<string, unknown>,
      semanticChecked = false,
    ) => {
      if (episode.attempts.length >= 8) {
        episode.complete = false;
        return;
      }
      if (content.includes("\0")) {
        content = content.replaceAll("\0", "\ufffd");
        episode.complete = false;
      }
      if (Buffer.byteLength(content) > 6000) {
        episode.complete = false;
        content = Buffer.from(content).subarray(0, 6000).toString("utf8");
      }
      const attempt = {
        content,
        accepted,
        semanticChecked,
        ...(phase
          ? {
              issue: classifyIssue(
                episode,
                phase,
                message ?? "Invalid response",
                details,
              ),
            }
          : {}),
      };
      episode.attempts.push(attempt);
      if (Buffer.byteLength(JSON.stringify(episode)) > 22000) {
        episode.attempts.pop();
        episode.complete = false;
      }
    };
    let retrieved: RepairLesson[] = [];
    return {
      injected: () => {
        for (const lesson of retrieved) {
          if (
            !episode.usedLessons.some(
              (item) =>
                item.id === lesson.id && item.revision === lesson.revision,
            )
          )
            episode.usedLessons.push({
              id: lesson.id,
              revision: lesson.revision,
            });
        }
        this.trace?.("memory.injected", {
          stage: stableStage,
          lessons: retrieved.map((lesson) => ({
            id: lesson.id,
            revision: lesson.revision,
          })),
        });
      },
      reject: (content, phase, message, details) =>
        record(content, false, phase, message, details),
      accept: (content, semanticChecked) =>
        record(content, true, undefined, undefined, undefined, semanticChecked),
      guidance: async (signal, preventive = false) => {
        if (
          this.mode === "record" ||
          (preventive && this.mode !== "prevent") ||
          signal.aborted
        )
          return "";
        const issue = episode.attempts.at(-1)?.issue;
        if (!preventive && !issue) return "";
        const key = `${stableStage}:${episode.contract}:${preventive ? "prevent" : issue?.family}`;
        let pending = this.cache.get(key);
        if (!pending && this.lookupMs > 250) {
          const allowance = this.lookupMs;
          const started = Date.now();
          const bounded = AbortSignal.any([
            signal,
            // Reserve acquisition/query time within the total memory allowance.
            AbortSignal.timeout(allowance - 250),
          ]);
          pending = (async () => {
            try {
              const vector = await this.dependencies.embed(
                `Stage ${stableStage}. Tools ${projection.tools.join(", ")}. ${preventive ? "Known argument formatting corrections" : `Issue ${issue?.code} at ${issue?.path}`}. Return concrete values matching the accepted contract.`,
                bounded,
              );
              bounded.throwIfAborted();
              const lessons = await this.dependencies.lookup(
                this.scope,
                stableStage,
                episode.contract,
                preventive ? null : (issue?.family ?? null),
                vector,
                preventive,
              );
              bounded.throwIfAborted();
              return lessons;
            } catch {
              this.report("memory.lookup_skipped", { stage: stableStage });
              return [];
            } finally {
              this.lookupMs = Math.max(
                0,
                this.lookupMs - (Date.now() - started),
              );
            }
          })();
          this.cache.set(key, pending);
        }
        const lessons = await (pending ?? Promise.resolve([]));
        retrieved = lessons;
        this.trace?.("memory.retrieved", {
          stage: stableStage,
          preventive,
          lessons: lessons.map((lesson) => ({
            id: lesson.id,
            revision: lesson.revision,
          })),
        });
        return lessons
          .map((lesson) => lesson.guidance)
          .join("\n")
          .slice(0, 1200);
      },
    };
  }

  async finish(outcome: string): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    if (!this.scope) return;
    const episodes = this.episodes
      .filter(
        (episode) =>
          episode.attempts.some((attempt) => attempt.issue) ||
          episode.usedLessons.length,
      )
      .map((episode) => ({ ...episode, outcome }));
    if (!episodes.length) return;
    try {
      await this.dependencies.save(episodes);
    } catch {
      this.report("memory.flush_skipped", { episodes: episodes.length });
    }
  }
}

export async function createRequestMemory(
  trace?: TraceSink,
): Promise<RequestMemory | undefined> {
  try {
    const mode = memoryMode();
    if (mode === "off") return;
    // Resolve identity only at the HTTP/server boundary, never from generation input.
    const { getLibrarySession } = await import("../auth/server");
    const scope = await memoryScope(getLibrarySession());
    return new RepairMemory(scope, mode, trace);
  } catch {
    trace?.("memory.unavailable", {});
    console.warn("repair_memory: unavailable");
    return;
  }
}

export async function memoryScope(
  session: Promise<{ user: { id: string } } | null>,
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const resolved = await Promise.race([
      session,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Memory identity lookup timed out")),
          250,
        );
      }),
    ]);
    if (!resolved?.user.id) return null;
    const scope = `account:${resolved.user.id}`;
    accountScope(scope);
    return scope;
  } finally {
    clearTimeout(timer);
  }
}
