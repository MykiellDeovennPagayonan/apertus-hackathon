"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposerStatus } from "../../../app/_components/CommandBar";
import { requestGeneration } from "../../../lib/planner/browser";
import {
  formatUserFacingDetails,
  formatUserFacingStatus,
} from "../../../lib/planner/errorFormatting";
import type { GenerationRequest } from "../../../lib/planner/schema";
import { reconcileBoard } from "../../runtime/authoring/board";
import { finalizeRecipe } from "../../runtime/authoring/operations";
import type { ExperimentDocument } from "../document/types";

export function activeFromBuilderDocument(
  doc: ExperimentDocument,
): GenerationRequest["active"] {
  if (!doc.authored || !doc.authored.nodes?.length) return null;
  try {
    const authored = structuredClone(doc.authored);
    if (!authored.lesson.title?.trim()) {
      authored.lesson.title = doc.lesson?.title?.trim() || "Working experiment";
    }
    if (!authored.lesson.instruction?.trim()) {
      authored.lesson.instruction =
        doc.lesson?.instruction?.trim() || "Explore the simulation";
    }
    reconcileBoard(authored);
    const recipe = finalizeRecipe(authored);
    return {
      sessionId: `builder-${doc.template || "custom"}`,
      authoredRevision: 1,
      interactionRevision: 0,
      recipe,
      runtimeContext: {},
    };
  } catch {
    return null;
  }
}

export function useBuilderAi({
  doc,
  edit,
}: {
  doc: ExperimentDocument;
  edit: (
    change: (d: ExperimentDocument) => void,
    group?: string | null,
    action?: string,
  ) => boolean;
}) {
  const [draft, setDraft] = useState("");
  const [lastRequest, setLastRequest] = useState<{
    prompt: string;
    details: string;
  } | null>(null);
  const [status, setStatus] = useState<ComposerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<{
    controller: AbortController;
    request: GenerationRequest;
  } | null>(null);

  useEffect(() => {
    if (status?.kind !== "success") return;
    const timer = window.setTimeout(() => setStatus(null), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      pending.current?.controller.abort();
      pending.current = null;
    };
  }, []);

  const onPrompt = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      pending.current?.controller.abort();
      const controller = new AbortController();
      const request: GenerationRequest = {
        protocolVersion: 1,
        requestId: crypto.randomUUID(),
        prompt: text.trim(),
        viewport: {
          width: typeof window !== "undefined" ? window.innerWidth : 1280,
          height: typeof window !== "undefined" ? window.innerHeight : 800,
        },
        active: activeFromBuilderDocument(doc),
      };
      const owner = { controller, request };
      pending.current = owner;
      setDraft(text);
      setBusy(true);
      setStatus({
        kind: "working",
        text: doc.authored?.nodes?.length
          ? "Working out the changes…"
          : "Building your experiment…",
      });

      try {
        const result = await requestGeneration(
          request,
          controller.signal,
          () => {
            if (pending.current === owner && !controller.signal.aborted) {
              setStatus({ kind: "working", text: "Checking your experiment…" });
            }
          },
        );

        if (pending.current !== owner || controller.signal.aborted) return;

        if (result.status === "failed") {
          setStatus({
            kind: "error",
            text: formatUserFacingStatus(result.message),
            details: formatUserFacingDetails(result.message),
            retry: result.retryable,
          });
          return;
        }

        if (result.status === "unsupported") {
          setStatus({
            kind: "info",
            text: "That request isn't supported yet.",
            details: formatUserFacingDetails(result.message),
          });
          return;
        }

        if (result.status === "created" || result.status === "updated") {
          const promptLabel =
            text.length > 36 ? `${text.slice(0, 33)}…` : text;
          edit(
            (d) => {
              d.authored = structuredClone(result.recipe.document);
              d.lesson = {
                title:
                  result.recipe.document.lesson.title ||
                  d.lesson.title ||
                  "Untitled experiment",
                instruction:
                  result.recipe.document.lesson.instruction ||
                  d.lesson.instruction ||
                  "",
                explanation:
                  result.recipe.document.lesson.explanation ||
                  d.lesson.explanation ||
                  "",
              };
              reconcileBoard(d.authored);
            },
            null,
            `AI Build: ${promptLabel}`,
          );

          setDraft("");
          const details = [
            result.learnerExplanation,
            result.coverage.explanation ||
              result.recipe.document.lesson.instruction,
          ]
            .filter(Boolean)
            .join("\n\n");

          setLastRequest({ prompt: text, details });
          setStatus({
            kind: result.coverage.level === "partial" ? "info" : "success",
            text:
              result.status === "created"
                ? "Ready — experiment built."
                : "Experiment updated.",
            details,
          });
          return;
        }

        if (result.status === "runtime_action") {
          setStatus({
            kind: "info",
            text: "Action applied.",
            details: result.message,
          });
        }
      } catch (error) {
        if (pending.current === owner && !controller.signal.aborted) {
          setStatus({
            kind: "error",
            text: "Couldn't complete your request.",
            details:
              error instanceof Error
                ? formatUserFacingDetails(error.message)
                : "Please try again.",
            retry: true,
          });
        }
      } finally {
        if (pending.current === owner) {
          pending.current = null;
          setBusy(false);
        }
      }
    },
    [doc, edit],
  );

  const cancel = useCallback(() => {
    pending.current?.controller.abort();
    pending.current = null;
    setBusy(false);
    setStatus({ kind: "info", text: "Stopped — your prompt is still here." });
  }, []);

  return {
    draft,
    setDraft,
    status,
    setStatus,
    busy,
    lastRequest,
    onPrompt,
    cancel,
  };
}
