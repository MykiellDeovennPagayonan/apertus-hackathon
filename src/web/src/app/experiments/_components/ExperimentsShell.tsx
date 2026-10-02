"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestPlan } from "../../../lib/apertus/browser";
import type { Plan } from "../../../lib/apertus/schema";
import { isDemo } from "../../../lib/apertus/schema";
import { ExperimentView } from "../../../simulations/components/views/ExperimentView";
import { templateNames } from "../../../simulations/runtime/capabilities";
import {
  disposeSession,
  executePlan,
  getExperimentContext,
  saveRecipe,
} from "../../../simulations/runtime/session";
import type { DemoType } from "../../../simulations/runtime/types";
import CommandBar from "../../_components/CommandBar";
import { premadeExperiments } from "../_lib/premadeExperiments";
import ExperimentCatalog from "./ExperimentCatalog";
import "../../_components/LandingPage.css";
import "./ExperimentsShell.css";

const CHIPS: Partial<Record<DemoType, string[]>> = {
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

export default function ExperimentsShell() {
  const [phase, setPhase] = useState<Phase>("catalog");
  const [demo, setDemo] = useState<DemoType | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedExperiment = searchParams.get("experiment");
  const youngLearner =
    demo === "counting" || demo === "arithmetic" || demo === "equal-groups";

  const applyPlan = useCallback((plan: Plan) => {
    const result = executePlan(plan);
    if (!result.accepted) {
      setConfirmation(`No changes applied. ${result.error}`);
      return;
    }
    if (plan.operation === "clarify" || plan.operation === "unsupported") {
      setConfirmation(plan.message);
      return;
    }
    if (result.demo) {
      setDemo(result.demo);
      setPhase("ready");
      setConfirmation("Experiment ready. Initial configuration applied.");
    } else setConfirmation("Requested changes applied to the experiment.");
  }, []);

  useEffect(() => {
    const startup = window.setTimeout(() => {
      pending.current?.abort();
      setBusy(false);
      if (!selectedExperiment) {
        disposeSession();
        setDemo(null);
        setPhase("catalog");
        setConfirmation(null);
        return;
      }
      if (!isDemo(selectedExperiment)) {
        disposeSession();
        setDemo(null);
        setPhase("catalog");
        setConfirmation("Choose one of the premade experiments below.");
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
    if (busy) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setConfirmation("Apertus is thinking…");
    const currentDemo = phase === "ready" ? demo : null;
    const context = getExperimentContext();
    try {
      const plan = await requestPlan(
        text,
        currentDemo,
        context,
        controller.signal,
      );
      if (!controller.signal.aborted) applyPlan(plan);
    } catch (error) {
      if (!controller.signal.aborted)
        setConfirmation(
          error instanceof Error ? error.message : "Apertus request failed.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
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
      setConfirmation("Saved the initial experiment recipe.");
    } catch (error) {
      setConfirmation(
        error instanceof Error ? error.message : "Unable to save recipe.",
      );
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
      setConfirmation(null);
    }
  };

  if (phase === "catalog") {
    return (
      <div className="pg-shell pg-shell--center">
        <header className="pg-prompt-nav">
          <Link href="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              ✳
            </span>{" "}
            apertus<span className="brand__suffix">/ experiments</span>
          </Link>
          <Link href="/">← Back to the lab</Link>
        </header>
        <ExperimentCatalog error={confirmation} />
      </div>
    );
  }

  return (
    <div className="pg-shell">
      <header className="pg-shell__top">
        <button type="button" className="pg-shell__back" onClick={goHome}>
          ← Experiments
        </button>
        <span className="pg-shell__title">
          {demo ? premadeExperiments[demo].title : ""}
        </span>
        <button
          type="button"
          onClick={downloadRecipe}
          disabled={phase !== "ready"}
        >
          Save recipe
        </button>
        <Link href="/" className="pg-shell__home">
          Home
        </Link>
      </header>

      {phase === "ready" && demo && <ExperimentView demo={demo} />}

      {youngLearner ? (
        <details className="pg-grownup-prompts">
          <summary>More tools for grown-ups</summary>
          <CommandBar
            placeholder="Ask Apertus to change something..."
            chips={demo && phase === "ready" ? CHIPS[demo] : []}
            disabled={phase !== "ready" || busy}
            confirmation={confirmation}
            onSubmit={onPrompt}
          />
        </details>
      ) : (
        <CommandBar
          placeholder="Ask Apertus to change something..."
          chips={demo && phase === "ready" ? CHIPS[demo] : []}
          disabled={phase !== "ready" || busy}
          confirmation={confirmation}
          onSubmit={onPrompt}
        />
      )}
    </div>
  );
}
