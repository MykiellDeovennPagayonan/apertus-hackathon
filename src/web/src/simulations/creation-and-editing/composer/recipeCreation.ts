import type { ToolRequest } from "../authoring-engine/operations";
import type { AuthoringTransaction } from "../authoring-engine/transaction";
import type { GenerationBudget } from "../budget";
export function execute(
  draft: AuthoringTransaction,
  operations: ToolRequest[],
  budget: GenerationBudget,
  name: string,
  report = true,
) {
  budget.check();
  const receipt = draft.execute({
    draftId: draft.draftId,
    expectedRevision: draft.revision,
    operationId: name,
    request: operations,
  });
  if (report)
    budget.trace?.("operations", {
      tools: operations.map((op) => op.tool),
      receipt,
    });
  if (receipt.status !== "applied")
    throw new Error(receipt.issues.map((i) => i.message).join("; "));
}
