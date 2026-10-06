"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { requestPlan } from "../../../lib/planner/browser";
import type { Plan } from "../../../lib/planner/schema";
import { isDemo } from "../../../lib/planner/schema";
import { ControlsTarget } from "../../../simulations/components/views/ControlsOverlay";
import { ExperimentView } from "../../../simulations/components/views/ExperimentView";
import { modelProvider } from "../../../simulations/runtime/assembly";
import { templateNames } from "../../../simulations/runtime/capabilities";
import { hasPremadeRecipe } from "../../../simulations/runtime/recipes/registry";
import {
  activatePremadeSession,
  disposeSession,
  executePlan,
  getActiveDefinition,
  getDiagnosticSnapshot,
  getExperimentContext,
  saveRecipe,
} from "../../../simulations/runtime/session";
import type { DemoType } from "../../../simulations/runtime/types";
import CommandBar, { type ComposerStatus } from "../../_components/CommandBar";
import LandingPage from "../../_components/LandingPage";
import { premadeExperiments } from "../_lib/premadeExperiments";
import ExperimentCatalog from "./ExperimentCatalog";
import "../../_components/LandingPage.css";
import "./ExperimentsShell.css";

const CHIPS: Partial<Record<DemoType, string[]>> = {
  assembly: ["Reset"],
  gas: ["Heat it up", "Add more gas", "Why did the pressure increase?"],
  ratio: ["Show 25 percent", "Set the ratio to 3 out of 5"],
  "area-perimeter": ["Make a rectangle 6 metres by 4 metres"],
  coordinates: ["Move the point to -3, 4"],
  probability: ["Roll a die 1000 times with seed 42"],
  counting: ["Count 8 circles", "Put 6 circles in the box", "Reset"],
  arithmetic: ["Add 3 and 2", "Subtract 2 from 5", "Play"],
  "equal-groups": ["Make 3 groups of 4", "Share 14 between 3 groups", "Play"],
  "fraction-builder": ["Show 3/4", "Compare 1/2 and 2/4", "Split bar A into 2"],
  "fraction-number-line": [
    "Place 5/4",
    "Add 1/2 and 1/4",
    "Subtract 1/4 from 3/2",
  ],
  projectile: [
    "Compare it with 30 degrees",
    "What if gravity was like the Moon?",
    "Show velocity vectors",
  ],
  bridge: [
    "Move the weight to the left",
    "Remove the middle member",
    "Make the bridge twice as long",
  ],
  town: ["Make it nighttime", "Close the main road", "Make the market busy"],
};

type Phase = "catalog" | "ready";

export default function ExperimentsShell({
  landing = false,
}: {
  landing?: boolean;
}) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlsTarget, setControlsTarget] = useState<HTMLElement | null>(
    null,
  );
  const controlsButton = useRef<HTMLButtonElement>(null);
  const [hasAdditionalControls, setHasAdditionalControls] = useState(false);
  useEffect(() => {
    if (!controlsTarget) return;
    const measure = () =>
      setHasAdditionalControls(controlsTarget.childElementCount > 0);
    const observer = new MutationObserver(measure);
    observer.observe(controlsTarget, { childList: true });
    measure();
    return () => observer.disconnect();
  }, [controlsTarget]);
  const [draft, setDraft] = useState("");
  const [lastRequest, setLastRequest] = useState<{
    prompt: string;
    details: string;
  } | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const composerElement = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("catalog");
  const [demo, setDemo] = useState<DemoType | null>(null);
  const [status, setStatus] = useState<ComposerStatus | null>(null);
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedExperiment = searchParams.get("experiment");
  const focusedExperiment =
    demo === selectedExperiment &&
    (demo === "gas" || hasPremadeRecipe(demo ?? ""));

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS !== "true") return;
    Object.defineProperty(window, "__experimentSnapshot", {
      value: getDiagnosticSnapshot,
      configurable: true,
    });
    return () => {
      Reflect.deleteProperty(window, "__experimentSnapshot");
    };
  }, []);

  useEffect(() => {
    if (!controlsOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setControlsOpen(false);
        controlsButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [controlsOpen]);

  useEffect(() => {
    if (phase !== "ready") return;
    const composer = composerElement.current;
    const identity = workspace.current?.querySelector(".workspace-identity");
    const toolbar = workspace.current?.querySelector(
      focusedExperiment ? ".gas-experiment-tools" : ".workspace-toolbar",
    );
    const measure = () => {
      if (composer)
        workspace.current?.style.setProperty(
          "--composer-height",
          `${composer.getBoundingClientRect().height}px`,
        );
      const bottom = Math.max(
        identity?.getBoundingClientRect().bottom ?? 96,
        toolbar?.getBoundingClientRect().bottom ?? 96,
      );
      workspace.current?.style.setProperty(
        "--workspace-top",
        `${bottom + 16}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (composer) observer.observe(composer);
    if (identity) observer.observe(identity);
    if (toolbar) observer.observe(toolbar);
    return () => observer.disconnect();
  }, [phase, focusedExperiment]);

  useEffect(() => {
    if (status?.kind !== "success") return;
    const timer = window.setTimeout(() => setStatus(null), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const applyPlan = useCallback((plan: Plan, prompt?: string) => {
    const result = executePlan(plan);
    if (!result.accepted) {
      setStatus({
        kind: "error",
        text: "Couldn't apply those changes.",
        details: result.error,
        retry: true,
      });
      return;
    }
    if (plan.operation === "clarify" || plan.operation === "unsupported") {
      setStatus({
        kind: "info",
        text:
          plan.operation === "clarify"
            ? "A little more detail is needed."
            : "That request isn't supported yet.",
        details: plan.message,
      });
      return;
    }
    if (prompt) {
      setLastRequest({ prompt, details: plan.message });
      setDraft("");
    }
    if (plan.operation === "explain") {
      setStatus({
        kind: "info",
        text: "Your explanation is ready.",
        details: plan.message,
      });
      return;
    }
    if (result.demo) {
      setDemo(result.demo);
      setPhase("ready");
      if (plan.operation === "create") setControlsOpen(false);
    }
    setStatus(
      prompt
        ? {
            kind: "success",
            text:
              plan.operation === "create"
                ? "Ready — explore your experiment."
                : "Changes applied.",
            details: plan.message,
          }
        : null,
    );
  }, []);

  useEffect(() => {
    const startup = window.setTimeout(() => {
      pending.current?.abort();
      setBusy(false);
      if (!selectedExperiment) {
        disposeSession();
        setDemo(null);
        setPhase("catalog");
        setStatus(null);
        return;
      }
      if (!isDemo(selectedExperiment) || selectedExperiment === "assembly") {
        disposeSession();
        setDemo(null);
        setPhase("catalog");
        setStatus({
          kind: "info",
          text: "Choose one of the premade experiments below.",
        });
        return;
      }
      if (hasPremadeRecipe(selectedExperiment)) {
        try {
          activatePremadeSession(selectedExperiment);
          setDemo(selectedExperiment);
          setPhase("ready");
          setControlsOpen(false);
          setStatus(null);
        } catch (error) {
          setStatus({
            kind: "error",
            text: "Couldn't open this recipe.",
            details: error instanceof Error ? error.message : "Invalid recipe",
          });
        }
        return;
      }
      applyPlan({
        schemaVersion: 1,
        operation: "create",
        composition: {
          ref: `compositions/${templateNames[selectedExperiment]}`,
          version: 1,
        },
        parameters: premadeExperiments[selectedExperiment].parameters,
        message: "Premade experiment loaded.",
      });
    }, 0);
    return () => {
      window.clearTimeout(startup);
      pending.current?.abort();
      disposeSession();
    };
  }, [selectedExperiment, applyPlan]);

  const onPrompt = async (text: string) => {
    if (pending.current && !pending.current.signal.aborted) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setDraft(text);
    setBusy(true);
    setStatus({
      kind: "working",
      text:
        phase === "ready"
          ? "Working out the changes…"
          : "Thinking through your request…",
    });
    const currentDemo = phase === "ready" ? demo : null;
    const context = getExperimentContext();
    try {
      const plan = await requestPlan(
        text,
        currentDemo,
        context,
        controller.signal,
        () => {
          if (!controller.signal.aborted)
            flushSync(() =>
              setStatus({
                kind: "working",
                text: currentDemo
                  ? "Checking the changes…"
                  : "Preparing your experiment…",
              }),
            );
        },
      );
      if (!controller.signal.aborted) {
        flushSync(() =>
          setStatus({
            kind: "working",
            text:
              plan.operation === "create"
                ? "Setting up the scene and parameters…"
                : plan.operation === "edit"
                  ? "Applying changes…"
                  : "Preparing a response…",
          }),
        );
        applyPlan(plan, text);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setStatus({
          kind: "error",
          text: "Couldn't complete your request.",
          details: error instanceof Error ? error.message : "Please try again.",
          retry: true,
        });
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  };

  const downloadRecipe = () => {
    try {
      const url = URL.createObjectURL(
        new Blob([saveRecipe()], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "apertus-experiment.json";
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: "success", text: "Recipe saved." });
    } catch (error) {
      setStatus({
        kind: "error",
        text: "Couldn't save the recipe.",
        details: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const goHome = () => {
    pending.current?.abort();
    setBusy(false);
    if (selectedExperiment) {
      router.replace("/experiments");
    } else {
      disposeSession();
      setPhase("catalog");
      setDemo(null);
      setStatus(null);
    }
  };

  const cancel = () => {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setStatus({ kind: "info", text: "Stopped — your prompt is still here." });
  };
  const composer = (
    <CommandBar
      placeholder={
        phase === "ready" ? "Ask for a change…" : "Describe an experiment…"
      }
      chips={
        phase === "ready" && demo
          ? CHIPS[demo]
          : [
              "Show me how division works",
              "Show me how throwing a ball works",
              "Show me how gas pressure works",
            ]
      }
      disabled={busy}
      status={status}
      value={draft}
      onChange={setDraft}
      landing={phase === "catalog"}
      lastRequest={lastRequest}
      onSubmit={onPrompt}
      onStop={cancel}
      submitLabel={phase === "ready" ? "Apply" : "Create"}
    />
  );
  if (phase === "catalog") {
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
        </header>
        <ExperimentCatalog error={status?.text} />
      </div>
    );
  }
  const closeControls = () => {
    setControlsOpen(false);
    controlsButton.current?.focus();
  };
  return (
    <ControlsTarget.Provider value={controlsTarget}>
      <div
        ref={workspace}
        className={`experiment-workspace${demo === "gas" ? " experiment-workspace--gas" : focusedExperiment ? " experiment-workspace--focused" : ""}`}
      >
        <div className="workspace-header">
          <header className="workspace-identity">
            <button type="button" onClick={goHome}>
              ← {landing ? "Back to the lab" : "Experiments"}
            </button>
            <h1>
              {demo
                ? demo === "assembly"
                  ? getActiveDefinition()?.assembly?.title
                    ? modelProvider(
                        getActiveDefinition()?.assembly?.instances[0].prefab
                          .ref ?? "",
                      ).name
                    : "Interactive lesson"
                  : premadeExperiments[demo].title
                : ""}
            </h1>
          </header>
          {focusedExperiment ? (
            <details className="gas-experiment-tools">
              <summary>Experiment options</summary>
              <nav aria-label="Experiment tools">
                <button type="button" onClick={downloadRecipe}>
                  Save recipe
                </button>
                <Link
                  href="/experiments/builder?remix=1"
                  onClick={() =>
                    sessionStorage.setItem(
                      "apertus-builder-remix",
                      saveRecipe(),
                    )
                  }
                >
                  Remix in builder
                </Link>
                {status && <output>{status.text}</output>}
              </nav>
            </details>
          ) : (
            <nav className="workspace-toolbar" aria-label="Experiment tools">
              {hasAdditionalControls && (
                <button
                  ref={controlsButton}
                  type="button"
                  aria-expanded={controlsOpen}
                  aria-controls="experiment-controls"
                  onClick={() => setControlsOpen(!controlsOpen)}
                >
                  More settings{" "}
                  <span aria-hidden="true">{controlsOpen ? "−" : "+"}</span>
                </button>
              )}
              <button type="button" onClick={downloadRecipe}>
                Save recipe
              </button>
              <Link href="/experiments/builder">Build manually</Link>
              {([
                "gas",
                "counting",
                "arithmetic",
                "equal-groups",
                "fraction-builder",
                "fraction-number-line",
                "ratio",
                "area-perimeter",
                "coordinates",
                "probability",
                "town",
                "projectile",
                "bridge",
              ].includes(demo ?? "") ||
                (demo === "assembly" &&
                  Boolean(getActiveDefinition()?.assembly?.instances.length) &&
                  getActiveDefinition()?.assembly?.instances.every((instance) =>
                    /prefabs\/(chemistry|math-foundations|physical-systems|natural-systems|dynamic-systems)\//.test(
                      instance.prefab.ref,
                    ),
                  ))) && (
                <Link
                  href="/experiments/builder?remix=1"
                  onClick={() =>
                    sessionStorage.setItem(
                      "apertus-builder-remix",
                      saveRecipe(),
                    )
                  }
                >
                  Remix in builder
                </Link>
              )}
              <Link href="/">Home</Link>
            </nav>
          )}
        </div>
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
              onClick={closeControls}
              aria-label="Close controls"
            >
              ✕
            </button>
          </div>
          <div ref={setControlsTarget} className="workspace-controls__body" />
        </aside>
        <div className="workspace-stage">
          {demo && <ExperimentView demo={demo} />}
        </div>
        <div ref={composerElement} className="workspace-composer">
          {composer}
        </div>
      </div>
    </ControlsTarget.Provider>
  );
}
