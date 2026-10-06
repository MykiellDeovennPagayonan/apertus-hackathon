"use client";
import { useState } from "react";
import type { Feedback } from "./feedback";
export function FeedbackView({ message }: { message: Feedback | null }) {
  const [copy, setCopy] = useState("");
  if (!message) return null;
  return (
    <section
      className={`builder-feedback is-${message.severity}`}
      role={message.severity === "error" ? "alert" : "status"}
    >
      <strong>
        <span aria-hidden="true">
          {message.severity === "error"
            ? "!"
            : message.severity === "success"
              ? "✓"
              : "i"}
        </span>{" "}
        {message.title}
      </strong>
      <p>{message.body}</p>
      {message.details && (
        <details>
          <summary>Technical details</summary>
          <pre>{message.details}</pre>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message.details ?? "");
                setCopy("Copied");
              } catch {
                setCopy("Select the details above to copy them.");
              }
            }}
          >
            Copy technical details
          </button>
          <output aria-live="polite">{copy}</output>
        </details>
      )}
    </section>
  );
}
