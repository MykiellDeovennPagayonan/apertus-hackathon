"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposerStatus } from "../../../app/_components/CommandBar";
import { requestGeneration } from "../../../lib/planner/browser";
import {
  formatUserFacingDetails,
  formatUserFacingStatus,
} from "../../../lib/planner/errorFormatting";
import type { GenerationRequest } from "../../../lib/planner/schema";
import { publicDefinition } from "../../components/catalog";
import { reconcileBoard } from "../../runtime/authoring/board";
import { finalizeRecipe } from "../../runtime/authoring/operations";
import type { ExperimentDocument } from "../document/types";

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
      p: import("../../runtime/authoring/types").ExposedParameter,
    ) => {
      const targetNode = authored.nodes.find((n) => n.id === p.node);
      if (targetNode) {
        try {
          const def = publicDefinition(targetNode.definition);
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
      ep: import("../../runtime/authoring/types").ExposedPort,
    ) => {
      const targetNode = authored.nodes.find((n) => n.id === ep.endpoint.node);
      if (targetNode) {
        try {
          const def = publicDefinition(targetNode.definition);
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
}: {
  doc: ExperimentDocument;
  edit: (
    change: (d: ExperimentDocument) => void,
    group?: string | null,
    action?: string,
  ) => boolean;
}) {
  const latest = useRef({ doc, edit });
  latest.current = { doc, edit };
  const workspace = useRef<{
    sessionId: string | null;
    revision: number;
    fingerprint: string;
  }>({ sessionId: null, revision: 0, fingerprint: "" });
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
        viewport: {
          width: typeof window !== "undefined" ? window.innerWidth : 1280,
          height: typeof window !== "undefined" ? window.innerHeight : 800,
        },
        active,
      };
      const owner = { controller, request };
      pending.current = owner;
      setDraft(text);
      setBusy(true);
      setStatus({
        kind: "working",
        text: doc.authored?.nodes?.length
          ? "Assembling composite changes…"
          : "Building composite components…",
      });

      try {
        const result = await requestGeneration(
          request,
          controller.signal,
          () => {
            if (pending.current === owner && !controller.signal.aborted) {
              setStatus({
                kind: "working",
                text: "Validating composite connections and layout…",
              });
            }
          },
        );

        if (pending.current !== owner || controller.signal.aborted) return;
        if (JSON.stringify(latest.current.doc) !== JSON.stringify(doc))
          throw new Error(
            "Your experiment changed during generation. Submit the request again to preserve your edits.",
          );

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
          const promptLabel = text.length > 36 ? `${text.slice(0, 33)}…` : text;
          const applied = latest.current.edit(
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
              const { document: _document, ...metadata } = result.recipe;
              d.recipeMetadata = structuredClone(metadata);
              d.editor = structuredClone(d.authored.editor);
              reconcileBoard(d.authored);
            },
            null,
            `AI Composite: ${promptLabel}`,
          );

          if (!applied)
            throw new Error(
              "The generated change was rejected. Your experiment is unchanged.",
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
                ? "Composite built — components connected and arranged on canvas."
                : "Composite updated — components and connections integrated.",
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
    [doc],
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
