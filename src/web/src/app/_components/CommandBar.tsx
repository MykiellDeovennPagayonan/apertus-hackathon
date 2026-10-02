import { useState } from "react";
import "./CommandBar.css";

interface Props {
  placeholder?: string;
  chips?: string[];
  disabled?: boolean;
  confirmation?: string | null;
  onSubmit: (prompt: string) => void;
}

export default function CommandBar({
  placeholder = "Ask me to build an experiment...",
  chips = [],
  disabled = false,
  confirmation,
  onSubmit,
}: Props) {
  const [value, setValue] = useState("");

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || disabled) return;
    onSubmit(t);
    setValue("");
  };

  return (
    <div className="command-bar">
      {confirmation && (
        <div className="command-bar__confirm" aria-live="polite">
          {confirmation}
        </div>
      )}
      <form
        className="command-bar__form"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <input
          className="command-bar__input"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          className="command-bar__send"
          type="submit"
          disabled={disabled}
          aria-label="Send"
        >
          ↑
        </button>
      </form>
      {chips.length > 0 && (
        <div className="command-bar__chips">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              className="command-bar__chip"
              disabled={disabled}
              onClick={() => submit(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
