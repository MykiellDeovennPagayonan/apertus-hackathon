import type { ConstructionUpdate } from "../../../lib/planner/construction";
import { publicDefinition } from "../../components/catalog";

/** Incomplete construction is presentation only: no runtime, effects, or editable bindings. */
export function ConstructionBoardPreview({
  update,
}: {
  update: ConstructionUpdate | null;
}) {
  const nodes =
    update?.document.nodes.filter(
      (n) => publicDefinition(n.definition).category !== "models",
    ) ?? [];
  return (
    <section
      className="construction-board-preview"
      aria-label="Experiment under construction"
      data-construction-phase={update?.phase ?? "understanding"}
    >
      <output>{update?.activity ?? "Preparing your experiment…"}</output>
      <div className="construction-board-items">
        {nodes.map((node) => (
          <article
            key={node.id}
            className={`construction-board-item is-${publicDefinition(node.definition).category}`}
          >
            <strong>
              {node.label || publicDefinition(node.definition).title}
            </strong>
            <span>
              {publicDefinition(node.definition).category === "appearance"
                ? "Visual preview will be ready when connections are checked."
                : "Being assembled"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
