"use client";

import dynamic from "next/dynamic";
import { useContext, useState } from "react";
import LoadingState from "../../../../app/_components/LoadingState";
import { requireValue } from "../../authoring-engine/requireValue";
import type { DocumentRuntime } from "../../runtime-engine/DocumentRuntime";
import type { ComponentInstance } from "../../authoring-engine/document";
import type { ModelInstance } from "../../../registry/contracts/domainContribution";
import { DragHandleControl } from "../../../legacy/components/controls/DragHandleControl";
import type { eclipseGeometry } from "../../../legacy/components/systems/exploration/eclipse";
import type { SpringState } from "../../../legacy/components/systems/exploration/spring";
import {
  AcidBaseTitrationVisual,
  BeakerVisual,
  BeerLambertVisual,
  GalvanicCellVisual,
  GasEquilibriumVisual,
  MoleculeVisual,
  PhaseChangeVisual,
  ReactionCurveVisual,
} from "../../../legacy/components/visuals/chemistry/ChemistryVisuals";
import {
  GrowthVisual,
  QueueVisual,
  TrafficVisual,
} from "../../../legacy/components/visuals/dynamic-systems/DynamicVisuals";
import {
  CoordinateAxesVisual,
  DimensionLabelVisual,
  RatioBarVisual,
} from "../../../legacy/components/visuals/ElementaryVisuals";
import { FoodWebVisual } from "../../../legacy/components/visuals/ecology/FoodWebVisual";
import { NutrientLimitationVisual } from "../../../legacy/components/visuals/ecology/NutrientLimitationVisual";
import { WildfireComparisonVisual } from "../../../legacy/components/visuals/ecology/WildfireComparisonVisual";
import {
  CostAndProfitVisual,
  MarketEquilibriumVisual,
  MonopolyPricingVisual,
  PriceElasticityVisual,
  TradeAndTariffsVisual,
} from "../../../legacy/components/visuals/economics/EconomicsVisuals";
import { EclipseVisual } from "../../../legacy/components/visuals/exploration/EclipseVisual";
import { SpringVisual } from "../../../legacy/components/visuals/exploration/SpringVisual";
import {
  DiffusionHeatmap,
  PlantGrowthGraph,
  PopulationGraph,
} from "../../../legacy/components/visuals/natural-systems/NaturalVisuals";
import { PendulumScene } from "../../../legacy/components/visuals/physical-systems/PendulumScene";
import {
  CircuitVisual,
  TrackVisual,
} from "../../../legacy/components/visuals/physical-systems/PhysicalVisuals";
import { LeverScene } from "../../../legacy/components/visuals/physics/LeverScene";
import { mechanicsAppearances } from "../../../legacy/components/visuals/physics/MechanicsScenes";
import { thermalOpticsAppearances } from "../../../legacy/components/visuals/physics/ThermalOpticsScenes";
import { ScienceScene } from "../../../legacy/components/visuals/science/ScienceScene";
import { ProductionComparisonVisual } from "../../../legacy/components/visuals/social-systems/ProductionComparisonVisual";
import { ArithmeticScene } from "../../../legacy/components/views/ArithmeticScene";
import { BridgeScene } from "../../../legacy/components/views/BridgeScene";
import { CycleScene } from "../../../legacy/components/views/biogeochemistry/CycleScene";
import { CountingScene } from "../../../legacy/components/views/CountingScene";
import { CrowdScene } from "../../../legacy/components/views/collective/CrowdScene";
import { FishingScene } from "../../../legacy/components/views/collective/FishingScene";
import { SelectionScene } from "../../../legacy/components/views/collective/SelectionScene";
import { VotingScene } from "../../../legacy/components/views/collective/VotingScene";
import { DatasetDisplay } from "../../../legacy/components/views/DatasetDisplay";
import { PropertyInspector } from "../../../legacy/components/views/EntityInspectorView";
import { EqualGroupsScene } from "../../../legacy/components/views/EqualGroupsScene";
import { LessonScene } from "../../../legacy/components/views/earth-atmosphere/LessonScene";
import { FractionBuilderScene } from "../../../legacy/components/views/FractionBuilderScene";
import { FractionNumberLineScene } from "../../../legacy/components/views/FractionNumberLineScene";
import { mathAnalysisAppearances } from "../../../legacy/components/views/math-analysis/MathAnalysisScenes";
import { mathGeometryAppearances } from "../../../legacy/components/views/math-geometry";
import { ProbabilityScene } from "../../../legacy/components/views/ProbabilityScene";
import { ProjectileScene } from "../../../legacy/components/views/ProjectileScene";
import { SVGWorldView } from "../../../legacy/components/views/SVGWorldView";

import { AuthorContext, SnapshotContext } from "./contexts";
import { display } from "./formatObservation";
import {
  mathBoardFor,
  projectileInstance,
  readyBridge,
  readyTown,
} from "./snapshotAdapters";

const ScopedWorld = dynamic(() => import("../../../legacy/components/views/ScopedWorldView"), {
  ssr: false,
  loading: () => (
    <LoadingState
      variant="inline"
      title="Preparing the world…"
      description="Loading the interactive view."
    />
  ),
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
  ...mathAnalysisAppearances,
  ...mathGeometryAppearances,
  "physics-lever": LeverScene,
  ...mechanicsAppearances,
  ...thermalOpticsAppearances,
  "earth-atmosphere-earthquake": LessonScene,
  "earth-atmosphere-tsunami": LessonScene,
  "earth-atmosphere-atmosphere": LessonScene,
  "earth-atmosphere-greenhouse": LessonScene,
  "earth-atmosphere-lightning": LessonScene,
  "earth-atmosphere-rainbow": LessonScene,
  "earth-atmosphere-weather": LessonScene,
  "collective-fishing": FishingScene,
  "collective-crowd": CrowdScene,
  "collective-voting": VotingScene,
  "collective-selection": SelectionScene,
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
  "chemistry-titration": AcidBaseTitrationVisual,
  "chemistry-gas-equilibrium": GasEquilibriumVisual,
  "chemistry-phase-change": PhaseChangeVisual,
  "chemistry-beer-lambert": BeerLambertVisual,
  "chemistry-galvanic-cell": GalvanicCellVisual,
  "dynamic-growth": GrowthVisual,
  "dynamic-traffic": TrafficVisual,
  "dynamic-queue": QueueVisual,
  "natural-diffusion": DiffusionHeatmap,
  "natural-predator-prey": PopulationGraph,
  "natural-plant-growth": PlantGrowthGraph,
  "economics-market-equilibrium": MarketEquilibriumVisual,
  "economics-price-elasticity": PriceElasticityVisual,
  "economics-cost-and-profit": CostAndProfitVisual,
  "economics-trade-and-tariffs": TradeAndTariffsVisual,
  "economics-monopoly-pricing": MonopolyPricingVisual,
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
  if (node.definition === "appearance/SpringMass")
    return (
      <SpringVisual
        state={snapshot.state[model.id] as unknown as SpringState}
      />
    );
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
  const onCommand = (command: import("../../../legacy/runtime/types").UIAction) =>
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
        <text x={220} y={428} textAnchor="middle" fontSize={16}>
          <tspan fill="#626c60">Point P </tspan>
          <tspan fill="#285e56" fontWeight={600}>
            ({String(x).replace("-", "−")}, {String(y).replace("-", "−")})
          </tspan>
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
  const radius = Number(instance.outputs.diameter) / 2;
  const circumference = Number(instance.outputs.circumference);
  const extent = Math.max(2, radius * 1.3);
  const width = unrolled
    ? Math.max(extent * 2, circumference + extent)
    : extent * 2;
  return (
    <figure className="circle-appearance">
      <svg
        viewBox={`${-extent} ${-extent} ${width} ${extent * 2}`}
        role="img"
        aria-label={`Circle with radius ${radius} units and circumference ${circumference} units. Dashed reference circle has radius one unit.`}
      >
        <circle
          cx="0"
          cy="0"
          r="1"
          fill="none"
          stroke="#777"
          strokeDasharray="4 4"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="0"
          cy="0"
          r={radius}
          fill="none"
          stroke="#245bcb"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-radius}
          x2={radius}
          y1="0"
          y2="0"
          stroke="#cc543d"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        {unrolled && (
          <line
            x1={-radius}
            x2={-radius + circumference}
            y1={radius * 1.15}
            y2={radius * 1.15}
            stroke="#245bcb"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <figcaption>Dashed circle: radius 1 unit.</figcaption>
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
