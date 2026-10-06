import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import "./CommandBar.css";
export type ComposerStatus = {
  kind: "working" | "success" | "error" | "info";
  text: string;
  details?: string;
  retry?: boolean;
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
  submitLabel?: string;
  landing?: boolean;
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
  submitLabel = "Apply",
  landing = false,
  lastRequest,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<"ideas" | "last" | "details" | null>(
    null,
  );
  const [detailText, setDetailText] = useState("");
  const panelId = useId();
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
      className={`command-bar${landing ? " command-bar--landing" : ""}`}
    >
      <div className="command-bar__meta">
        {status && (
          <div
            className={`command-bar__status command-bar__status--${status.kind}`}
          >
            <output>
              <span className="command-bar__activity" aria-hidden="true" />
              {status.text}
            </output>
            {status.retry && (
              <button
                type="button"
                disabled={disabled || !value.trim()}
                onClick={submit}
              >
                Retry
              </button>
            )}
            {status.details && (
              <button
                type="button"
                aria-expanded={popover === "details"}
                aria-controls={panelId}
                onClick={() => {
                  setDetailText(status.details ?? "");
                  setPopover(popover === "details" ? null : "details");
                }}
              >
                Details
              </button>
            )}
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
              ×
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
              <p>{popover === "last" ? lastRequest?.prompt : detailText}</p>
              {popover === "last" && (
                <>
                  <p className="command-bar__response">
                    {lastRequest?.details}
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
          {!landing && chips.length > 0 && (
            <button
              className="command-bar__ideas"
              type="button"
              disabled={disabled}
              aria-expanded={popover === "ideas"}
              aria-controls={panelId}
              onClick={() => setPopover(popover === "ideas" ? null : "ideas")}
            >
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
              Stop <span aria-hidden="true">■</span>
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
