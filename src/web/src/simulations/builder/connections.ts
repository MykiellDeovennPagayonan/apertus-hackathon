import { canvasCatalog } from "./catalog";
import { templates } from "./descriptors";
import type { ExperimentDocument } from "./document";

export type MovingBlock = { id: string; x: number; y: number };
export type ConnectionType = "action" | "data" | "placement";
export type GraphPort = {
  id: string;
  label: string;
  type: ConnectionType;
  connectable?: boolean;
};
export type GraphNode = {
  id: string;
  label: string;
  kind:
    | "Object"
    | "Control"
    | "Result"
    | "View"
    | "Lesson"
    | "Placement"
    | "Behavior";
  description: string;
  inputs: GraphPort[];
  outputs: GraphPort[];
  x: number;
  y: number;
};
export type GraphWire = {
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  type: ConnectionType;
  label: string;
};
export const NODE_WIDTH = 248;
export const NODE_HEADER = 96;
export const PORT_HEIGHT = 40;
export function portPoint(
  node: GraphNode,
  id: string,
  side: "input" | "output",
) {
  const ports = side === "input" ? node.inputs : node.outputs;
  const index = Math.max(
    0,
    ports.findIndex((port) => port.id === id),
  );
  return {
    x: node.x + (side === "output" ? NODE_WIDTH : 0),
    y: node.y + NODE_HEADER + index * PORT_HEIGHT + PORT_HEIGHT / 2,
  };
}

/** The graph is a projection of real bindings; available capabilities are not authored nodes. */
export function connectionGraph(
  doc: ExperimentDocument,
  presentationWires: boolean,
  moving: MovingBlock | null = null,
  useSavedPositions = true,
) {
  const t = templates[doc.template];
  const controls = doc.presentation.controls;
  const results = doc.presentation.results;
  const actions = [...new Set(controls.map((control) => control.capability))];
  const outputs = [...new Set(results.map((result) => result.output))];
  const modelRows = Math.max(actions.length, outputs.length + 1, 1);
  const candidates: GraphNode[] = [
    {
      id: "object",
      label: canvasCatalog[doc.template].object,
      kind: "Object",
      description: "Connect changes to observations",
      x: 448,
      y: 160,
      inputs: actions.map((key) => ({
        id: `action:${key}`,
        label: t.controls[key].label,
        type: "action",
      })),
      outputs: [
        { id: "scene", label: "Scene", type: "data" },
        ...outputs.map((key) => ({
          id: `output:${key}`,
          label: t.outputs[key].label,
          type: "data" as const,
        })),
      ],
    },
    ...controls.map(
      (control, index): GraphNode => ({
        id: control.id,
        label: control.label,
        kind: "Control",
        description: `${control.widget === "number" ? "Number input" : control.widget === "select" ? "Dropdown" : control.widget[0].toUpperCase() + control.widget.slice(1)} · learner changes`,
        x: 64,
        y: 64 + index * 184,
        inputs: [],
        outputs: [
          {
            id: "action",
            label: t.controls[control.capability].label,
            type: "action",
          },
        ],
      }),
    ),
    {
      id: "view",
      label: canvasCatalog[doc.template].title,
      kind: "View",
      description: "Displays the model",
      x: 864,
      y: 64,
      inputs: [{ id: "scene", label: "Scene", type: "data" }],
      outputs: [],
    },
    ...results.map(
      (result, index): GraphNode => ({
        id: result.id,
        label: result.label,
        kind: "Result",
        description: `Readout${result.unit && result.unit !== "1" ? ` · ${result.unit}` : ""}`,
        x: 864,
        y: 264 + index * 184,
        inputs: [
          { id: "data", label: t.outputs[result.output].label, type: "data" },
        ],
        outputs: [],
      }),
    ),
    ...(presentationWires
      ? [
          {
            id: "lesson",
            label: "Learner instruction",
            kind: "Lesson" as const,
            description: "Text above the scene",
            x: 448,
            y: 160 + NODE_HEADER + modelRows * PORT_HEIGHT + 100,
            inputs: [],
            outputs: [
              {
                id: "instruction",
                label: "Instruction",
                type: "placement" as const,
              },
            ],
          },
          {
            id: "layout",
            label: "Lesson layout",
            kind: "Placement" as const,
            description: "Where learner components appear",
            x: 1250,
            y: 160,
            inputs: [...controls, ...results]
              .map((item) => ({
                id: item.id,
                label: item.label,
                type: "placement" as const,
              }))
              .concat([
                {
                  id: "lesson",
                  label: "Instruction",
                  type: "placement" as const,
                },
              ]),
            outputs: [],
          },
        ]
      : []),
  ];
  const blocks = candidates
    .filter(
      (block) => doc.recipe || ["view", "lesson", "layout"].includes(block.id),
    )
    .map((block) => ({
      ...block,
      ...(useSavedPositions ? (doc.editor.positions[block.id] ?? {}) : {}),
      ...(moving?.id === block.id ? { x: moving.x, y: moving.y } : {}),
      outputs:
        presentationWires && ["Control", "Result"].includes(block.kind)
          ? [
              ...block.outputs,
              {
                id: "placement",
                label: "Lesson panel",
                type: "placement" as const,
              },
            ]
          : block.outputs,
    }));
  const wires: GraphWire[] = [
    ...controls.map(
      (control): GraphWire => ({
        from: control.id,
        to: "object",
        fromPort: "action",
        toPort: `action:${control.capability}`,
        type: "action",
        label: t.controls[control.capability].label,
      }),
    ),
    ...results.map(
      (result): GraphWire => ({
        from: "object",
        to: result.id,
        fromPort: `output:${result.output}`,
        toPort: "data",
        type: "data",
        label: t.outputs[result.output].label,
      }),
    ),
    ...(doc.recipe
      ? [
          {
            from: "object",
            to: "view",
            fromPort: "scene",
            toPort: "scene",
            type: "data" as const,
            label: "Scene",
          },
        ]
      : []),
    ...(presentationWires
      ? [...controls, ...results]
          .map(
            (item): GraphWire => ({
              from: item.id,
              to: "layout",
              fromPort: "placement",
              toPort: item.id,
              type: "placement",
              label: item.slot === "primary" ? "Main panel" : "More settings",
            }),
          )
          .concat([
            {
              from: "lesson",
              to: "layout",
              fromPort: "instruction",
              toPort: "lesson",
              type: "placement",
              label: "Instruction",
            },
          ])
      : []),
  ];
  return {
    blocks,
    wires,
    node: (id: string) => blocks.find((block) => block.id === id),
  };
}
