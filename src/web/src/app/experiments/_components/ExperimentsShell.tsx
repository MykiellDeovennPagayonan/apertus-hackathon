"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestGeneration } from "../../../lib/planner/browser";
import {
  formatUserFacingDetails,
  formatUserFacingStatus,
} from "../../../lib/planner/errorFormatting";
import type { GenerationRequest } from "../../../lib/planner/schema";
import { ControlsTarget } from "../../../simulations/components/views/ControlsOverlay";
import { ExperimentView } from "../../../simulations/components/views/ExperimentView";
import { RecipeLesson } from "../../../simulations/components/views/RecipeLesson";
import { templateNames } from "../../../simulations/runtime/capabilities";
import { isDemo } from "../../../simulations/runtime/legacyPlan";
import {
  acceptGenerationResult,
  activateRecipeSession,
  getRecipeSession,
  type RecipeSession,
} from "../../../simulations/runtime/recipeSession";
import { hasPremadeRecipe } from "../../../simulations/runtime/recipes/registry";
import {
  activatePremadeSession,
  disposeSession,
  executePlan,
  getDiagnosticSnapshot,
  saveRecipe,
} from "../../../simulations/runtime/session";
import type { DemoType } from "../../../simulations/runtime/types";
import AccountControl from "../../_components/AccountControl";
import CommandBar, { type ComposerStatus } from "../../_components/CommandBar";
import LandingPage from "../../_components/LandingPage";
import { premadeExperiments } from "../_lib/premadeExperiments";
import { persistRecipe, reopenAcceptedRecipe } from "../_lib/recipePersistence";
import ExperimentCatalog from "./ExperimentCatalog";
import "../../_components/LandingPage.css";
import "./ExperimentsShell.css";

export default function ExperimentsShell({
  landing = false,
}: {
  landing?: boolean;
}) {
  const { data: account } = useSession();
  const ownerId = account?.user.id;
  const [draft, setDraft] = useState("");
  const [lastRequest, setLastRequest] = useState<{
    prompt: string;
    details: string;
  } | null>(null);
  const [demo, setDemo] = useState<DemoType | null>(null);
  const [lesson, setLesson] = useState<RecipeSession | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<ComposerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [, refresh] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlsTarget, setControlsTarget] = useState<HTMLElement | null>(
    null,
  );
  const [hasAdditionalControls, setHasAdditionalControls] = useState(false);
  const controlsButton = useRef<HTMLButtonElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const options = useRef<HTMLDetailsElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const composerElement = useRef<HTMLDivElement>(null);
  const pending = useRef<{
    controller: AbortController;
    request: GenerationRequest;
  } | null>(null);
  const startupRevision = useRef(0);
  const selectedExperiment = useSearchParams().get("experiment");
  const router = useRouter();
  const focused = !!lesson || demo === "gas";
  const syncSession = useCallback(() => {
    setLesson(getRecipeSession());
    refresh((n) => n + 1);
  }, []);
  useEffect(() => lesson?.subscribe(() => refresh((n) => n + 1)), [lesson]);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS !== "true") return;
    Object.defineProperty(window, "__experimentSnapshot", {
      value: () => getRecipeSession()?.snapshot() ?? getDiagnosticSnapshot(),
      configurable: true,
    });
    return () => {
      Reflect.deleteProperty(window, "__experimentSnapshot");
    };
  }, []);
  useEffect(() => {
    if (!controlsTarget) return;
    const measure = () =>
      setHasAdditionalControls(controlsTarget.childElementCount > 0);
    const observer = new MutationObserver(measure);
    observer.observe(controlsTarget, { childList: true });
    measure();
    return () => observer.disconnect();
  }, [controlsTarget]);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (controlsOpen) {
          setControlsOpen(false);
          controlsButton.current?.focus();
        }
        if (options.current?.open) {
          options.current.open = false;
          options.current.querySelector("summary")?.focus();
        }
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [controlsOpen]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A replacement session replaces the measured lesson header even while ready stays true.
  useEffect(() => {
    if (!ready) return;
    const composer = composerElement.current;
    const header = workspace.current?.querySelector(".workspace-header");
    const lessonHeader = workspace.current?.querySelector(
      ".recipe-lesson > header",
    );
    const measure = () => {
      if (composer)
        workspace.current?.style.setProperty(
          "--composer-height",
          `${composer.getBoundingClientRect().height}px`,
        );
      const bottom = Math.max(96, header?.getBoundingClientRect().bottom ?? 96);
      workspace.current?.style.setProperty(
        "--workspace-top",
        `${bottom + 16}px`,
      );
      workspace.current?.style.setProperty(
        "--lesson-heading-height",
        `${lessonHeader?.getBoundingClientRect().height ?? 60}px`,
      );
      refresh((value) => value + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [composer, header, lessonHeader])
      if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [ready, lesson, focused]);
  useEffect(() => {
    if (status?.kind !== "success") return;
    const timer = window.setTimeout(() => setStatus(null), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    const revision = ++startupRevision.current;
    const timer = window.setTimeout(async () => {
      pending.current?.controller.abort();
      pending.current = null;
      setBusy(false);
      disposeSession();
      setDemo(null);
      setLesson(null);
      setReady(false);
      setStatus(null);
      if (!selectedExperiment) {
        if (landing)
          try {
            const saved = await reopenAcceptedRecipe(ownerId);
            if (revision !== startupRevision.current) return;
            if (saved) {
              activateRecipeSession(JSON.parse(saved));
              syncSession();
              setReady(true);
            }
          } catch (error) {
            setStatus({
              kind: "info",
              text: "Your saved lesson could not be reopened.",
              details:
                error instanceof Error
                  ? formatUserFacingDetails(error.message)
                  : "Use a downloaded recipe to recover.",
            });
          }
        return;
      }
      if (!isDemo(selectedExperiment) || selectedExperiment === "assembly") {
        setStatus({ kind: "info", text: "Choose a premade experiment below." });
        return;
      }
      try {
        if (hasPremadeRecipe(selectedExperiment))
          activatePremadeSession(selectedExperiment);
        else {
          const result = executePlan({
            schemaVersion: 1,
            operation: "create",
            composition: {
              ref: `compositions/${templateNames[selectedExperiment]}`,
              version: 1,
            },
            parameters: premadeExperiments[selectedExperiment].parameters,
            message: "Premade experiment loaded.",
          });
          if (!result.accepted) throw new Error(result.error);
        }
        if (revision === startupRevision.current) {
          setDemo(selectedExperiment);
          syncSession();
          setReady(true);
        }
      } catch (error) {
        setStatus({
          kind: "error",
          text: "Couldn't open this lesson.",
          details:
            error instanceof Error
              ? formatUserFacingDetails(error.message)
              : "Invalid recipe",
        });
      }
    }, 0);
    return () => {
      ++startupRevision.current;
      window.clearTimeout(timer);
      pending.current?.controller.abort();
      pending.current = null;
      disposeSession();
    };
  }, [selectedExperiment, landing, syncSession, ownerId]);

  const persist = async (session: RecipeSession) => {
    const revision = session.authoredRevision;
    try {
      await persistRecipe(session, ownerId);
      return true;
    } catch (error) {
      if (
        getRecipeSession() === session &&
        revision === session.authoredRevision
      )
        setStatus({
          kind: "error",
          text: "Your lesson is ready, but it couldn't be saved. Use Save recipe to download it.",
          details:
            error instanceof Error
              ? formatUserFacingDetails(error.message)
              : "Browser storage is unavailable.",
        });
      return false;
    }
  };
  const onPrompt = async (text: string) => {
    pending.current?.controller.abort();
    const controller = new AbortController();
    const request: GenerationRequest = {
      protocolVersion: 1,
      requestId: crypto.randomUUID(),
      prompt: text,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      active: getRecipeSession()?.requestContext() ?? null,
    };
    const owner = { controller, request };
    pending.current = owner;
    setDraft(text);
    setBusy(true);
    setStatus({
      kind: "working",
      text: ready ? "Working out the changes…" : "Building your lesson…",
    });
    try {
      const result = await requestGeneration(request, controller.signal, () => {
        if (pending.current === owner && !controller.signal.aborted)
          setStatus({ kind: "working", text: "Checking your lesson…" });
      });
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
      const session = acceptGenerationResult(result, request, disposeSession);
      syncSession();
      setDemo(null);
      setReady(true);
      setControlsOpen(false);
      setDraft("");
      const details =
        result.status === "runtime_action"
          ? result.message
          : [
              result.learnerExplanation,
              result.coverage.explanation ||
                session.document.lesson.instruction,
            ]
              .filter(Boolean)
              .join("\n\n");
      setLastRequest({ prompt: text, details });
      setStatus({
        kind:
          result.status !== "runtime_action" &&
          result.coverage.level === "partial"
            ? "info"
            : "success",
        text:
          result.status === "created"
            ? "Ready — explore your lesson."
            : result.status === "updated"
              ? "Starting lesson updated. Unchanged activities keep their progress."
              : "Action applied.",
        details,
      });
      if (result.status !== "runtime_action") void persist(session);
    } catch (error) {
      if (pending.current === owner && !controller.signal.aborted)
        setStatus({
          kind: "error",
          text: "Couldn't complete your request.",
          details:
            error instanceof Error
              ? formatUserFacingDetails(error.message)
              : "Please try again.",
          retry: true,
        });
    } finally {
      if (pending.current === owner) {
        pending.current = null;
        setBusy(false);
      }
    }
  };
  const cancel = () => {
    pending.current?.controller.abort();
    pending.current = null;
    setBusy(false);
    setStatus({ kind: "info", text: "Stopped — your prompt is still here." });
  };
  const goHome = () => {
    pending.current?.controller.abort();
    pending.current = null;
    setBusy(false);
    disposeSession();
    setLesson(null);
    setDemo(null);
    setReady(false);
    setStatus(null);
    if (selectedExperiment) router.replace("/experiments");
  };
  const downloadRecipe = () => {
    let url: string | null = null;
    try {
      url = URL.createObjectURL(
        new Blob([saveRecipe()], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "apertus-experiment.json";
      anchor.click();
      setStatus({ kind: "success", text: "Recipe download started." });
    } catch (error) {
      setStatus({
        kind: "error",
        text: "Couldn't export this recipe.",
        details:
          error instanceof Error
            ? formatUserFacingDetails(error.message)
            : "Please try again.",
      });
    } finally {
      if (url) {
        setTimeout(() => URL.revokeObjectURL(url!), 1000);
      }
    }
  };
  const remix = (event: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      sessionStorage.setItem("apertus-builder-remix", saveRecipe());
    } catch (error) {
      event.preventDefault();
      setStatus({
        kind: "error",
        text: "Couldn't prepare Remix. Download the recipe and import it in the builder.",
        details:
          error instanceof Error
            ? formatUserFacingDetails(error.message)
            : "Browser storage is unavailable.",
      });
    }
  };
  const importRecipe = async (file: File) => {
    try {
      if (file.size > 1_100_000) throw new Error("Recipe file is too large.");
      const text = await file.text();
      let source: unknown;
      try {
        source = JSON.parse(text);
      } catch {
        throw new Error("Recipe file is not valid JSON.");
      }
      const session = activateRecipeSession(source, undefined, disposeSession);
      pending.current?.controller.abort();
      pending.current = null;
      setBusy(false);
      syncSession();
      setDemo(null);
      setReady(true);
      setStatus({ kind: "success", text: "Recipe opened." });
      const saved = await persist(session);
      if (saved && selectedExperiment && getRecipeSession() === session)
        router.replace("/");
    } catch (error) {
      setStatus({
        kind: "error",
        text: "Couldn't open this recipe.",
        details:
          error instanceof Error
            ? formatUserFacingDetails(error.message)
            : "Invalid recipe",
      });
    }
  };
  const composer = (
    <CommandBar
      placeholder={ready ? "Ask for a change…" : "Describe an experiment…"}
      chips={
        ready
          ? [
              "Reset this lesson",
              "Change the starting values",
              "Add another observation",
            ]
          : [
              "Help me learn addition with circles",
              "Compare two rectangles and their areas",
              "Help me learn how a truss bridge carries a load",
            ]
      }
      disabled={busy}
      status={status}
      value={draft}
      onChange={setDraft}
      landing={!ready}
      lastRequest={lastRequest}
      onSubmit={onPrompt}
      onStop={cancel}
      submitLabel={ready ? "Apply" : "Create"}
    />
  );
  if (!ready) {
    if (landing)
      return (
        <LandingPage>
          {composer}
          <div className="manual-create-entry">
            <Link href="/experiments/builder">Create manually →</Link>
            <span>Choose a canvas and build it yourself.</span>
          </div>
        </LandingPage>
      );
    return (
      <div className="pg-shell pg-shell--center">
        <header className="pg-prompt-nav">
          <Link href="/" className="brand">
            ✳ apertus<span className="brand__suffix">/ experiments</span>
          </Link>
          <Link href="/">← Back to the lab</Link>
          <AccountControl />
        </header>
        <ExperimentCatalog error={status?.text} />
      </div>
    );
  }
  return (
    <ControlsTarget.Provider value={controlsTarget}>
      <div
        ref={workspace}
        className={`experiment-workspace${demo === "gas" ? " experiment-workspace--gas" : focused ? " experiment-workspace--focused" : ""}`}
      >
        <div className="workspace-header">
          <header className="workspace-identity">
            <button type="button" onClick={goHome}>
              ← {landing ? "Back to the lab" : "Experiments"}
            </button>
            <h1>
              {lesson?.document.lesson.title ??
                (demo && demo !== "assembly"
                  ? premadeExperiments[demo].title
                  : "Interactive lesson")}
            </h1>
          </header>
          <details className="gas-experiment-tools" ref={options}>
            <summary>Experiment options</summary>
            <nav aria-label="Experiment tools">
              <button type="button" onClick={downloadRecipe}>
                Save recipe
              </button>
              {lesson && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        lesson.runtime.reset();
                      } catch (error) {
                        setStatus({
                          kind: "error",
                          text: "Couldn't reset lesson.",
                          details:
                            error instanceof Error
                              ? formatUserFacingDetails(error.message)
                              : "Reset failed",
                        });
                      }
                    }}
                  >
                    Reset lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void persist(lesson).then((saved) => {
                        if (saved)
                          setStatus({
                            kind: "success",
                            text: "Lesson saved to library.",
                          });
                      });
                    }}
                  >
                    Save to library
                  </button>
                  <button
                    type="button"
                    onClick={() => importInput.current?.click()}
                  >
                    Open recipe
                  </button>
                  <button
                    type="button"
                    disabled={!lesson.canUndo}
                    onClick={() => {
                      try {
                        if (lesson.undo()) void persist(lesson);
                      } catch (error) {
                        setStatus({
                          kind: "error",
                          text: "Couldn't undo that change.",
                          details:
                            error instanceof Error
                              ? formatUserFacingDetails(error.message)
                              : "Undo failed",
                        });
                      }
                    }}
                  >
                    Undo lesson change
                  </button>
                  <button
                    type="button"
                    disabled={!lesson.canRedo}
                    onClick={() => {
                      try {
                        if (lesson.redo()) void persist(lesson);
                      } catch (error) {
                        setStatus({
                          kind: "error",
                          text: "Couldn't redo that change.",
                          details:
                            error instanceof Error
                              ? formatUserFacingDetails(error.message)
                              : "Redo failed",
                        });
                      }
                    }}
                  >
                    Redo lesson change
                  </button>
                </>
              )}
              <Link href="/experiments/builder?remix=1" onClick={remix}>
                Remix in builder
              </Link>
              {hasAdditionalControls && (
                <button
                  ref={controlsButton}
                  type="button"
                  aria-expanded={controlsOpen}
                  aria-controls="experiment-controls"
                  onClick={() => setControlsOpen(!controlsOpen)}
                >
                  More settings
                </button>
              )}
            </nav>
          </details>
        </div>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Open recipe file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importRecipe(file);
            event.target.value = "";
          }}
        />
        <aside
          id="experiment-controls"
          className="workspace-controls"
          aria-label="More experiment settings"
          hidden={!controlsOpen}
        >
          <div className="workspace-controls__heading">
            <h2>More settings</h2>
            <button
              type="button"
              onClick={() => {
                setControlsOpen(false);
                controlsButton.current?.focus();
              }}
              aria-label="Close controls"
            >
              ✕
            </button>
          </div>
          <div ref={setControlsTarget} className="workspace-controls__body" />
        </aside>
        <div className="workspace-stage">
          {lesson ? (
            <RecipeLesson
              workspace
              document={lesson.document}
              runtime={lesson.runtime}
              animationEnabled={lesson.animationEnabled}
              onAnimationChange={lesson.setAnimation}
              onAdvanceTime={lesson.advanceTime}
            />
          ) : (
            demo && <ExperimentView demo={demo} />
          )}
        </div>
        <div ref={composerElement} className="workspace-composer">
          {composer}
        </div>
      </div>
    </ControlsTarget.Provider>
  );
}
