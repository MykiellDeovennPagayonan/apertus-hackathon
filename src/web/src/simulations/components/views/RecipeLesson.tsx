"use client";

import dynamic from "next/dynamic";
import { convertToBoard } from "../../runtime/authoring/board";
import { requireValue } from "../../runtime/authoring/requireValue";
import { BridgeScene } from "./BridgeScene";
import { SpatialBoard } from "./board/SpatialBoard";
import { MemberInspector } from "./MemberInspector";
import { ProjectileScene } from "./ProjectileScene";

const ScopedWorld = dynamic(() => import("./ScopedWorldView"), {
  ssr: false,
  loading: () => <output>Loading world…</output>,
});

import { MotionConfig } from "framer-motion";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DocumentRuntime,
  type Snapshot,
} from "../../runtime/authoring/runtime";
import type {
  AuthoredDocument,
  ComponentInstance,
  Layout,
} from "../../runtime/authoring/types";
import type { CompositionScene } from "../../runtime/composition/types";
import type { ModelInstance } from "../../runtime/contribution";
import { object } from "../../runtime/parameterSchema";
import { publicDefinition } from "../catalog";
import { schemaDefault } from "../composites/catalog";
import { ActionButton } from "../controls/ActionButton";
import {
  acceptedCommandArguments,
  commandPresentation,
} from "../controls/commandPresentation";
import { DragHandleControl } from "../controls/DragHandleControl";
import { SchemaForm } from "../controls/SchemaForm";
import type { MathBoard } from "../traits/MathBoards";
import type { SceneObject } from "../traits/SceneObjects";
import {
  BeakerVisual,
  MoleculeVisual,
  ReactionCurveVisual,
} from "../visuals/chemistry/ChemistryVisuals";
import {
  GrowthVisual,
  QueueVisual,
  TrafficVisual,
} from "../visuals/dynamic-systems/DynamicVisuals";
import {
  CoordinateAxesVisual,
  DimensionLabelVisual,
  RatioBarVisual,
} from "../visuals/ElementaryVisuals";
import {
  DiffusionHeatmap,
  PlantGrowthGraph,
  PopulationGraph,
} from "../visuals/natural-systems/NaturalVisuals";
import {
  CircuitVisual,
  PendulumVisual,
  TrackVisual,
} from "../visuals/physical-systems/PhysicalVisuals";
import { ArithmeticScene } from "./ArithmeticScene";
import { CompositionCanvas } from "./CompositionCanvas";
import { CountingScene } from "./CountingScene";
import { DatasetDisplay } from "./DatasetDisplay";
import {
  type DataPresentation,
  formatDataNumber,
  outputDataPresentation,
} from "./dataPresentation";
import { PropertyInspector } from "./EntityInspectorView";
import { EqualGroupsScene } from "./EqualGroupsScene";
import { FractionBuilderScene } from "./FractionBuilderScene";
import { FractionNumberLineScene } from "./FractionNumberLineScene";
import { MathReadoutView } from "./MathReadoutView";
import { SVGWorldView } from "./SVGWorldView";
import { useReducedMotion } from "./useCompactDiagram";
import "./recipe-lesson.css";
import "./chemistry/ChemistryLesson.css";
import "./dynamic-systems/DynamicSystemsLesson.css";
import "./natural-systems/natural-systems.css";
import "./math.css";

type AuthorControls = {
  authoring?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onAuthorChange?: (node: SceneObject) => void;
  onCanvasChange?: (
    nodeId: string,
    viewport: Pick<
      CompositionScene["canvas"],
      "xMin" | "xMax" | "yMin" | "yMax"
    >,
  ) => void;
};

function EntityPickerControl({
  label,
  candidates,
  value,
  onSelect,
}: {
  label: string;
  candidates: ComponentInstance[];
  value: string;
  onSelect: (value: string) => import("../../runtime/commands").ActionResult;
}) {
  const [accepted, setAccepted] = useState(value);
  const [error, setError] = useState("");
  const feedbackId = useId();
  useEffect(() => {
    setAccepted(value);
    setError("");
  }, [value]);
  const displayLabel = (candidate: ComponentInstance, index: number) => {
    const internalName = candidate.id.split("/").at(-1) ?? candidate.id;
    return candidate.label === candidate.id || candidate.label === internalName
      ? `${publicDefinition(candidate.definition).title} ${index + 1}`
      : candidate.label;
  };
  const selectedIndex = candidates.findIndex(
    (candidate) => candidate.id === accepted,
  );
  const selectedLabel =
    selectedIndex >= 0
      ? displayLabel(candidates[selectedIndex], selectedIndex)
      : undefined;
  return (
    <div className="entity-picker">
      <label>
        <span>{label}</span>
        <select
          value={accepted}
          disabled={!candidates.length}
          aria-invalid={!!error || undefined}
          aria-describedby={error || selectedLabel ? feedbackId : undefined}
          onChange={(event) => {
            const next = event.target.value;
            const result = onSelect(next);
            if (result.accepted) {
              setAccepted(next);
              setError("");
            } else setError(result.error);
          }}
        >
          <option value="" disabled>
            {candidates.length ? "Choose an object" : "No compatible objects"}
          </option>
          {candidates.map((candidate, index) => (
            <option key={candidate.id} value={candidate.id}>
              {displayLabel(candidate, index)}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <span
          id={feedbackId}
          className="catalog-feedback catalog-feedback--error"
          role="alert"
        >
          {error}
        </span>
      ) : selectedLabel ? (
        <p
          id={feedbackId}
          className="entity-picker__accepted"
          aria-live="polite"
        >
          Selected: {selectedLabel}
        </p>
      ) : null}
    </div>
  );
}
const MotionContext = createContext(true);
const AuthorContext = createContext<AuthorControls>({});
const SnapshotContext = createContext<Snapshot>({ state: {}, outputs: {} });
const appearances: Record<
  string,
  (p: { instance: ModelInstance }) => React.ReactNode
> = {
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
    return (
      <svg viewBox="0 0 300 340" role="img" aria-label={instance.label}>
        <PendulumVisual
          instance={instance}
          index={0}
          scale={220 / Math.max(1, Number(instance.parameters.length))}
        />
      </svg>
    );
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
const display = (v: unknown, precision = 3): string =>
  typeof v === "number"
    ? Number.isFinite(v)
      ? formatDataNumber(v, precision)
      : "Unavailable"
    : typeof v === "string"
      ? v
      : typeof v === "boolean"
        ? v
          ? "Yes"
          : "No"
        : v === undefined || v === null
          ? "Unavailable"
          : Array.isArray(v)
            ? `${v.length} items`
            : "Structured observation";
function Appearance({
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
    const state = snapshot.state[model.id];
    if (!state?.ready)
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
        state={
          state as unknown as import("../../runtime/bridgeSession").BridgeState
        }
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
    const instance = snapshot.outputs[model.id]
      ?.data as unknown as import("../../runtime/projectileSession").ProjectileInstance;
    return (
      <ProjectileScene
        visualLayers={visualLayers}
        state={{
          primary: instance,
          instances: [instance],
          angle: instance.launch.angle,
          velocity: instance.launch.velocity,
          gravity: instance.gravity,
          showVectors: Boolean(snapshot.state[model.id].showVectors),
        }}
      />
    );
  }
  if (node.definition === "canvases/World") {
    const state = snapshot.state[model.id];
    return state?.ready ? (
      <ScopedWorld
        state={
          state as unknown as import("../../runtime/townModel").TownModelState
        }
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
    parameters: model.configuration,
    state: snapshot.state[model.id],
    outputs: snapshot.outputs[model.id],
  };
  const name = node.definition.slice("appearance/".length),
    View = appearances[name];
  if (View) return <View instance={instance} />;
  if (name.startsWith("physical-"))
    return <PhysicalAppearance instance={instance} />;
  const board = instance.state as unknown as MathBoard;
  const onCommand = (command: import("../../runtime/types").UIAction) =>
    runtime.dispatch([
      {
        node: model.id,
        command: command.type,
        arguments: command.value === undefined ? {} : { value: command.value },
      },
    ]);
  if (name === "counting")
    return (
      <CountingScene
        board={board as Extract<MathBoard, { demo: "counting" }>}
        onCommand={onCommand}
      />
    );
  if (name === "arithmetic")
    return (
      <ArithmeticScene
        board={board as Extract<MathBoard, { demo: "arithmetic" }>}
        onCommand={onCommand}
      />
    );
  if (name === "equal-groups")
    return (
      <EqualGroupsScene
        board={board as Extract<MathBoard, { demo: "equal-groups" }>}
      />
    );
  if (name === "fraction-builder")
    return (
      <FractionBuilderScene
        board={board as Extract<MathBoard, { demo: "fraction-builder" }>}
        onCommand={onCommand}
      />
    );
  if (name === "fraction-number-line")
    return (
      <FractionNumberLineScene
        board={board as Extract<MathBoard, { demo: "fraction-number-line" }>}
        onCommand={onCommand}
      />
    );
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
      <DatasetDisplay
        value={instance.outputs.frequencies}
        kind="Histogram"
        label="Observed and expected frequencies"
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
/** The host owns authored commits; dragging is a local preview until completion. */
function CanvasPresentation({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const author = useContext(AuthorContext);
  const snapshot = useContext(SnapshotContext);
  const [draft, setDraft] = useState<{
    source: string;
    object: SceneObject;
  } | null>(null);
  const kind = node.definition.split("/")[1] as CompositionScene["kind"];
  const accepted = runtime.document.connections
    .filter(
      (connection) =>
        connection.kind === "attachment" &&
        connection.to.node === node.id &&
        connection.to.port === "objects",
    )
    .map(
      (connection) =>
        snapshot.state[connection.from.node] as unknown as SceneObject,
    );
  const source = JSON.stringify(accepted);
  const preview = draft?.source === source ? draft.object : null;
  const objects = accepted.map((object) =>
    object.id === preview?.id ? preview : object,
  );
  const scene: CompositionScene = {
    version: 2,
    kind,
    canvas: author.authoring
      ? {
          ...(node.configuration as unknown as CompositionScene["canvas"]),
          backgroundColor:
            (node.configuration.backgroundColor as string | undefined) ??
            "#fffdf7",
          borderColor:
            (node.configuration.borderColor as string | undefined) ?? "#d5cdbb",
          showNavigation: true,
          showAbout: true,
        }
      : (node.configuration as unknown as CompositionScene["canvas"]),
    objects,
    controls: [],
    measurements: [],
  };
  return (
    <>
      <CompositionCanvas
        scene={scene}
        people={
          (snapshot.state[
            runtime.document.connections.find(
              (connection) =>
                connection.to.node === node.id &&
                connection.to.port === "timeline",
            )?.from.node ?? ""
          ]?.people ??
            []) as import("../systems/ScheduledTripSystem").PersonSnapshot[]
        }
        selected={author.selected ?? ""}
        authoring={author.authoring ?? false}
        active
        resetToken={node.id}
        onSelect={author.onSelect ?? (() => {})}
        onChange={(object) => {
          if (author.authoring) setDraft({ source, object });
        }}
        onCommit={(object) => {
          setDraft(null);
          if (author.authoring) author.onAuthorChange?.(object);
        }}
        onCanvasCommit={(viewport) => {
          if (author.authoring) author.onCanvasChange?.(node.id, viewport);
        }}
        onPiece={(id, index) =>
          runtime.dispatch([
            { node: id, command: "togglePiece", arguments: { index } },
          ])
        }
      />
      {preview &&
        JSON.stringify(preview) !==
          JSON.stringify(
            accepted.find((object) => object.id === preview.id),
          ) && (
          <output className="catalog-help" aria-live="polite">
            Previewing geometry. Release to apply; Escape cancels.
          </output>
        )}
    </>
  );
}
function NodeView({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const author = useContext(AuthorContext);
  const snapshot = useContext(SnapshotContext);
  const animated = useContext(MotionContext);
  const def = publicDefinition(node.definition),
    config = node.configuration;
  if (def.category === "models") return null;
  if (def.category === "controls") {
    const connection = runtime.document.connections.find(
      (c) => c.kind === "command" && c.from.node === node.id,
    );
    const target = runtime.document.nodes.find(
      (n) => n.id === connection?.to.node,
    );
    const command =
      target && connection
        ? publicDefinition(target.definition).commands[connection.to.port]
        : undefined;
    if (!command)
      return (
        <div className="recipe-disconnected">
          <strong>{String(config.label || node.label)}</strong>
          <p>
            {author.authoring
              ? "Connect this control to a compatible model command."
              : "This control is unavailable in the current activity."}
          </p>
        </div>
      );
    const commandKey = connection?.to.port ?? "";
    const metadata = commandPresentation(commandKey, target?.definition ?? "");
    const defaultLabel = String(config.label);
    const label =
      metadata.label &&
      (defaultLabel === command.description ||
        defaultLabel === commandKey.replaceAll("_", " "))
        ? metadata.label
        : defaultLabel;
    if (
      /SET_(RATE_)?PLAYING$/.test(commandKey) ||
      commandKey === "set:playing" ||
      commandKey === "PHYS_PLAY"
    ) {
      const playing =
        (snapshot.outputs[target?.id ?? ""]?.playing ??
          snapshot.state[target?.id ?? ""]?.playing ??
          (
            snapshot.state[target?.id ?? ""]?.inputs as
              | Record<string, unknown>
              | undefined
          )?.playing) === true;
      return (
        <div className="recipe-playback">
          <ActionButton
            intent="primary"
            onCommand={() => runtime.submit(node.id, { value: !playing })}
          >
            {playing ? "Pause" : "Play"}
          </ActionButton>
          <span className="recipe-playback-state">
            {playing
              ? animated
                ? "Running"
                : "Ready; automatic motion paused"
              : "Paused"}
          </span>
        </div>
      );
    }
    if (node.definition === "controls/EntityPicker") {
      const argument =
          command.arguments.type === "object"
            ? Object.entries(command.arguments.properties).find(
                ([, schema]) => schema.type === "string",
              )?.[0]
            : undefined,
        targetDefinition = String(config.targetDefinition),
        candidates = runtime.document.nodes.filter(
          (candidate) =>
            candidate.scope === target?.scope &&
            (!targetDefinition || candidate.definition === targetDefinition),
        );
      if (!argument)
        return (
          <div className="recipe-disconnected">
            <strong>{label}</strong>
            <p>
              {author.authoring
                ? "Choose a command with a component-reference argument in Connections."
                : "Object selection is unavailable in the current activity."}
            </p>
          </div>
        );
      const targetState = snapshot.state[target?.id ?? ""];
      const acceptedReference = String(
        targetState?.[argument] ??
          (commandKey === "SELECT_MEMBER"
            ? targetState?.selectedMember
            : commandKey.startsWith("set:")
              ? targetState?.[commandKey.slice(4)]
              : "") ??
          "",
      );
      return (
        <EntityPickerControl
          label={label}
          candidates={candidates}
          value={acceptedReference}
          onSelect={(value) => runtime.submit(node.id, { [argument]: value })}
        />
      );
    }
    let initial: unknown;
    try {
      initial = JSON.parse(String(config.initial));
    } catch {
      initial = schemaDefault(command.arguments);
    }
    const state = snapshot.state[target?.id ?? ""];
    const current = acceptedCommandArguments(
      commandKey,
      state,
      initial as Record<string, unknown>,
    );
    return (
      <SchemaForm
        key={`${node.id}/${connection?.to.node}/${connection?.to.port}/${config.initial}`}
        widget={node.definition.split("/")[1]}
        schema={
          node.definition === "controls/Button" ? object({}) : command.arguments
        }
        initial={node.definition === "controls/Button" ? {} : initial}
        current={current}
        currentRevision={
          commandKey === "SET_BAR_FRACTION"
            ? JSON.stringify(state?.bars)
            : undefined
        }
        currentForDraft={
          commandKey === "SET_BAR_FRACTION"
            ? (draft) => acceptedCommandArguments(commandKey, state, draft)
            : undefined
        }
        label={label}
        presentation={metadata.presentation}
        submitLabel={metadata.submitLabel}
        actionIntent={metadata.actionIntent}
        mode={
          command.submission === "continuous" && config.mode === "immediate"
            ? "immediate"
            : "submit"
        }
        onSubmit={(args) => runtime.submit(node.id, args)}
      />
    );
  }
  if (def.category === "appearance") {
    const modelBinding = runtime.document.connections.find(
      (c) =>
        c.kind === "attachment" &&
        c.to.node === node.id &&
        c.to.port === "model",
    );
    const board = modelBinding
      ? (snapshot.outputs[modelBinding.from.node]?.board as
          | MathBoard
          | undefined)
      : undefined;
    return (
      <div className="recipe-scene-content">
        <Appearance node={node} runtime={runtime} />
        {board && <MathReadoutView board={board} />}
      </div>
    );
  }
  if (node.definition === "displays/Box")
    return <div className="recipe-box-content" aria-hidden="true" />;
  if (node.definition === "displays/Text")
    return config.variant === "heading" ? (
      <h2 className="recipe-text-content is-heading">{String(config.text)}</h2>
    ) : (
      <p
        className={`recipe-text-content${config.variant === "callout" ? " is-callout" : ""}`}
      >
        {String(config.text)}
      </p>
    );
  if (node.definition === "displays/Formula") {
    const binding = runtime.document.connections.find(
        (c) => c.kind === "value" && c.to.node === node.id,
      ),
      value = binding
        ? snapshot.outputs[binding.from.node]?.[binding.from.port]
        : config.text;
    return (
      <output
        className="recipe-formula"
        aria-label={String(config.label || node.label)}
      >
        {value == null || value === ""
          ? "Formula unavailable"
          : typeof value === "number"
            ? Number.isFinite(value)
              ? value.toLocaleString(undefined, {
                  maximumFractionDigits: Number(config.precision ?? 3),
                })
              : "Formula unavailable"
            : typeof value === "string"
              ? value
              : "Formula unavailable"}
      </output>
    );
  }
  if (node.definition === "displays/Legend") {
    const binding = runtime.document.connections.find(
        (c) => c.kind === "value" && c.to.node === node.id,
      ),
      bound = binding
        ? snapshot.outputs[binding.from.node]?.[binding.from.port]
        : undefined;
    let entries: unknown = bound;
    if (entries === undefined)
      try {
        entries = JSON.parse(String(config.text));
      } catch {
        entries = [];
      }
    return (
      <ul className="recipe-legend" aria-label={String(config.label)}>
        {(Array.isArray(entries) ? entries : [])
          .slice(0, 32)
          .map((entry, index) => {
            const record: Record<string, unknown> =
              entry && typeof entry === "object"
                ? (entry as Record<string, unknown>)
                : { label: entry };
            return (
              <li key={String(record.id ?? record.label ?? index)}>
                <svg
                  aria-hidden="true"
                  width="32"
                  height="16"
                  viewBox="0 0 32 16"
                >
                  <line
                    x1="1"
                    y1="8"
                    x2="31"
                    y2="8"
                    stroke={
                      /^#[0-9a-f]{6}$/i.test(String(record.color))
                        ? String(record.color)
                        : "var(--accent)"
                    }
                    strokeWidth="3"
                    strokeDasharray={String(record.dash ?? "")}
                  />
                  {record.marker === "circle" ? (
                    <circle cx="16" cy="8" r="3" fill="var(--text)" />
                  ) : record.marker === "square" ? (
                    <rect
                      x="13"
                      y="5"
                      width="6"
                      height="6"
                      fill="var(--text)"
                    />
                  ) : null}
                </svg>
                {String(record.label ?? entry)}
              </li>
            );
          })}
      </ul>
    );
  }
  if (def.category === "displays") {
    const binding = runtime.document.connections.find(
      (c) => c.kind === "value" && c.to.node === node.id,
    );
    const value = binding
        ? snapshot.outputs[binding.from.node]?.[binding.from.port]
        : undefined,
      kind = node.definition.split("/")[1];
    if (
      kind === "StatusMessage" ||
      binding?.from.port === "feedback" ||
      (kind === "Readout" && typeof value === "boolean")
    ) {
      if (value === "" || (binding?.from.port === "feedback" && value == null))
        return null;
      const message =
        typeof value === "boolean"
          ? binding?.from.port === "playing"
            ? value
              ? "Running"
              : "Paused"
            : binding?.from.port === "balanced"
              ? value
                ? "The reaction is balanced"
                : "The reaction is not balanced yet"
              : binding?.from.port === "stopped"
                ? value
                  ? "Motion has stopped"
                  : "The object is moving"
                : ["closed", "roadClosed"].includes(binding?.from.port ?? "")
                  ? value
                    ? "Road closed"
                    : "Road open"
                  : binding?.from.port === "disturbanceActive"
                    ? value
                      ? "Braking disturbance active"
                      : "No braking disturbance"
                    : `${String(config.label)}: ${value ? "Enabled" : "Disabled"}`
          : value === undefined || value === null
            ? "Waiting for a result"
            : display(value);
      return (
        <output
          className={`recipe-status recipe-status--${String(config.tone ?? "neutral")}`}
          aria-live="polite"
        >
          <span className="recipe-status-dot" aria-hidden="true" />
          {message}
        </output>
      );
    }
    if (kind === "Readout") {
      const source = runtime.document.nodes.find(
        (candidate) => candidate.id === binding?.from.node,
      );
      const rawUnit =
        source && binding
          ? publicDefinition(source.definition).outputs[binding.from.port]?.unit
          : undefined;
      const unit = rawUnit && rawUnit !== "1" && rawUnit !== "*" ? rawUnit : "";
      const configuredLabel = String(config.label);
      const label =
        unit && configuredLabel.endsWith(` ${unit}`)
          ? configuredLabel.slice(0, -unit.length - 1)
          : configuredLabel;
      if (value && typeof value === "object")
        return (
          <PropertyInspector
            label={label}
            value={value}
            precision={Number(config.precision ?? 3)}
            unit={unit}
          />
        );
      return (
        <section className="recipe-measurement" aria-label={label}>
          <output className="recipe-measurement-value">
            {value === ""
              ? "Unavailable"
              : display(value, Number(config.precision))}
            <small>{unit}</small>
          </output>
          <span className="recipe-measurement-label">{label}</span>
        </section>
      );
    }
    if (
      kind === "Inspector" &&
      value &&
      typeof value === "object" &&
      "member" in value &&
      "response" in value
    )
      return (
        <MemberInspector
          member={
            (value as { member: import("../traits/MemberEndpoints").Member })
              .member
          }
          response={
            (
              value as {
                response: import("../traits/MemberResponse").MemberResponse;
              }
            ).response
          }
        />
      );
    if (kind === "Inspector") {
      const source = runtime.document.nodes.find(
        (candidate) => candidate.id === binding?.from.node,
      );
      const rawUnit =
        source && binding
          ? publicDefinition(source.definition).outputs[binding.from.port]?.unit
          : "";
      const unit = rawUnit && !["1", "*"].includes(rawUnit) ? rawUnit : "";
      const configuredLabel = String(config.label);
      const inspectorLabel =
        source?.definition === "models/BridgeResponse" &&
        binding?.from.port === "selected" &&
        configuredLabel.toLowerCase() === "selected"
          ? "Selected member"
          : configuredLabel;
      return (
        <PropertyInspector
          label={inspectorLabel}
          value={value}
          precision={Number(config.precision ?? 3)}
          unit={unit}
        />
      );
    }
    if (["Chart", "Histogram", "Heatmap", "DataTable"].includes(kind)) {
      const source = runtime.document.nodes.find(
        (n) => n.id === binding?.from.node,
      );
      const defaults = outputDataPresentation(
        source?.definition ?? "",
        binding?.from.port ?? "",
      );
      const presentation = {
        ...defaults,
        ...Object.fromEntries(
          Object.entries(config).filter(
            ([key]) => !["label", "precision", "tone"].includes(key),
          ),
        ),
      } as DataPresentation;
      const townActivities =
        source?.definition === "models/TownNavigation" &&
        binding?.from.port === "activity";
      const presentedValue =
        townActivities && Array.isArray(value)
          ? value.map((row) =>
              row &&
              typeof row === "object" &&
              /^town\/citizen-\d+$/.test(String(row.id))
                ? {
                    ...row,
                    id: `Person ${Number(String(row.id).split("-").at(-1)) + 1}`,
                  }
                : row,
            )
          : value;
      return (
        <DatasetDisplay
          value={presentedValue}
          kind={townActivities ? "DataTable" : kind}
          label={String(config.label)}
          precision={Number(config.precision ?? 3)}
          presentation={presentation}
          authoring={author.authoring}
        />
      );
    }
    return (
      <section aria-label={String(config.label)}>
        <strong>{String(config.label)}</strong>
        <output>{display(value, Number(config.precision))}</output>
      </section>
    );
  }
  if (node.definition === "canvases/World")
    return <Appearance node={node} runtime={runtime} />;
  if (def.category === "canvases")
    return <CanvasPresentation node={node} runtime={runtime} />;
  return null;
}
function TabsLayout({
  layout,
  runtime,
}: {
  layout: Layout;
  runtime: DocumentRuntime;
}) {
  const [active, setActive] = useState(layout.children[0]?.id ?? "");
  const tabId = useId();
  const chosen =
    layout.children.find((l) => l.id === active) ?? layout.children[0];
  return (
    <section className="recipe-layout">
      <div role="tablist" aria-label={layout.label || "Sections"}>
        {layout.children.map((l, index) => (
          <button
            type="button"
            role="tab"
            aria-selected={chosen?.id === l.id}
            tabIndex={chosen?.id === l.id ? 0 : -1}
            id={`${tabId}-tab-${index}`}
            aria-controls={`${tabId}-panel-${index}`}
            key={l.id}
            onClick={() => setActive(l.id)}
            onKeyDown={(event) => {
              const direction =
                event.key === "ArrowRight"
                  ? 1
                  : event.key === "ArrowLeft"
                    ? -1
                    : 0;
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? layout.children.length - 1
                    : direction
                      ? (index + direction + layout.children.length) %
                        layout.children.length
                      : undefined;
              if (next === undefined) return;
              event.preventDefault();
              setActive(layout.children[next].id);
              const buttons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              buttons?.[next]?.focus();
            }}
          >
            {l.label || l.kind}
          </button>
        ))}
      </div>
      {layout.children.map((child, index) => (
        <div
          key={child.id}
          role="tabpanel"
          id={`${tabId}-panel-${index}`}
          aria-labelledby={`${tabId}-tab-${index}`}
          hidden={chosen?.id !== child.id}
        >
          <LayoutView layout={child} runtime={runtime} />
        </div>
      ))}
    </section>
  );
}
function LayoutView({
  layout,
  runtime,
  item,
  boardHosted,
}: {
  layout: Layout;
  runtime: DocumentRuntime;
  item?: Record<string, unknown>;
  boardHosted?: boolean;
}) {
  const snapshot = useContext(SnapshotContext);
  const author = useContext(AuthorContext);
  const boundValue = (
    endpoint?: import("../../runtime/authoring/types").Endpoint,
  ) =>
    endpoint ? snapshot.outputs[endpoint.node]?.[endpoint.port] : undefined;
  if (layout.visibleWhen && boundValue(layout.visibleWhen) !== true)
    return null;
  const node = runtime.document.nodes.find((n) => n.id === layout.node);
  if (
    node?.definition === "displays/StatusMessage" ||
    node?.definition === "displays/Readout"
  ) {
    const binding = runtime.document.connections.find(
      (connection) =>
        connection.kind === "value" && connection.to.node === node.id,
    );
    const value = binding ? boundValue(binding.from) : undefined;
    if (
      binding?.from.port === "feedback" &&
      (value === "" || value == null) &&
      author.selected !== node.id
    )
      return null;
  }
  if (node?.definition === "layout/Repeater") {
    const binding = runtime.document.connections.find(
      (c) => c.kind === "value" && c.to.node === node.id,
    );
    const value = binding
        ? snapshot.outputs[binding.from.node]?.[binding.from.port]
        : undefined,
      rows = Array.isArray(value) ? value : [],
      field = String(node.configuration.itemKey);
    const keys = rows.map((row) =>
      row && typeof row === "object" ? String(row[field] ?? "") : "",
    );
    if (keys.some((k) => !k) || new Set(keys).size !== keys.length)
      return (
        <output className="recipe-disconnected" aria-live="polite">
          {author.authoring
            ? `Choose a unique, nonempty item key (${field}) in repeater settings.`
            : "These items are temporarily unavailable."}
        </output>
      );
    if (!rows.length)
      return (
        <p className="recipe-disconnected">
          {author.authoring && !binding
            ? "Connect a collection to show repeated items."
            : "No items to show yet."}
        </p>
      );
    // Repeater is a presentation projection; it never creates additional model instances or clocks.
    return (
      <section className="recipe-layout">
        {rows.map((row, i) => (
          <section key={keys[i]} aria-label={`Item ${keys[i]}`}>
            {layout.children.length ? (
              layout.children.map((child) => (
                <LayoutView
                  key={child.id}
                  layout={child}
                  runtime={runtime}
                  item={row}
                />
              ))
            ) : (
              <PropertyInspector label={`Item ${i + 1}`} value={row} />
            )}
          </section>
        ))}
      </section>
    );
  }
  const kind = node?.definition.startsWith("layout/")
    ? node.definition.split("/")[1].toLowerCase()
    : layout.kind;
  const nodeContent =
    node &&
    (item && node.definition === "displays/Text" ? (
      <p>
        {String(node.configuration.text).replace(
          /\{\{([a-zA-Z0-9_]+)\}\}/g,
          (_match, key) => display(item[key]),
        )}
      </p>
    ) : (
      <NodeView node={node} runtime={runtime} />
    ));
  const disconnected = node
    ? publicDefinition(node.definition).category === "controls"
      ? !runtime.document.connections.some(
          (connection) =>
            connection.kind === "command" && connection.from.node === node.id,
        )
      : publicDefinition(node.definition).category === "displays" &&
          ![
            "displays/Text",
            "displays/Box",
            "displays/Formula",
            "displays/Legend",
            "displays/DataTable",
            "displays/Chart",
            "displays/Histogram",
            "displays/Heatmap",
          ].includes(node.definition)
        ? !runtime.document.connections.some(
            (connection) =>
              connection.kind === "value" && connection.to.node === node.id,
          )
        : false
    : false;
  const content = (
    <>
      {node ? (
        <section
          className={
            author.authoring
              ? `recipe-component-item recipe-author-item${node.definition === "displays/Text" ? " recipe-text-card" : ""}${author.selected === node.id ? " is-selected" : ""}`
              : `recipe-component-item${node.definition === "displays/Text" ? " recipe-text-card" : ""}`
          }
          style={
            node.definition === "displays/Text" ||
            node.definition === "displays/Box"
              ? {
                  border: node.configuration.border
                    ? `${Number(node.configuration.borderWidth ?? 1)}px solid ${String(node.configuration.borderColor ?? "#d5cdbb")}`
                    : "none",
                  borderRadius: Number(node.configuration.borderRadius ?? 0),
                  background: String(
                    node.configuration.backgroundColor ?? "transparent",
                  ),
                  opacity: Number(node.configuration.opacity ?? 1),
                  boxShadow: "none",
                }
              : undefined
          }
          data-decoration={
            node.definition === "displays/Box" ? "box" : undefined
          }
          aria-label={
            author.authoring ? `${node.label} authoring controls` : undefined
          }
        >
          {author.authoring && !boardHosted && (
            <div className="recipe-author-label">
              <span>{node.label}</span>
              <button
                type="button"
                aria-label={`Edit ${node.label}`}
                title={`Edit ${node.label}`}
                onClick={() => author.onSelect?.(node.id)}
              >
                <span aria-hidden="true">✎</span>
              </button>
            </div>
          )}
          {author.authoring && disconnected ? (
            <div className="recipe-disconnected">
              <strong>{node.label} needs a connection</strong>
              <p>Connect it in component settings to show learner content.</p>
              <button type="button" onClick={() => author.onSelect?.(node.id)}>
                Open settings
              </button>
            </div>
          ) : (
            nodeContent
          )}
        </section>
      ) : (
        nodeContent
      )}
      {layout.children.map((l) => (
        <LayoutView
          key={l.id}
          layout={l}
          runtime={runtime}
          item={item}
          boardHosted={boardHosted}
        />
      ))}
      {author.authoring && !node && !layout.children.length && (
        <div className="recipe-empty-layout">
          <strong>{layout.label || "Empty layout area"}</strong>
          <p>Add or move a component here to include it in the lesson.</p>
        </div>
      )}
    </>
  );
  const theme = boundValue(layout.theme),
    themeTokens =
      theme && typeof theme === "object"
        ? (theme as Record<string, unknown>)
        : undefined,
    font = layout.font ?? String(themeTokens?.font ?? "inherit"),
    style = {
      gap: Number(
        node?.definition.startsWith("layout/")
          ? node.configuration.gap
          : layout.gap,
      ),
      "--desktop-columns": node?.definition.startsWith("layout/")
        ? node.configuration.columns
        : layout.columns,
      alignItems: layout.alignment ?? "stretch",
      fontFamily:
        font === "serif"
          ? "Georgia, serif"
          : font === "mono"
            ? "ui-monospace, monospace"
            : font === "system"
              ? "system-ui, sans-serif"
              : undefined,
      fontSize:
        layout.fontSize || themeTokens?.fontSize
          ? `${layout.fontSize ?? Number(themeTokens?.fontSize)}px`
          : undefined,
      "--mobile-columns": layout.mobileColumns ?? 1,
      ...(themeTokens
        ? {
            color: String(themeTokens.foreground),
            backgroundColor: String(themeTokens.background),
            "--recipe-accent": String(themeTokens.accent),
          }
        : {}),
    } as React.CSSProperties;
  const disabled =
    Boolean(layout.disabledWhen) && boundValue(layout.disabledWhen) === true;
  if (kind === "tabs")
    return (
      <section
        className="recipe-layout recipe-tabs"
        style={style}
        aria-disabled={disabled || undefined}
        {...(disabled ? { inert: "" as never } : {})}
      >
        <TabsLayout layout={layout} runtime={runtime} />
      </section>
    );
  if (kind === "disclosure")
    return (
      <details
        className="recipe-layout"
        style={style}
        aria-disabled={disabled || undefined}
        {...(disabled ? { inert: "" as never } : {})}
      >
        <summary>
          {layout.label || String(node?.configuration.label ?? "Details")}
        </summary>
        {content}
      </details>
    );
  return (
    <section
      className={`recipe-layout recipe-${kind}`}
      style={style}
      aria-disabled={disabled || undefined}
      {...(disabled ? { inert: "" as never } : {})}
    >
      {layout.label && (!boardHosted || !author.authoring) && (
        <h3>{layout.label}</h3>
      )}
      {content}
    </section>
  );
}
const PresentationLayout = memo(LayoutView);

export function RecipeLesson({
  document,
  runtime: supplied,
  onCapture,
  onPresentationChange,
  onBoardAction,
  authoring,
  workspace,
  selected,
  onSelect,
  onAuthorChange,
  onCanvasChange,
  onAnimationChange,
  onAdvanceTime,
  animationEnabled,
}: AuthorControls & {
  document: AuthoredDocument;
  workspace?: boolean;
  runtime?: DocumentRuntime;
  animationEnabled?: boolean;
  onAnimationChange?: (enabled: boolean) => void;
  onAdvanceTime?: (
    delta: number,
  ) => import("../../runtime/commands").ActionResult;
  onCapture?: (document: AuthoredDocument) => void;
  onBoardAction?: (
    action: "copy" | "paste" | "duplicate" | "delete" | "separate",
    layoutIds: string[],
    itemIds?: string[],
  ) => void;
  onPresentationChange?: (
    presentation: AuthoredDocument["presentation"],
    group?: string,
    action?: string,
  ) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [localMotion, setAllowMotion] = useState(false);
  const allowMotion = animationEnabled ?? localMotion;
  const animated = !reducedMotion || allowMotion;
  const ref = useRef<DocumentRuntime | null>(null);
  if (!ref.current) ref.current = supplied ?? new DocumentRuntime(document);
  const runtime = supplied ?? ref.current;
  const lastRuntimeSource = useRef<string | null>(null);
  const runtimeSource = JSON.stringify({
    ...document,
    presentation: undefined,
    editor: undefined,
  });
  useEffect(() => {
    if (!supplied && lastRuntimeSource.current !== runtimeSource) {
      runtime.updateDocument(document);
      lastRuntimeSource.current = runtimeSource;
    }
  }, [runtime, runtimeSource, document, supplied]);
  useEffect(() => {
    runtime.document.presentation = document.presentation;
    runtime.document.editor = document.editor;
  }, [runtime, document.presentation, document.editor]);
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  useEffect(() => {
    if (supplied || !animated) return;
    let frame = 0,
      previous = 0;
    const tick = (now: number) => {
      if (
        previous &&
        document.nodes.some(
          (n) => publicDefinition(n.definition).lifecycle.clock,
        )
      )
        runtime.step(Math.min(0.1, (now - previous) / 1000));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [runtime, document.nodes, supplied, animated]);
  const presentationDocument = useMemo(() => {
    if (!workspace || authoring || document.presentation?.mode === "board")
      return document;
    return { ...document, presentation: convertToBoard(document) };
  }, [document, workspace, authoring]);
  const boardWorkspace =
    workspace && presentationDocument.presentation?.mode === "board";
  const runtimeActions = (
    <>
      {reducedMotion &&
        (!supplied || onAdvanceTime) &&
        document.nodes.some(
          (node) => publicDefinition(node.definition).lifecycle.clock,
        ) && (
          <div className="recipe-motion-policy">
            <p>
              Automatic motion is paused to match your motion preference.
              Advance time in steps, or choose animation.
            </p>
            <label className="catalog-toggle">
              <span>Animate simulation</span>
              <input
                type="checkbox"
                checked={allowMotion}
                onChange={(event) => {
                  setAllowMotion(event.target.checked);
                  onAnimationChange?.(event.target.checked);
                }}
              />
            </label>
            {!allowMotion && (
              <ActionButton
                onCommand={() => {
                  try {
                    if (onAdvanceTime) return onAdvanceTime(0.25);
                    runtime.step(0.25);
                    return { accepted: true };
                  } catch (error) {
                    return {
                      accepted: false,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Unable to advance time.",
                    };
                  }
                }}
              >
                Advance time by 0.25 seconds
              </ActionButton>
            )}
          </div>
        )}
      <button
        className="recipe-action recipe-action--quiet"
        type="button"
        onClick={() => runtime.reset()}
      >
        Reset experiment
      </button>
      {onCapture && (
        <button type="button" onClick={() => onCapture(runtime.capture())}>
          Use current settings as starting values
        </button>
      )}
    </>
  );
  return (
    <MotionConfig reducedMotion="user">
      <MotionContext.Provider value={animated}>
        <main
          className={`recipe-lesson ${boardWorkspace ? "is-board-workspace" : ""}`}
          aria-label={document.lesson.title}
        >
          <header>
            <h1>{document.lesson.title}</h1>
            <p>{document.lesson.instruction}</p>
          </header>
          <AuthorContext.Provider
            value={{
              authoring,
              selected,
              onSelect,
              onAuthorChange,
              onCanvasChange,
            }}
          >
            <SnapshotContext.Provider value={snapshot}>
              <SpatialBoard
                document={presentationDocument}
                authoring={authoring}
                workspace={workspace}
                autoLayout={
                  !!workspace &&
                  !authoring &&
                  document.presentation?.mode !== "board"
                }
                actions={boardWorkspace ? runtimeActions : undefined}
                onEdit={onSelect}
                onChange={onPresentationChange}
                onAction={onBoardAction}
                render={(layout) => (
                  <PresentationLayout
                    layout={layout}
                    runtime={runtime}
                    boardHosted={
                      presentationDocument.presentation?.mode === "board"
                    }
                  />
                )}
              />
            </SnapshotContext.Provider>
          </AuthorContext.Provider>
          {!boardWorkspace && (
            <footer className="recipe-runtime-actions">{runtimeActions}</footer>
          )}
        </main>
      </MotionContext.Provider>
    </MotionConfig>
  );
}
