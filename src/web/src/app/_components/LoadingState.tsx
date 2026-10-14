import "./LoadingState.css";

export default function LoadingState({
  title = "Opening your lab…",
  description = "Your workspace will be ready in a moment.",
  variant = "screen",
}: {
  title?: string;
  description?: string;
  variant?: "screen" | "cards" | "inline";
}) {
  return (
    <section
      className={`app-loading app-loading--${variant}`}
      aria-busy="true"
      aria-label={title}
    >
      <div className="app-loading__message">
        {variant === "screen" && (
          <span className="app-loading__brand">
            pAperSim <span>LOCAL LAB</span>
          </span>
        )}
        <span className="app-loading__spinner" aria-hidden="true" />
        <output className="app-loading__copy">
          <strong>{title}</strong>
          <span>{description}</span>
        </output>
      </div>
      {variant === "cards" && (
        <div className="app-loading__grid" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div className="app-loading__card" key={card}>
              <span className="app-loading__tag" />
              <span className="app-loading__line app-loading__line--title" />
              <span className="app-loading__line" />
              <span className="app-loading__line app-loading__line--short" />
              <span className="app-loading__action" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
