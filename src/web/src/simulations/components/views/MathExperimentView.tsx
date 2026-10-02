"use client";
import type { ReactNode } from "react";
import { useMathStore } from "../../runtime/mathSession";
import { getActiveDefinition } from "../../runtime/session";
import { ArithmeticControls } from "../controls/ArithmeticControls";
import { CountingControls } from "../controls/CountingControls";
import { EqualGroupsControls } from "../controls/EqualGroupsControls";
import { FractionBuilderControls } from "../controls/FractionBuilderControls";
import { FractionNumberLineControls } from "../controls/FractionNumberLineControls";
import type { MathDemo } from "../traits/MathBoards";
import { ArithmeticScene } from "./ArithmeticScene";
import { CountingScene } from "./CountingScene";
import { DomainObservationViews } from "./DomainObservationViews";
import { EqualGroupsScene } from "./EqualGroupsScene";
import { FractionBuilderScene } from "./FractionBuilderScene";
import { FractionNumberLineScene } from "./FractionNumberLineScene";
import { MathReadoutView } from "./MathReadoutView";
import "./math.css";
const lessons = {
  counting: {
    title: "One circle, one number.",
    grade: "GRADES 1–2",
    instruction:
      "Tap each circle to count it. Or try putting just enough circles in the box.",
  },
  arithmetic: {
    title: "Watch numbers come together.",
    grade: "GRADES 1–2",
    instruction:
      "Add circles to the group or take them away. Tap a circle, take one step, or press Play.",
  },
  "equal-groups": {
    title: "A fair share for every basket.",
    grade: "GRADES 2–4",
    instruction:
      "Build equal groups or share circles one at a time. Some circles may be left over.",
  },
  "fraction-builder": {
    title: "Different pieces. The same whole.",
    grade: "GRADES 4–7",
    instruction:
      "Tap pieces to shade them. Compare two bars, then split the pieces to discover equivalent fractions.",
  },
  "fraction-number-line": {
    title: "Give every fraction a place.",
    grade: "GRADE 7",
    instruction:
      "Place a fraction on the line, or follow jumps to add and subtract. Every whole is the same distance.",
  },
};
export function MathExperimentView({ demo }: { demo: MathDemo }) {
  const board = useMathStore((s) => s.board);
  if (board.demo !== demo) return null;
  const lesson = lessons[demo];
  const views = getActiveDefinition()?.components.views ?? [];
  const youngLearner =
    demo === "counting" || demo === "arithmetic" || demo === "equal-groups";
  const instruction =
    board.demo === "counting"
      ? board.mode === "count"
        ? "Watch the circles light up. Count along!"
        : `Watch ${board.target} circles go into the box.`
      : board.demo === "arithmetic"
        ? board.operation === "add"
          ? "Watch the circles come together. How many altogether?"
          : "Watch the circles go away. How many are left?"
        : board.demo === "equal-groups"
          ? "Watch the circles go into the baskets. How many in each?"
          : lesson.instruction;
  let scene: ReactNode;
  let controls: ReactNode;
  switch (board.demo) {
    case "counting":
      scene = <CountingScene board={board} />;
      controls = <CountingControls board={board} />;
      break;
    case "arithmetic":
      scene = <ArithmeticScene board={board} />;
      controls = <ArithmeticControls board={board} />;
      break;
    case "equal-groups":
      scene = <EqualGroupsScene board={board} />;
      controls = <EqualGroupsControls board={board} />;
      break;
    case "fraction-builder":
      scene = <FractionBuilderScene board={board} />;
      controls = <FractionBuilderControls board={board} />;
      break;
    case "fraction-number-line":
      scene = <FractionNumberLineScene board={board} />;
      controls = <FractionNumberLineControls board={board} />;
      break;
  }
  return (
    <main
      className={`math-experiment math-experiment--${demo}${youngLearner ? " math-experiment--young" : ""}`}
    >
      <header className="math-intro">
        <span className="math-grade">{lesson.grade} · EXPLORE MATH</span>
        <h1>{lesson.title}</h1>
        <p>{instruction}</p>
      </header>
      <div className="math-workspace">
        <section className="math-stage" aria-label="Experiment diagram">
          {views.includes("SVGWorldView") && (
            <div className="math-scene-scroll">{scene}</div>
          )}
          {!(board.demo === "counting" && board.mode === "count") && (
            <p className="math-scroll-hint">
              Swipe or scroll sideways to explore the whole diagram →
            </p>
          )}
          <MathReadoutView board={board} />
        </section>
        <aside className="math-controls" aria-label="Experiment controls">
          {!youngLearner && <h2>Try it yourself</h2>}
          {controls}
        </aside>
      </div>
      <DomainObservationViews demo={demo} />
    </main>
  );
}
