"use client";

import dynamic from "next/dynamic";
import { requireValue } from "../../runtime/authoring/requireValue";
import { BridgeScene } from "./BridgeScene";
import { MemberInspector } from "./MemberInspector";
import { ProjectileScene } from "./ProjectileScene";

const ScopedWorld = dynamic(() => import("./ScopedWorldView"), {
  ssr: false,
  loading: () => <output>Loading world…</output>,
});

import {
  createContext,
  useContext,
  useEffect,
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
import { EqualGroupsScene } from "./EqualGroupsScene";
import { FractionBuilderScene } from "./FractionBuilderScene";
import { FractionNumberLineScene } from "./FractionNumberLineScene";
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
};
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
      ? v.toLocaleString(undefined, { maximumFractionDigits: precision })
      : "Unavailable"
    : typeof v === "string"
      ? v
      : typeof v === "boolean"
        ? v
          ? "Yes"
          : "No"
        : v === undefined || v === null
          ? "Unavailable"
          : JSON.stringify(v);
function DatasetDisplay({
  value,
  kind,
  label,
}: {
  value: unknown;
  kind: string;
  label: string;
}) {
  const rows = Array.isArray(value) ? value : [];
  if (kind === "Heatmap" && rows.every((r) => Array.isArray(r))) {
    const grid = rows as number[][],
      max = Math.max(1, ...grid.flat());
    return (
      <svg
        viewBox={`0 0 ${grid[0]?.length ?? 1} ${grid.length || 1}`}
        role="img"
        aria-label={label}
      >
        {grid.flatMap((row, y) =>
          row.map((v, x) => (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed grid coordinates are cell identities.
              key={`${x}/${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={`rgb(${Math.round((255 * v) / max)},100,180)`}
            />
          )),
        )}
      </svg>
    );
  }
  const records = rows.filter(
    (r) => r && typeof r === "object" && !Array.isArray(r),
  ) as Record<string, unknown>[];
  const columns = [...new Set(records.flatMap(Object.keys))];
  const numeric = columns.filter((k) =>
    records.every((r) => typeof r[k] === "number"),
  );
  if (kind === "Histogram" && records.length) {
    const max = Math.max(
      1,
      ...records.flatMap((r) => [
        Number(r.observed ?? 0),
        Number(r.expected ?? 0),
      ]),
    );
    return (
      <figure>
        <svg viewBox="0 0 520 280" role="img" aria-label={label}>
          {records.map((r, i) => (
            <g key={String(r.id ?? r.outcome ?? i)}>
              <rect
                x={30 + (i * 470) / records.length}
                y={230 - (Number(r.observed) * 200) / max}
                width={200 / records.length}
                height={(Number(r.observed) * 200) / max}
                fill="#245bcb"
              />
              <rect
                x={30 + (i * 470) / records.length + 200 / records.length}
                y={230 - (Number(r.expected) * 200) / max}
                width={200 / records.length}
                height={(Number(r.expected) * 200) / max}
                fill="#cc543d"
              />
              <text x={30 + (i * 470) / records.length} y={255}>
                {String(r.outcome)}
              </text>
            </g>
          ))}
        </svg>
        <figcaption>{label} · blue observed, coral expected</figcaption>
      </figure>
    );
  }
  if (
    ["Chart", "Histogram"].includes(kind) &&
    records.length &&
    numeric.length
  ) {
    const xs = records.map((r, i) => Number(r.x ?? i)),
      xMin = Math.min(...xs),
      xMax = Math.max(xMin + 1, ...xs),
      series = numeric.filter((k) => k !== "x"),
      ys = records.flatMap((r) => series.map((k) => Number(r[k]))),
      yMin = Math.min(0, ...ys),
      yMax = Math.max(yMin + 1, ...ys);
    return (
      <figure>
        <svg viewBox="0 0 520 260" role="img" aria-label={label}>
          <path d="M30 10 V230 H510" fill="none" stroke="currentColor" />
          {series.map((k, index) => (
            <polyline
              key={k}
              fill="none"
              stroke={["#245bcb", "#cc543d", "#237f63"][index % 3]}
              points={records
                .map(
                  (r, i) =>
                    `${30 + ((xs[i] - xMin) * 470) / (xMax - xMin)},${230 - ((Number(r[k]) - yMin) * 210) / (yMax - yMin)}`,
                )
                .join(" ")}
            />
          ))}
        </svg>
        <figcaption>
          {label}: {series.join(", ")}
        </figcaption>
      </figure>
    );
  }
  if (!records.length) return <output>{display(value)}</output>;
  return (
    <div className="recipe-table">
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={String(r.id ?? r.element ?? r.outcome ?? i)}>
              {columns.map((c) => (
                <td key={c}>{display(r[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Appearance({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const snapshot = useContext(SnapshotContext);
  const model = runtime.attached(node.id);
  if (!model) return <p>Connect a model to this appearance.</p>;
  const visualLayers = runtime.document.connections
    .filter((c) => c.to.node === node.id && c.to.port === "visuals")
    .map((c) => runtime.document.nodes.find((n) => n.id === c.from.node))
    .filter((n) => n?.configuration.visible)
    .map((n) => requireValue(n).definition);
  if (node.definition === "appearance/Bridge") {
    const state = snapshot.state[model.id];
    if (!state?.ready) return <p>Connect truss joints, members and a load.</p>;
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
      <p>Connect buildings, daily routines and a market.</p>
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
      <svg viewBox="0 0 440 440" aria-label="Interactive coordinate plane">
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
      </svg>
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
    <dl>
      {Object.entries(instance.outputs).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{display(value)}</dd>
        </div>
      ))}
    </dl>
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
function NodeView({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const author = useContext(AuthorContext);
  const snapshot = useContext(SnapshotContext);
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
    if (!command) return <p>{node.label}: connect a supported command.</p>;
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
        return <p>{node.label}: target command has no reference argument.</p>;
      return (
        <label>
          {String(config.label)}
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                runtime.submit(node.id, { [argument]: event.target.value });
            }}
          >
            <option value="">Choose component</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
    let initial: unknown;
    try {
      initial = JSON.parse(String(config.initial));
    } catch {
      initial = schemaDefault(command.arguments);
    }
    return (
      <SchemaForm
        key={`${node.id}/${connection?.to.node}/${connection?.to.port}/${config.initial}`}
        widget={node.definition.split("/")[1]}
        schema={
          node.definition === "controls/Button" ? object({}) : command.arguments
        }
        initial={node.definition === "controls/Button" ? {} : initial}
        label={String(config.label)}
        mode={
          command.submission === "continuous" && config.mode === "immediate"
            ? "immediate"
            : "submit"
        }
        onSubmit={(args) => runtime.submit(node.id, args)}
      />
    );
  }
  if (def.category === "appearance")
    return <Appearance node={node} runtime={runtime} />;
  if (node.definition === "displays/Text")
    return config.variant === "heading" ? (
      <h2>{String(config.text)}</h2>
    ) : (
      <p className={config.variant === "callout" ? "recipe-callout" : ""}>
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
    return <output className="recipe-formula">{display(value)}</output>;
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
                <span
                  style={{
                    background: /^#[0-9a-f]{6}$/i.test(String(record.color))
                      ? String(record.color)
                      : "#64748b",
                  }}
                />
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
    return (
      <section aria-label={String(config.label)}>
        <strong>{String(config.label)}</strong>
        {["Chart", "Histogram", "Heatmap", "DataTable"].includes(kind) ? (
          <DatasetDisplay
            value={value}
            kind={kind}
            label={String(config.label)}
          />
        ) : (
          <output aria-live={kind === "StatusMessage" ? "polite" : "off"}>
            {display(value, Number(config.precision))}
          </output>
        )}
      </section>
    );
  }
  if (node.definition === "canvases/World")
    return <Appearance node={node} runtime={runtime} />;
  if (def.category === "canvases") {
    const kind = node.definition.split("/")[1] as CompositionScene["kind"];
    const objects = runtime.document.connections
      .filter(
        (c) =>
          c.kind === "attachment" &&
          c.to.node === node.id &&
          c.to.port === "objects",
      )
      .map((c) => snapshot.state[c.from.node] as unknown as SceneObject);
    const scene: CompositionScene = {
      version: 2,
      kind,
      canvas: config as unknown as CompositionScene["canvas"],
      objects,
      controls: [],
      measurements: [],
    };
    return (
      <CompositionCanvas
        scene={scene}
        people={
          (snapshot.state[
            runtime.document.connections.find(
              (c) => c.to.node === node.id && c.to.port === "timeline",
            )?.from.node ?? ""
          ]?.people ??
            []) as import("../systems/ScheduledTripSystem").PersonSnapshot[]
        }
        selected={author.selected ?? ""}
        authoring={author.authoring ?? false}
        active
        resetToken={node.id}
        onSelect={author.onSelect ?? (() => {})}
        onChange={author.onAuthorChange ?? (() => {})}
        onCommit={author.onAuthorChange ?? (() => {})}
        onPiece={(id, index) =>
          runtime.dispatch([
            { node: id, command: "togglePiece", arguments: { index } },
          ])
        }
      />
    );
  }
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
  const chosen =
    layout.children.find((l) => l.id === active) ?? layout.children[0];
  return (
    <section className="recipe-layout">
      <div role="tablist" aria-label={layout.label || "Sections"}>
        {layout.children.map((l) => (
          <button
            type="button"
            role="tab"
            aria-selected={chosen?.id === l.id}
            key={l.id}
            onClick={() => setActive(l.id)}
          >
            {l.label || l.kind}
          </button>
        ))}
      </div>
      {chosen && (
        <div role="tabpanel">
          <LayoutView layout={chosen} runtime={runtime} />
        </div>
      )}
    </section>
  );
}
function LayoutView({
  layout,
  runtime,
  item,
}: {
  layout: Layout;
  runtime: DocumentRuntime;
  item?: Record<string, unknown>;
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
        <p role="alert">Repeater requires unique stable item keys ({field}).</p>
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
              <dl>
                {Object.entries(row).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{display(v)}</dd>
                  </div>
                ))}
              </dl>
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
          !["displays/Text", "displays/Formula", "displays/Legend"].includes(
            node.definition,
          )
        ? !runtime.document.connections.some(
            (connection) =>
              connection.kind === "value" && connection.to.node === node.id,
          )
        : false
    : false;
  const content = (
    <>
      {node && author.authoring ? (
        <section
          className={`recipe-author-item${author.selected === node.id ? " is-selected" : ""}`}
          aria-label={`${node.label} authoring controls`}
        >
          <div className="recipe-author-label">
            <span>{node.label}</span>
            <button type="button" onClick={() => author.onSelect?.(node.id)}>
              Edit
            </button>
          </div>
          {disconnected ? (
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
        <LayoutView key={l.id} layout={l} runtime={runtime} item={item} />
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
      {layout.label && <h3>{layout.label}</h3>}
      {content}
    </section>
  );
}
export function RecipeLesson({
  document,
  runtime: supplied,
  onCapture,
  authoring,
  selected,
  onSelect,
  onAuthorChange,
}: AuthorControls & {
  document: AuthoredDocument;
  runtime?: DocumentRuntime;
  onCapture?: (document: AuthoredDocument) => void;
}) {
  const ref = useRef<DocumentRuntime | null>(null);
  if (!ref.current) ref.current = supplied ?? new DocumentRuntime(document);
  const runtime = supplied ?? ref.current;
  useEffect(() => {
    if (!supplied) runtime.updateDocument(document);
  }, [runtime, document, supplied]);
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  useEffect(() => {
    if (supplied) return;
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
  }, [runtime, document.nodes, supplied]);
  return (
    <main className="recipe-lesson" aria-label={document.lesson.title}>
      <header>
        <h1>{document.lesson.title}</h1>
        <p>{document.lesson.instruction}</p>
      </header>
      <AuthorContext.Provider
        value={{ authoring, selected, onSelect, onAuthorChange }}
      >
        <SnapshotContext.Provider value={snapshot}>
          <LayoutView layout={document.layout} runtime={runtime} />
        </SnapshotContext.Provider>
      </AuthorContext.Provider>
      <footer className="recipe-runtime-actions">
        <button type="button" onClick={() => runtime.reset()}>
          Reset experiment
        </button>
        {onCapture && (
          <button type="button" onClick={() => onCapture(runtime.capture())}>
            Use current settings as starting values
          </button>
        )}
      </footer>
    </main>
  );
}
