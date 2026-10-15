import type { ReactNode } from "react";
import "./experiment-lesson.css";

export function ExperimentLessonFrame({
  ariaLabel,
  className = "",
  learningGoal,
  feedback,
  scene,
  panel,
  details,
}: {
  ariaLabel: string;
  className?: string;
  learningGoal: ReactNode;
  feedback?: ReactNode;
  scene: ReactNode;
  panel: ReactNode;
  details?: ReactNode;
}) {
  return (
    <section
      className={`experiment-lesson ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <header className="experiment-lesson__intro">
        <p>{learningGoal}</p>
      </header>
      {feedback && (
        <div className="experiment-lesson__feedback">{feedback}</div>
      )}
      <div className="experiment-lesson__layout">
        <div className="experiment-lesson__scene">{scene}</div>
        <aside
          className="experiment-lesson__panel"
          aria-label={`${ariaLabel} controls and results`}
        >
          {panel}
        </aside>
      </div>
      {details && <div className="experiment-lesson__details">{details}</div>}
    </section>
  );
}
