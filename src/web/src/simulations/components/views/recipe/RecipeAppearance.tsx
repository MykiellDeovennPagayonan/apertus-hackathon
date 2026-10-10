"use client";

import dynamic from "next/dynamic";
import { useContext, useState } from "react";
import { requireValue } from "../../../runtime/authoring/requireValue";
import type { DocumentRuntime } from "../../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../../runtime/authoring/types";
import type { ModelInstance } from "../../../runtime/contribution";
import { DragHandleControl } from "../../controls/DragHandleControl";
import type { eclipseGeometry } from "../../systems/exploration/eclipse";
import {
  BeakerVisual,
  MoleculeVisual,
  ReactionCurveVisual,
} from "../../visuals/chemistry/ChemistryVisuals";
import {
  GrowthVisual,
  QueueVisual,
  TrafficVisual,
} from "../../visuals/dynamic-systems/DynamicVisuals";
import {
  CoordinateAxesVisual,
  DimensionLabelVisual,
  RatioBarVisual,
} from "../../visuals/ElementaryVisuals";
import { FoodWebVisual } from "../../visuals/ecology/FoodWebVisual";
import { NutrientLimitationVisual } from "../../visuals/ecology/NutrientLimitationVisual";
import { WildfireComparisonVisual } from "../../visuals/ecology/WildfireComparisonVisual";
import { EclipseVisual } from "../../visuals/exploration/EclipseVisual";
import {
  DiffusionHeatmap,
  PlantGrowthGraph,
  PopulationGraph,
} from "../../visuals/natural-systems/NaturalVisuals";
import { PendulumScene } from "../../visuals/physical-systems/PendulumScene";
import {
  CircuitVisual,
  TrackVisual,
} from "../../visuals/physical-systems/PhysicalVisuals";
import { ScienceScene } from "../../visuals/science/ScienceScene";
import { ProductionComparisonVisual } from "../../visuals/social-systems/ProductionComparisonVisual";
import { ArithmeticScene } from "../ArithmeticScene";
import { BridgeScene } from "../BridgeScene";
import { CycleScene } from "../biogeochemistry/CycleScene";
import { CountingScene } from "../CountingScene";
import { DatasetDisplay } from "../DatasetDisplay";
import { PropertyInspector } from "../EntityInspectorView";
import { EqualGroupsScene } from "../EqualGroupsScene";
import { FractionBuilderScene } from "../FractionBuilderScene";
import { FractionNumberLineScene } from "../FractionNumberLineScene";
import { ProbabilityScene } from "../ProbabilityScene";
import { ProjectileScene } from "../ProjectileScene";
import { SVGWorldView } from "../SVGWorldView";

import { AuthorContext, SnapshotContext } from "./contexts";
import { display } from "./formatObservation";
import {
  mathBoardFor,
  projectileInstance,
  readyBridge,
  readyTown,
} from "./snapshotAdapters";

const ScopedWorld = dynamic(() => import("../ScopedWorldView"), {
  ssr: false,
  loading: () => <output>Loading world…</output>,
});

const appearances: Record<
  string,
  (p: {
    instance: ModelInstance;
    onSelect?: (selection: number) => void;
    onCommand?: (command: string, value?: unknown) => void;
    question?: string;
  }) => React.ReactNode
> = {
  "cycle-oxygen": CycleScene,
  "cycle-nitrogen": CycleScene,
  "cycle-carbon": CycleScene,
  "science-cell": ScienceScene,
  "science-immune": ScienceScene,
  "science-genome": ScienceScene,
  "science-pollination": ScienceScene,
  "science-invasive": ScienceScene,
  "science-earth": ScienceScene,
  "science-plates": ScienceScene,
  "science-volcano": ScienceScene,
  "science-water": ScienceScene,
  "ecology-nutrients": NutrientLimitationVisual,
  "ecology-wildfire": WildfireComparisonVisual,
  "ecology-food-web": FoodWebVisual,
  "social-production": ProductionComparisonVisual,
  "chemistry-dilution": BeakerVisual,
  "chemistry-conservation": MoleculeVisual,
  "chemistry-rate": ReactionCurveVisual,
  "dynamic-growth": GrowthVisual,
  "dynamic-traffic": TrafficVisual,
  "dynamic-queue": QueueVisual,
  "natural-diffusion": DiffusionHeatmap,
  "natural-predator-prey": PopulationGraph,
  "natural-plant-growth": PlantGrowthGraph,
};
function PhysicalAppearance({ instance }: { instance: ModelInstance }) {
  if (instance.provider.endsWith("/Pendulum"))
    return <PendulumScene instance={instance} />;
  if (instance.provider.endsWith("/RollingTrack")) {
    const extent = Math.max(
      1,
      Number(instance.outputs.distance),
      Number(instance.outputs.stoppingDistance) || 0,
    );
    return (
      <svg viewBox="0 0 560 240" role="img" aria-label={instance.label}>
        <TrackVisual instance={instance} index={0} extent={extent * 1.1} />
      </svg>
    );
  }
  return <CircuitVisual instance={instance} />;
}
export function Appearance({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const author = useContext(AuthorContext);
  const snapshot = useContext(SnapshotContext);
  const model = runtime.attached(node.id);
  if (!model)
    return (
      <p>
        {author.authoring
          ? "Connect a model to this appearance."
          : "This scene is waiting for its activity."}
      </p>
    );
  const visualLayers = runtime.document.connections
    .filter((c) => c.to.node === node.id && c.to.port === "visuals")
    .map((c) => runtime.document.nodes.find((n) => n.id === c.from.node))
    .filter((n) => n?.configuration.visible)
    .map((n) => requireValue(n).definition);
  if (node.definition === "appearance/Bridge") {
    const state = readyBridge(snapshot.state[model.id]);
    if (!state)
      return (
        <p>
          {author.authoring
            ? "Connect truss joints, members and a load."
            : "The bridge is waiting for its structure."}
        </p>
      );
    const load = runtime.document.connections.find(
      (c) => c.to.node === model.id && c.to.port === "load",
    );
    return (
      <BridgeScene
        visualLayers={visualLayers}
        state={state}
        onCommand={(c) =>
          runtime.dispatch([
            {
              node:
                c.type === "MOVE_LOAD"
                  ? (load?.from.node ?? model.id)
                  : model.id,
              command: c.type,
              arguments: { value: c.value },
            },
          ])
        }
      />
    );
  }
  if (node.definition === "appearance/Projectile") {
    const models = runtime.document.connections
      .filter(
        (link) =>
          link.kind === "attachment" &&
          link.to.node === node.id &&
          link.to.port === "model",
      )
      .map((link) => link.from.node);
    const instances = models
      .map((id) => projectileInstance(snapshot.outputs[id]?.data))
      .filter((instance) => instance !== undefined);
    const instance = instances[0];
    if (!instance) return <p>The flight is ready to launch.</p>;
    return (
      <ProjectileScene
        visualLayers={visualLayers}
        state={{
          primary: instance,
          instances,
          angle: instance.launch.angle,
          velocity: instance.launch.velocity,
          gravity: instance.gravity,
          showVectors: Boolean(snapshot.state[model.id].showVectors),
        }}
      />
    );
  }
  if (node.definition === "canvases/World") {
    const state = readyTown(snapshot.state[model.id]);
    return state ? (
      <ScopedWorld
        state={state}
        appearances={runtime.document.connections
          .filter((c) => c.to.node === node.id && c.to.port === "scene")
          .map((c) =>
            requireValue(
              runtime.document.nodes.find((n) => n.id === c.from.node),
            ),
          )
          .filter(Boolean)}
      />
    ) : (
      <p>
        {author.authoring
          ? "Connect buildings, daily routines and a market."
          : "The town is waiting for its activity setup."}
      </p>
    );
  }
  const instance: ModelInstance = {
    id: model.id,
    label: model.label,
    provider: model.definition,
    parameters: Object.fromEntries(
      Object.keys(model.configuration).map((key) => [
        key,
        snapshot.state[model.id]?.[key] ?? model.configuration[key],
      ]),
    ),
    state: snapshot.state[model.id],
    outputs: snapshot.outputs[model.id],
  };
  if (node.definition === "appearance/EclipseGeometry")
    return (
      <EclipseVisual
        geometry={
          instance.outputs.geometry as ReturnType<typeof eclipseGeometry>
        }
      />
    );
  if (node.definition === "appearance/SignalSuperposition")
    return (
      <DatasetDisplay
        value={instance.outputs.points}
        kind="Chart"
        label="Sound signals and their sum"
        presentation={{
          xKey: "x",
          xLabel: "Time",
          xUnit: "s",
          yLabel: "Pressure",
          yUnit: "Pa",
          series: ["first", "second", "y"],
          columns: [
            { key: "x", label: "Time", unit: "s", type: "number" },
            { key: "first", label: "Noise", unit: "Pa", type: "number" },
            {
              key: "second",
              label: "Counter signal",
              unit: "Pa",
              type: "number",
            },
            { key: "y", label: "Sum", unit: "Pa", type: "number" },
          ],
        }}
      />
    );
  const name = node.definition.slice("appearance/".length),
    View = appearances[name];
  if (View)
    return (
      <View
        instance={instance}
        question={
          name.startsWith("science-") || name.startsWith("cycle-")
            ? String(
                node.configuration.question ||
                  runtime.document.lesson.instruction,
              )
            : undefined
        }
        onCommand={(command, value) =>
          runtime.dispatch([
            {
              node: model.id,
              command,
              arguments: value === undefined ? {} : { value },
            },
          ])
        }
        onSelect={(selection) =>
          runtime.dispatch([
            {
              node: model.id,
              command: "WEB_SET_SELECTION",
              arguments: { value: selection },
            },
          ])
        }
      />
    );
  if (name.startsWith("physical-"))
    return <PhysicalAppearance instance={instance} />;
  const onCommand = (command: import("../../../runtime/types").UIAction) =>
    runtime.dispatch([
      {
        node: model.id,
        command: command.type,
        arguments: command.value === undefined ? {} : { value: command.value },
      },
    ]);
  if (name === "counting") {
    const board = mathBoardFor(instance.state, "counting");
    if (!board) return <p>This scene is waiting for its activity.</p>;
    return <CountingScene board={board} onCommand={onCommand} />;
  }
  if (name === "arithmetic") {
    const board = mathBoardFor(instance.state, "arithmetic");
    if (!board) return <p>This scene is waiting for its activity.</p>;
    return <ArithmeticScene board={board} onCommand={onCommand} />;
  }
  if (name === "equal-groups") {
    const board = mathBoardFor(instance.state, "equal-groups");
    if (!board) return <p>This scene is waiting for its activity.</p>;
    return <EqualGroupsScene onCommand={onCommand} board={board} />;
  }
  if (name === "fraction-builder") {
    const board = mathBoardFor(instance.state, "fraction-builder");
    if (!board) return <p>This scene is waiting for its activity.</p>;
    return <FractionBuilderScene board={board} onCommand={onCommand} />;
  }
  if (name === "fraction-number-line") {
    const board = mathBoardFor(instance.state, "fraction-number-line");
    if (!board) return <p>This scene is waiting for its activity.</p>;
    return <FractionNumberLineScene board={board} onCommand={onCommand} />;
  }
  if (name === "ratio")
    return <RatioBarVisual ratio={Number(instance.outputs.ratio)} />;
  if (name === "area-perimeter")
    return (
      <DimensionLabelVisual
        width={Number(instance.state.width)}
        height={Number(instance.state.height)}
      />
    );
  if (name === "probability")
    return (
      <ProbabilityScene
        frequencies={
          instance.outputs.frequencies as {
            outcome: string;
            observed: number;
            expected: number;
          }[]
        }
        trials={Number(instance.state.trials)}
        preset={String(instance.state.preset)}
      />
    );
  if (name === "coordinates") {
    const x = Number(instance.outputs.x),
      y = Number(instance.outputs.y);
    return (
      <SVGWorldView
        role="group"
        viewBox="0 0 440 440"
        aria-label="Interactive coordinate plane"
      >
        <CoordinateAxesVisual />
        <path
          d={`M${220 + x * 18} 220V${220 - y * 18}H220`}
          fill="none"
          stroke="#ad7629"
          strokeDasharray="5 4"
          strokeWidth={2}
        />
        <text x={40} y={430} fontSize={18} fill="#285e56">
          Point ({x}, {y}) · x first, then y
        </text>
        <circle cx={220 + x * 18} cy={220 - y * 18} r={6} fill="#245bcb" />
        <DragHandleControl
          target={model.id}
          cx={220 + x * 18}
          cy={220 - y * 18}
          keyboardStep={18}
          label="Move coordinate point"
          onCommand={onCommand}
          map={(px, py) => ({
            type: "MOVE_POINT",
            value: {
              x: Math.max(
                -10,
                Math.min(10, Math.round(((px - 220) / 18) * 10) / 10),
              ),
              y: Math.max(
                -10,
                Math.min(10, Math.round(((220 - py) / 18) * 10) / 10),
              ),
            },
          })}
        />
      </SVGWorldView>
    );
  }
  if (name === "line")
    return (
      <DatasetDisplay
        value={instance.outputs.points}
        kind="Chart"
        label={String(instance.outputs.equation)}
      />
    );
  if (name === "circle") return <CircleAppearance instance={instance} />;
  if (name === "balance")
    return (
      <div>
        <h2>{display(instance.outputs.equation)}</h2>
        <p>{display(instance.outputs.substitution)}</p>
        <DatasetDisplay
          value={instance.outputs.steps}
          kind="DataTable"
          label="Equation steps"
        />
      </div>
    );
  return (
    <PropertyInspector
      label={instance.label || "Observations"}
      value={instance.outputs}
    />
  );
}
function CircleAppearance({ instance }: { instance: ModelInstance }) {
  const [unrolled, setUnrolled] = useState(false);
  return (
    <figure>
      <svg
        viewBox="0 0 500 260"
        role="img"
        aria-label="Circle circumference and diameter"
      >
        <circle
          cx="130"
          cy="120"
          r="80"
          fill="none"
          stroke="#245bcb"
          strokeWidth="3"
        />
        <line
          x1="50"
          x2="210"
          y1="120"
          y2="120"
          stroke="#cc543d"
          strokeWidth="3"
        />
        {unrolled && (
          <line
            x1="15"
            x2="485"
            y1="235"
            y2="235"
            stroke="#245bcb"
            strokeWidth="3"
          />
        )}
        <text x="235" y="100">
          Diameter {display(instance.outputs.diameter)}
        </text>
        <text x="235" y="130">
          Around {display(instance.outputs.circumference)}
        </text>
      </svg>
      <button
        type="button"
        aria-pressed={unrolled}
        onClick={() => setUnrolled((v) => !v)}
      >
        {unrolled ? "Roll back up" : "Unroll the edge"}
      </button>
    </figure>
  );
}
