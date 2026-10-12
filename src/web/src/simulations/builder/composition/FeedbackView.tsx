"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BuilderIcon } from "../BuilderIcon";
import type { Feedback } from "./feedback";
export function FeedbackView({
  message,
  floating = false,
  onDismiss,
  children,
}: {
  message: Feedback | null;
  floating?: boolean;
  onDismiss?: () => void;
  children?: ReactNode;
}) {
  const [copy, setCopy] = useState({ details: "", text: "" });
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!message?.body) setPaused(false);
  }, [message?.body]);
  useEffect(() => {
    if (
      !floating ||
      !message?.body ||
      message.severity === "error" ||
      paused ||
      !dismiss.current
    )
      return;
    const timer = window.setTimeout(() => dismiss.current?.(), 5000);
    return () => window.clearTimeout(timer);
  }, [floating, message?.body, message?.severity, paused]);
  if (!message) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover and focus pause dismissal; child buttons handle actions.
    <section
      className={`builder-feedback is-${message.severity}${floating ? " builder-feedback--floating" : ""}`}
      role={message.severity === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
    >
      <BuilderIcon
        name={
          message.severity === "error"
            ? "warning"
            : message.severity === "success"
              ? "check"
              : "info"
        }
      />
      <div className="builder-feedback-content">
        <strong>{message.title}</strong>
        <p>{message.body}</p>
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="builder-feedback-dismiss"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          <BuilderIcon name="close" />
        </button>
      )}
      {message.details && (
        <details>
          <summary>Technical details</summary>
          <pre>{message.details}</pre>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message.details ?? "");
                setCopy({ details: message.details ?? "", text: "Copied" });
              } catch {
                setCopy({
                  details: message.details ?? "",
                  text: "Select the details above to copy them.",
                });
              }
            }}
          >
            Copy technical details
          </button>
          <output aria-live="polite">
            {copy.details === message.details ? copy.text : ""}
          </output>
        </details>
      )}
    </section>
  );
}
