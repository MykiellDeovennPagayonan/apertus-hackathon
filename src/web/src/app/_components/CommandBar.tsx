import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  formatUserFacingDetails,
  formatUserFacingStatus,
} from "../../lib/planner/errorFormatting";
import {
  type GenerationStage,
  generationStages,
} from "../../lib/planner/progress";
import { BuilderIcon } from "../../simulations/builder/BuilderIcon";
import "./CommandBar.css";
export type ComposerStatus = {
  kind: "working" | "success" | "error" | "info";
  text: string;
  details?: string;
  retry?: boolean;
  help?: string;
  suggestions?: string[];
  libraryFallback?: boolean;
  diagnostics?: string;
  progress?: {
    startedAt: number;
    stage: GenerationStage;
    completed: GenerationStage[];
  };
};
interface Props {
  placeholder?: string;
  chips?: string[];
  disabled?: boolean;
  status?: ComposerStatus | null;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  onStop: () => void;
  onOpenLibrary?: () => void;
  submitLabel?: string;
  landing?: boolean;
  compact?: boolean;
  lastRequest?: { prompt: string; details: string } | null;
}
export default function CommandBar({
  placeholder = "What would you like to explore?",
  chips = [],
  disabled = false,
  status,
  value,
  onChange,
  onSubmit,
  onStop,
  onOpenLibrary,
  submitLabel = "Apply",
  landing = false,
  compact = false,
  lastRequest,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<"ideas" | "last" | "details" | null>(
    null,
  );
  const [detailText, setDetailText] = useState("");
  const panelId = useId();
  const [elapsed, setElapsed] = useState(0);
  const startedAt =
    status?.kind === "working" ? status.progress?.startedAt : undefined;
  useEffect(() => {
    if (startedAt === undefined) return;
    const update = () =>
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Remeasure the DOM after each controlled text change.
  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    const resize = () => {
      field.style.height = "0px";
      const limit = Number.parseFloat(getComputedStyle(field).maxHeight);
      field.style.height = `${Math.min(field.scrollHeight, limit)}px`;
      field.style.overflowY = field.scrollHeight > limit ? "auto" : "hidden";
    };
    resize();
    // Observe width changes on the parent, not the textarea's own height.
    let width = field.parentElement?.clientWidth;
    const widthObserver = new ResizeObserver(() => {
      const next = field.parentElement?.clientWidth;
      if (next !== width) {
        width = next;
        resize();
      }
    });
    if (field.parentElement) widthObserver.observe(field.parentElement);
    window.addEventListener("resize", resize);
    return () => {
      widthObserver.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [value]);
  useEffect(() => {
    if (!popover) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setPopover(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setPopover(null);
        input.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    root.current?.addEventListener("keydown", onEscape);
    const element = root.current;
    return () => {
      document.removeEventListener("pointerdown", close);
      element?.removeEventListener("keydown", onEscape);
    };
  }, [popover]);
  const choose = (text: string) => {
    onChange(text);
    setPopover(null);
    input.current?.focus();
  };
  const submit = () => {
    if (value.trim() && !disabled) {
      setPopover(null);
      onSubmit(value.trim());
    }
  };
  return (
    <div
      ref={root}
      className={`command-bar${landing ? " command-bar--landing" : ""}${compact ? " command-bar--compact" : ""}`}
    >
      {status?.kind === "working" &&
        status.progress &&
        status.progress.completed.length > 0 && (
          <ol className="command-bar__progress" aria-label="Completed steps">
            {status.progress.completed.map((stage) => (
              <li key={stage}>
                <span aria-hidden="true">✓</span>
                {generationStages[stage].replace(/…$/, "")}
                <span className="command-bar__sr-only"> completed</span>
              </li>
            ))}
          </ol>
        )}
      <div className="command-bar__meta">
        {status && (
          <div
            className={`command-bar__status command-bar__status--${status.kind}${status.help ? " command-bar__status-card" : ""}`}
            role={status.kind === "error" ? "alert" : "status"}
          >
            <div className="command-bar__status-copy">
              <output>
                <span className="command-bar__activity" aria-hidden="true" />
                {status.help && (
                  <BuilderIcon
                    name={status.kind === "error" ? "warning" : "info"}
                  />
                )}
                {status.kind === "error" ? formatUserFacingStatus(status.text) : status.text}
              </output>
              {status.help && <p>{status.help}</p>}
            </div>
            {status.kind === "working" && status.progress && (
              <span className="command-bar__elapsed">{elapsed}s elapsed</span>
            )}
            {status.suggestions && status.suggestions.length > 0 && (
              <fieldset
                className="command-bar__clarifications"
                aria-label="Suggested data sources"
              >
                {status.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={disabled}
                    onClick={() => choose(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </fieldset>
            )}
            <div className="command-bar__status-actions">
              {status.retry && (
                <button
                  type="button"
                  disabled={disabled || !value.trim()}
                  onClick={submit}
                >
                  Try again
                </button>
              )}
              {status.libraryFallback && onOpenLibrary && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onOpenLibrary}
                >
                  <BuilderIcon name="composites" /> Add from library
                </button>
              )}
              {(status.diagnostics || status.details) && (
                <button
                  type="button"
                  className="command-bar__details-action"
                  aria-expanded={popover === "details"}
                  aria-controls={panelId}
                  onClick={() => {
                    setDetailText(
                      status.diagnostics ??
                        formatUserFacingDetails(status.details ?? ""),
                    );
                    setPopover(popover === "details" ? null : "details");
                  }}
                >
                  {status.diagnostics ? "Technical details" : "Details"}
                </button>
              )}
            </div>
          </div>
        )}
        {!disabled && lastRequest && (
          <button
            type="button"
            className="command-bar__last"
            aria-expanded={popover === "last"}
            aria-controls={panelId}
            onClick={() => setPopover(popover === "last" ? null : "last")}
          >
            Last request <span aria-hidden="true">⌃</span>
          </button>
        )}
      </div>
      {popover && (
        <div id={panelId} className="command-bar__popover">
          <div className="command-bar__popover-heading">
            <strong>
              {popover === "ideas"
                ? "Try asking…"
                : popover === "last"
                  ? "Last request"
                  : status?.diagnostics
                    ? "Technical details"
                    : "Details"}
            </strong>
            <button
              type="button"
              aria-label="Close prompt panel"
              onClick={() => {
                setPopover(null);
                input.current?.focus();
              }}
            >
              <BuilderIcon name="close" />
            </button>
          </div>
          {popover === "ideas" ? (
            chips.map((c) => (
              <button
                className="command-bar__suggestion"
                key={c}
                type="button"
                onClick={() => choose(c)}
              >
                {c}
                <span aria-hidden="true">↗</span>
              </button>
            ))
          ) : (
            <>
              <p>
                {popover === "last"
                  ? lastRequest?.prompt
                  : status?.diagnostics
                    ? detailText
                    : formatUserFacingDetails(detailText)}
              </p>
              {popover === "last" && (
                <>
                  <p className="command-bar__response">
                    {lastRequest?.details
                      ? formatUserFacingDetails(lastRequest.details)
                      : ""}
                  </p>
                  <button
                    type="button"
                    className="command-bar__reuse"
                    onClick={() => choose(lastRequest?.prompt ?? "")}
                  >
                    Edit and reuse
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
      {compact &&
        !disabled &&
        !value.trim() &&
        chips.length > 0 &&
        !popover && (
          <section
            className="command-bar__quick-chips"
            aria-label="Quick suggestions"
          >
            {chips.map((c) => (
              <button
                key={c}
                className="command-bar__quick-chip"
                type="button"
                onClick={() => choose(c)}
              >
                <span aria-hidden="true">✨</span> {c}
              </button>
            ))}
          </section>
        )}
      <form
        className="command-bar__form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={input}
          className="command-bar__input"
          rows={1}
          value={value}
          readOnly={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="command-bar__actions">
          {!landing && !compact && chips.length > 0 && (
            <button
              className="command-bar__ideas"
              type="button"
              disabled={disabled}
              aria-expanded={popover === "ideas"}
              aria-controls={panelId}
              onClick={() => setPopover(popover === "ideas" ? null : "ideas")}
            >
              <span aria-hidden="true" className="command-bar__ideas-icon">
                💡
              </span>{" "}
              Ideas
            </button>
          )}
          {disabled ? (
            <button
              className="command-bar__send command-bar__stop"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onStop();
              }}
            >
              Stop{" "}
              <span className="command-bar__stop-icon" aria-hidden="true" />
            </button>
          ) : (
            <button
              className="command-bar__send"
              type="submit"
              disabled={!value.trim()}
            >
              {submitLabel}
              <span aria-hidden="true">↑</span>
            </button>
          )}
        </div>
      </form>
      {landing && (
        <div className="command-bar__examples">
          <span>Try</span>
          {chips.map((c, index) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => choose(c)}
            >
              {["Addition", "Area & perimeter", "Truss bridge"][index] ?? c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
