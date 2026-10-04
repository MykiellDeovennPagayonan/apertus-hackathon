import type { ExperimentDocument } from "./document";

type Lesson = ExperimentDocument["lesson"];
export function LessonSettings({
  lesson,
  example,
  onChange,
  onEndEdit,
}: {
  lesson: Lesson;
  example: string;
  onChange: (field: keyof Lesson, value: string) => void;
  onEndEdit: () => void;
}) {
  const remaining = 150 - lesson.instruction.length;
  return (
    <div className="lesson-settings">
      <label>
        Title
        <input
          value={lesson.title}
          placeholder="Give your experiment a name"
          aria-invalid={lesson.title.length > 150}
          onChange={(event) => onChange("title", event.target.value)}
        />
      </label>
      {lesson.title.length > 150 && (
        <p className="field-error" role="alert">
          Keep the title within 150 characters.
        </p>
      )}
      <label htmlFor="lesson-instruction">Short instruction</label>
      <p id="instruction-help" className="field-help">
        Tell the learner what to try and what to notice.
      </p>
      <textarea
        onBlur={onEndEdit}
        id="lesson-instruction"
        aria-label="Short instruction"
        rows={3}
        placeholder={example}
        value={lesson.instruction}
        aria-invalid={remaining < 0}
        aria-describedby="instruction-help instruction-count"
        onChange={(event) => onChange("instruction", event.target.value)}
      />
      <p
        id="instruction-count"
        className={remaining < 0 ? "field-error" : "field-help"}
        aria-live="polite"
      >
        {lesson.instruction.length}/150 characters
        {remaining < 0
          ? ` · Remove ${-remaining} characters to update the preview.`
          : ""}
      </p>
      <details>
        <summary>Add a longer explanation</summary>
        <p className="field-help">
          Optional. Learners open this under “How this experiment works”.
        </p>
        <label>
          Explanation in Details
          <textarea
            onBlur={onEndEdit}
            aria-label="Explanation in Details"
            value={lesson.explanation}
            placeholder="Explain the idea, assumptions, or a follow-up question."
            onChange={(event) => onChange("explanation", event.target.value)}
          />
        </label>
      </details>
    </div>
  );
}
