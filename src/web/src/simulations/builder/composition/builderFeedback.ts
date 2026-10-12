import type { ComposerStatus } from "../../../app/_components/CommandBar";
import {
  formatUserFacingDetails,
  formatUserFacingStatus,
} from "../../../lib/planner/errorFormatting";
import { publicDefinition } from "../../components/catalog";
import type { ExperimentDocument } from "../document/types";
import { portLabel } from "../graph/authoredGraph";

/** Clarification should give the learner a next step rather than expose planner internals. */
export function builderFailureStatus(
  message: string,
  prompt: string,
  doc: ExperimentDocument,
  retryable: boolean,
  unchanged = true,
): ComposerStatus {
  const clarification =
    /clarify|needs more detail|could not select .*confidently/i.test(message);
  if (clarification) {
    const chart = /\b(chart|graph|plot)\b/i.test(prompt);
    const suggestions = chart
      ? [
          ...new Set(
            (doc.authored?.nodes ?? []).flatMap((node) =>
              Object.entries(publicDefinition(node).outputs)
                .filter(([, port]) => port.kind === "dataset")
                .map(
                  ([name]) =>
                    `Add a chart showing ${node.label}’s ${portLabel(name)}.`,
                ),
            ),
          ),
        ].slice(0, 3)
      : [];
    return {
      kind: "info",
      text: chart
        ? "What should the chart show?"
        : "Tell me a little more about the change",
      help: chart
        ? "Choose an available data source below, or describe the values you want to compare."
        : "Name the component or value you want to change, and describe the result you want.",
      suggestions,
      libraryFallback: true,
      diagnostics: message,
    };
  }
  return {
    kind: "error",
    text: formatUserFacingStatus(message),
    help: `${unchanged ? "No changes were applied. " : ""}${retryable ? "Try again, or add a component from the library." : "Try a more specific request, or add a component from the library."}`,
    retry: retryable,
    libraryFallback: true,
    diagnostics: message,
    details: formatUserFacingDetails(message),
  };
}
