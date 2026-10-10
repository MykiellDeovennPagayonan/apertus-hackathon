"use client";

import { useContext } from "react";
import type { DocumentRuntime } from "../../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../../runtime/authoring/types";
import { publicDefinition } from "../../catalog";
import { AgentActions } from "../../controls/AgentActions";
import { FoodWebPopulationControl } from "../../controls/FoodWebPopulationControl";
import { AgentProfileView, AgentTranscriptView } from "../agents/AgentViews";
import {
  CycleAction,
  CycleActivity,
  CycleCaption,
} from "../biogeochemistry/CyclePanels";
import { MathReadoutView } from "../MathReadoutView";
import { ScienceControls, ScienceObservations } from "../SciencePanels";
import { CanvasPresentation } from "./CanvasPresentation";
import { ControlPresentation } from "./ControlPresentation";
import { SnapshotContext } from "./contexts";
import { DisplayPresentation } from "./DisplayPresentation";
import { Appearance } from "./RecipeAppearance";
import { mathBoard } from "./snapshotAdapters";

export function NodeView({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const snapshot = useContext(SnapshotContext);
  const def = publicDefinition(node.definition);
  if (node.definition === "displays/AgentProfile")
    return <AgentProfileView node={node} runtime={runtime} />;
  if (node.definition === "displays/AgentTranscript")
    return <AgentTranscriptView node={node} runtime={runtime} />;
  if (node.definition === "controls/AgentActions")
    return <AgentActions node={node} runtime={runtime} />;
  if (node.definition === "controls/FoodWebPopulation")
    return <FoodWebPopulationControl node={node} runtime={runtime} />;
  if (node.definition.startsWith("controls/science-"))
    return <ScienceControls node={node} runtime={runtime} />;
  if (node.definition === "displays/ScienceObservations")
    return <ScienceObservations node={node} runtime={runtime} />;
  if (/^controls\/cycle-(oxygen|nitrogen|carbon)-action$/.test(node.definition))
    return <CycleAction node={node} runtime={runtime} />;
  if (
    /^controls\/cycle-(oxygen|nitrogen|carbon)-activity$/.test(node.definition)
  )
    return <CycleActivity node={node} runtime={runtime} />;
  if (
    /^displays\/cycle-(oxygen|nitrogen|carbon)-caption$/.test(node.definition)
  )
    return <CycleCaption node={node} runtime={runtime} />;
  if (def.category === "models") return null;
  if (def.category === "controls")
    return <ControlPresentation node={node} runtime={runtime} />;
  if (def.category === "appearance") {
    const modelBinding = runtime.document.connections.find(
      (c) =>
        c.kind === "attachment" &&
        c.to.node === node.id &&
        c.to.port === "model",
    );
    const board = modelBinding
      ? mathBoard(snapshot.outputs[modelBinding.from.node]?.board)
      : undefined;
    return (
      <div className="recipe-scene-content">
        <Appearance node={node} runtime={runtime} />
        {board &&
          !runtime.document.connections.some(
            (link) =>
              link.kind === "value" &&
              link.from.node === modelBinding?.from.node &&
              link.from.port === "board",
          ) && <MathReadoutView board={board} />}
      </div>
    );
  }
  if (def.category === "displays")
    return <DisplayPresentation node={node} runtime={runtime} />;
  if (node.definition === "canvases/World")
    return <Appearance node={node} runtime={runtime} />;
  if (def.category === "canvases")
    return <CanvasPresentation node={node} runtime={runtime} />;
  return null;
}
