"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposerStatus } from "../../../app/_components/CommandBar";
import { requestGeneration } from "../../creation-and-editing/input/browser";
import type { ConstructionUpdate } from "../../creation-and-editing/simulation/construction/contracts";
import { generationStages } from "../../creation-and-editing/input/progress";
import type { GenerationRequest } from "../../creation-and-editing/input/contracts";
import { publicDefinition } from "../../registry/index";
import { reconcileBoard } from "../../creation-and-editing/authoring-engine/presentation/board";
import { finalizeRecipe } from "../../creation-and-editing/authoring-engine/finalizeRecipe";
import type { ExperimentDocument } from "../document/types";
import { builderFailureStatus } from "./builderFeedback";
import {
  completedExperiment,
  contentFingerprint,
  presentationPause,
} from "./constructionPreview";

export function activeFromBuilderDocument(
  doc: ExperimentDocument,
): GenerationRequest["active"] {
  if (!doc.authored || !doc.authored.nodes?.length) return null;
  try {
    const authored = structuredClone(doc.authored);
    if (!authored.formatVersion) {
      authored.formatVersion = 3;
    }
    if (!authored.groups) {
      authored.groups = [];
    }
    if (!authored.resources) {
      authored.resources = [];
    }
    if (!authored.scopes) {
      authored.scopes = [{ id: "main", label: "Main" }];
    }
    if (!authored.lesson.title?.trim()) {
      authored.lesson.title = doc.lesson?.title?.trim() || "Working experiment";
    }
    if (!authored.lesson.instruction?.trim()) {
      authored.lesson.instruction =
        doc.lesson?.instruction?.trim() || "Explore the simulation";
    }
    reconcileBoard(authored);

    const normalizeParam = (
      p: import("../../creation-and-editing/authoring-engine/document").ExposedParameter,
    ) => {
      const targetNode = authored.nodes.find((n) => n.id === p.node);
      if (targetNode) {
        try {
          const def = publicDefinition(targetNode);
          const config = def.configuration;
          const propSchema =
            config.type === "object" && config.properties
              ? config.properties[p.field]
              : undefined;
          if (propSchema) {
            return {
              ...p,
              schema: structuredClone(propSchema),
              default:
                p.default !== undefined
                  ? p.default
                  : (targetNode.configuration[p.field] ??
                    def.defaults[p.field]),
            };
          }
        } catch {}
      }
      return p;
    };

    const normalizePort = (
      ep: import("../../creation-and-editing/authoring-engine/document").ExposedPort,
    ) => {
      const targetNode = authored.nodes.find((n) => n.id === ep.endpoint.node);
      if (targetNode) {
        try {
          const def = publicDefinition(targetNode);
          const portDef =
            ep.direction === "input"
              ? def.inputs[ep.endpoint.port]
              : def.outputs[ep.endpoint.port];
          if (portDef) {
            return {
              ...ep,
              port: structuredClone(portDef),
            };
          }
        } catch {}
      }
      return ep;
    };

    if (authored.groups) {
      authored.groups = authored.groups.map((g) => ({
        ...g,
        parameters: (g.parameters || []).map(normalizeParam),
        exposedPorts: (g.exposedPorts || []).map(normalizePort),
      }));
    }

    // Extract all composite parameters from groups and metadata
    const rawParams = [
      ...(doc.recipeMetadata?.parameters ?? []),
      ...(authored.groups || []).flatMap((g) => g.parameters || []),
    ];
    const exposedParams = rawParams.map(normalizeParam);

    // Extract all external ports exposed at the composite boundary
    const rawPorts = [
      ...(doc.recipeMetadata?.externalPorts ?? []),
      ...(authored.groups || []).flatMap((g) => g.exposedPorts || []),
    ];
    const externalPorts = rawPorts.map(normalizePort);

    const tags = [
      ...new Set([
        ...(doc.recipeMetadata?.tags ?? []),
        "composite",
        "builder",
        doc.template || "custom",
      ]),
    ];

    const discovery = doc.recipeMetadata?.discovery ?? {
      kind: "composite" as const,
      group: "composites" as const,
      summary:
        doc.lesson?.instruction?.trim() ||
        authored.lesson.instruction ||
        "An assembly of connected components.",
      placement: "Adds an assembly of connected components",
    };

    const recipe = finalizeRecipe(authored, {
      id: doc.recipeMetadata?.id ?? `composite/${doc.template || "custom"}`,
      version: doc.recipeMetadata?.version ?? 1,
      title:
        doc.lesson?.title?.trim() ||
        authored.lesson.title ||
        "Custom Composite",
      description:
        doc.lesson?.instruction?.trim() ||
        authored.lesson.instruction ||
        "Assembled composite component",
      parameters: exposedParams,
      externalPorts,
      tags,
      discovery,
      assumptions: doc.recipeMetadata?.assumptions ?? [],
      nested: doc.recipeMetadata?.nested ?? [],
      dependencies: doc.recipeMetadata?.dependencies ?? [],
      catalog: doc.recipeMetadata?.catalog,
    });

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
  onBusyChange,
}: {
  doc: ExperimentDocument;
  onBusyChange?: (busy: boolean) => void;
  edit: (
    change: (d: ExperimentDocument) => void,
    group?: string | null,
    action?: string,
  ) => boolean;
}) {
  const latest = useRef({ doc, edit, onBusyChange });
  latest.current = { doc, edit, onBusyChange };
  const workspace = useRef<{
    sessionId: string | null;
    revision: number;
    fingerprint: string;
  }>({ sessionId: null, revision: 0, fingerprint: "" });
  const [draft, setDraft] = useState(
    doc.authored?.nodes?.length
      ? ""
      : "Make a pendulum swing where I can adjust its starting angle and length",
  );
  const [lastRequest, setLastRequest] = useState<{
    prompt: string;
    details: string;
  } | null>(null);
  const [status, setStatus] = useState<ComposerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ConstructionUpdate | null>(null);
  const clarification = useRef<{ sessionId: string; prompt: string; question: string } | null>(null);
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
      latest.current.onBusyChange?.(false);
    };
  }, []);

  const onPrompt = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      pending.current?.controller.abort();
      const controller = new AbortController();
      const active = activeFromBuilderDocument(doc);
      if (!workspace.current.sessionId)
        workspace.current.sessionId = `builder-${crypto.randomUUID()}`;
      if (active) {
        const fingerprint = JSON.stringify(doc.authored);
        if (workspace.current.fingerprint !== fingerprint) {
          workspace.current.revision++;
          workspace.current.fingerprint = fingerprint;
        }
        active.sessionId = workspace.current.sessionId;
        active.authoredRevision = workspace.current.revision;
      }
      const request: GenerationRequest = {
        protocolVersion: 1,
        requestId: crypto.randomUUID(),
        prompt: text.trim(),
        purpose: active?.recipe.document.nodes.length ? "edit" : "create",
        destination: "builder",
        construction: "live",
        viewport: {
          width: typeof window !== "undefined" ? window.innerWidth : 1280,
          height: typeof window !== "undefined" ? window.innerHeight : 800,
        },
        active,
      };
      if (clarification.current && clarification.current.sessionId === active?.sessionId)
        request.clarification = { prompt: clarification.current.prompt, question: clarification.current.question };
      else clarification.current = null;
      const owner = { controller, request };
      pending.current = owner;
      setDraft(text);
      setBusy(true);
      setPreview(null);
      latest.current.onBusyChange?.(true);
      setStatus({
        kind: "working",
        text: doc.authored?.nodes?.length
          ? "Planning your changes…"
          : "Understanding your request…",
      });

      try {
        const result = await requestGeneration(
          request,
          controller.signal,
          undefined,
          (stage) => {
            if (pending.current === owner && !controller.signal.aborted)
              setStatus({ kind: "working", text: generationStages[stage] });
          },
          async (update) => {
            if (pending.current !== owner || controller.signal.aborted) return;
            setPreview(update);
            setStatus({ kind: "working", text: update.activity });
            const reducedMotion = window.matchMedia(
              "(prefers-reduced-motion: reduce)",
            ).matches;
            await presentationPause(
              controller.signal,
              reducedMotion ? 0 : update.phase === "arrangement" ? 260 : 90,
            );
          },
        );

        if (pending.current !== owner || controller.signal.aborted) return;
        if (contentFingerprint(latest.current.doc) !== contentFingerprint(doc))
          throw new Error(
            "Your experiment changed during generation. Submit the request again to preserve your edits.",
          );

        if (result.status === "clarification") {
          if (active) clarification.current = { sessionId: active.sessionId, prompt: request.clarification?.prompt ?? request.prompt, question: result.message };
          setStatus({ kind: "info", text: result.message });
          return;
        }
        if (result.status !== "failed") clarification.current = null;
        if (result.status === "failed" || result.status === "unsupported") {
          setStatus(
            builderFailureStatus(
              result.message,
              text,
              latest.current.doc,
              result.status === "failed" && result.retryable,
            ),
          );
          return;
        }

        if (result.status === "created" || result.status === "updated") {
          const promptLabel = text.length > 36 ? `${text.slice(0, 33)}…` : text;
          const completed = completedExperiment(latest.current.doc, result);
          const unchanged =
            contentFingerprint(completed) ===
            contentFingerprint(latest.current.doc);
          const applied =
            unchanged ||
            latest.current.edit(
              (d) => Object.assign(d, completed),
              null,
              `AI Build: ${promptLabel}`,
            );
          if (!applied)
            throw new Error(
              "The generated change was rejected. Your experiment is unchanged.",
            );
          setDraft("");
          const details = [
            result.learnerExplanation,
            result.coverage?.explanation,
          ]
            .filter(Boolean)
            .join("\n\n");

          setLastRequest({ prompt: text, details });
          setStatus({
            kind: result.coverage?.level === "partial" ? "info" : "success",
            text:
              result.status === "created"
                ? "Ready — your experiment is built."
                : "Ready — your experiment is updated.",
            details,
          });
          return;
        }

        if (result.status === "runtime_action") {
          setStatus({
            kind: "info",
            text: "Open Try lesson to apply runtime actions.",
            details:
              "The builder edits authored content. No runtime action was applied.",
          });
        }
      } catch (error) {
        if (pending.current === owner && !controller.signal.aborted) {
          setStatus(
            builderFailureStatus(
              error instanceof Error
                ? error.message
                : "Couldn't complete your request.",
              text,
              latest.current.doc,
              true,
              false,
            ),
          );
        }
      } finally {
        if (pending.current === owner) {
          pending.current = null;
          setBusy(false);
          setPreview(null);
          latest.current.onBusyChange?.(false);
        }
      }
    },
    [doc],
  );

  const cancel = useCallback(() => {
    pending.current?.controller.abort();
    pending.current = null;
    setBusy(false);
    setPreview(null);
    latest.current.onBusyChange?.(false);
    setStatus({ kind: "info", text: "Stopped — your prompt is still here." });
  }, []);

  return {
    draft,
    setDraft,
    status,
    setStatus,
    busy,
    preview,
    lastRequest,
    onPrompt,
    cancel,
  };
}
