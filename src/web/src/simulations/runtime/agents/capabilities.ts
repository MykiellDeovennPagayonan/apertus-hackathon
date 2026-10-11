import { type ParameterSchema, validateValue } from "../parameterSchema";
import { AgentError } from "./contracts";

export interface KnowledgeItem {
  id: string;
  text: string;
  audience: "public" | string[];
}
export interface RetrievalAdapter {
  retrieve(query: string, actor: string, limit: number): KnowledgeItem[];
}
export class DatasetRetrieval implements RetrievalAdapter {
  constructor(private items: readonly KnowledgeItem[]) {
    if (items.length > 1000 || items.some((item) => item.text.length > 4000))
      throw new AgentError("Knowledge dataset exceeds bounds.");
  }
  retrieve(query: string, actor: string, limit: number) {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 8 ||
      query.length > 400
    )
      throw new AgentError("Invalid retrieval bounds.");
    const terms = new Set(
      query
        .toLocaleLowerCase()
        .split(/\W+/u)
        .filter((term) => term.length > 2),
    );
    return this.items
      .filter(
        (item) => item.audience === "public" || item.audience.includes(actor),
      )
      .map((item) => ({
        item,
        score: [...terms].filter((term) =>
          item.text.toLocaleLowerCase().includes(term),
        ).length,
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
      .slice(0, limit)
      .map((result) => structuredClone(result.item));
  }
}
export interface ReadOnlyTool {
  id: string;
  arguments: ParameterSchema;
  execute(
    args: Record<string, unknown>,
    actor: string,
    signal: AbortSignal,
  ): Promise<unknown>;
}
/** Only trusted registered read-only implementations. Effectful tools need a separate outbox contract. */
export class AgentToolRegistry {
  private tools = new Map<string, ReadOnlyTool>();
  register(tool: ReadOnlyTool) {
    if (this.tools.has(tool.id))
      throw new AgentError("Duplicate tool registration.");
    this.tools.set(tool.id, tool);
  }
  async execute(
    id: string,
    args: Record<string, unknown>,
    actor: string,
    allowed: readonly string[],
    signal: AbortSignal,
  ) {
    if (!allowed.includes(id))
      throw new AgentError("Tool capability denied.", 403);
    const tool = this.tools.get(id);
    if (!tool) throw new AgentError("Tool unavailable.");
    validateValue(tool.arguments, args, id);
    if (signal.aborted) throw new AgentError("Tool request cancelled.", 499);
    const output = await tool.execute(structuredClone(args), actor, signal);
    if (signal.aborted) throw new AgentError("Tool request cancelled.", 499);
    const encoded = JSON.stringify(output);
    if (encoded === undefined || encoded.length > 16000)
      throw new AgentError("Tool output exceeds bounds.");
    return JSON.parse(encoded) as unknown;
  }
}
export type GoalCondition = {
  metric: string;
  relation: "atLeast" | "atMost";
  value: number;
};
export function goalReached(
  metrics: Record<string, number>,
  condition: GoalCondition,
) {
  const value = metrics[condition.metric];
  if (!Number.isFinite(value) || !Number.isFinite(condition.value))
    return false;
  return condition.relation === "atLeast"
    ? value >= condition.value
    : value <= condition.value;
}
