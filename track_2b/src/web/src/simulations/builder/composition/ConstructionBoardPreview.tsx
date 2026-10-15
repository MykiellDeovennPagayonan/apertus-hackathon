import type { ConstructionUpdate } from "../../creation-and-editing/simulation/construction/contracts";
import { publicDefinition } from "../../registry/index";

/** Incomplete construction is presentation only: no runtime, effects, or editable bindings. */
export function ConstructionBoardPreview({
  update,
}: {
  update: ConstructionUpdate | null;
}) {
  const nodes =
    update?.document.nodes.filter(
      (n) => publicDefinition(n).category !== "models",
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
            className={`construction-board-item is-${publicDefinition(node).category}`}
          >
            <strong>
              {node.label || publicDefinition(node).title}
            </strong>
            <span>
              {publicDefinition(node).category === "appearance"
                ? "Visual preview will be ready when connections are checked."
                : "Being assembled"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
