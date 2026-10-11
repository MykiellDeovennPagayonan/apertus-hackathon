// Writes the plan 028 MATH-01, 03–10 premade recipes from their domain models.
// Re-run after changing a model's parameters or a lesson; MATH-02 (pythagorean) is hand-authored.
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("../../test-loader.cjs");
const { mathGeometryModels } = load(
  "src/simulations/domains/math-geometry/index.ts",
);

const slider = (label, field, step, extra = {}) => ({
  kind: "Slider",
  label,
  command: `set:${field}`,
  field,
  step,
  ...extra,
});
const button = (label, command) => ({ kind: "Button", label, command });
const lessons = [
  {
    slug: "decimal-place-value",
    ref: "prefabs/math-geometry/PlaceValue",
    title: "Why does × 10 change a decimal so much?",
    description:
      "Multiply and divide 12.34 by ten on a place-value board, and trade blocks without changing the number.",
    tags: ["mathematics", "decimals", "place value", "base-ten blocks"],
    icon: "0.1",
    order: 13,
    label: "Place-value board",
    sceneLabel: "Place-value blocks",
    sceneHeight: 430,
    controls: [
      button("× 10", "PLACE_TIMES_TEN"),
      button("÷ 10", "PLACE_DIVIDE_TEN"),
      button("Break 1 tenth into 10 hundredths", "PLACE_BREAK_TENTH"),
    ],
    instruction: "Multiply 12.34 by ten. Where does each block go?",
    explanation:
      "Each column is worth ten times the one to its right. Multiplying by ten moves every block one column left past a fixed decimal point; trading one tenth for ten hundredths keeps the number the same.",
  },
  {
    slug: "tree-height",
    ref: "prefabs/math-geometry/TreeHeight",
    title: "How tall is the tree?",
    description:
      "Use your distance from a tree and the angle up to its top to work out its height with tangent.",
    tags: ["mathematics", "trigonometry", "tangent", "measuring heights"],
    icon: "∠",
    order: 14,
    label: "Tree measurement",
    sceneLabel: "Observer, sight line and tree",
    sceneHeight: 450,
    controls: [
      slider("Aim: sight angle (°)", "sightAngle", 1),
      slider("Distance from the tree (m)", "observerDistance", 0.5),
    ],
    instruction:
      "Aim your sight line at the top of the tree. How tall is it? Then step back and aim again.",
    explanation:
      "Where the sight line meets the tree is eye height + distance × tan(angle); aimed at the top, that is the tree's height. The angle is limited to 80° because a vertical sight line has no triangle.",
  },
  {
    slug: "scale-floor-plan",
    ref: "prefabs/math-geometry/ScaleDrawing",
    title: "Double the plan, double the area?",
    description:
      "Enlarge a 3 m × 4 m floor plan and compare how its lengths and its area change.",
    tags: ["mathematics", "scale drawing", "similar shapes", "area"],
    icon: "⧉",
    order: 15,
    label: "Floor plan",
    sceneLabel: "Original and scaled floor plans",
    sceneHeight: 460,
    controls: [slider("Scale factor", "scaleFactor", 0.25)],
    instruction:
      "Double the floor plan. How many copies of the original floor fit inside?",
    explanation:
      "Scaling every length by k multiplies the area by k × k. Doubling a 3 m × 4 m room gives 6 m × 8 m: 48 m², four times 12 m².",
  },
  {
    slug: "flip-turn-slide",
    ref: "prefabs/math-geometry/RigidMotion",
    title: "Flip or turn?",
    description:
      "Flip and turn a lettered L shape on a grid to see which move makes a mirror image.",
    tags: ["mathematics", "reflection", "rotation", "transformations"],
    icon: "⟲",
    order: 16,
    label: "L shape",
    sceneLabel: "Grid with mirror line and turn centre",
    sceneHeight: 520,
    controls: [
      button("Flip across the mirror line", "MOTION_FLIP"),
      button("Turn 90° about the dot", "MOTION_TURN"),
      button("Start again", "MOTION_RESTART"),
    ],
    instruction:
      "Make the L a mirror image of the start. Then make it point another way without mirroring it.",
    explanation:
      "Flips, turns and slides keep every length and angle. Only a flip reverses the order of the corner letters.",
  },
  {
    slug: "tile-patterns",
    ref: "prefabs/math-geometry/RegularTiling",
    title: "Why do hexagons tile but pentagons don't?",
    description:
      "Fit regular tiles around one corner and see whether their angles make a full 360°.",
    tags: ["mathematics", "tessellation", "polygons", "angles"],
    icon: "⬡",
    order: 17,
    label: "Regular tiles",
    sceneLabel: "Tiles around one corner",
    sceneHeight: 470,
    controls: [slider("Sides on each tile", "tileSides", 1)],
    instruction: "Change hexagons to pentagons. What happens at the corner?",
    explanation:
      "Same regular tiles meet with no gap only when their corner angles add to exactly 360°: triangles, squares and hexagons. Some irregular pentagons can still tile.",
  },
  {
    slug: "cube-nets",
    ref: "prefabs/math-geometry/CubeNet",
    title: "Which shapes fold into a cube?",
    description:
      "Fold arrangements of six lettered squares and see which close into a cube.",
    tags: ["mathematics", "cube nets", "3D shapes", "folding"],
    icon: "⬚",
    order: 18,
    label: "Six-square net",
    sceneLabel: "Net and folded cube",
    sceneHeight: 430,
    controls: [
      button("Fold it", "NET_FOLD"),
      button("Try another shape", "NET_NEXT"),
    ],
    instruction:
      "Find one shape that closes into a cube and one that leaves a face open.",
    explanation:
      "A net works only when every square lands on a different face. Six joined squares are not enough: some overlap and leave a face open.",
  },
  {
    slug: "can-material",
    ref: "prefabs/math-geometry/CanPackaging",
    title: "Which can uses the least metal?",
    description:
      "Change the radius of a 500 cm³ can while its height keeps the volume fixed, and find the least metal.",
    tags: ["mathematics", "optimization", "surface area", "cylinders"],
    icon: "◎",
    order: 19,
    label: "500 cm³ can",
    sceneLabel: "Can, metal used and area curve",
    sceneHeight: 450,
    controls: [
      slider("Can radius (cm)", "canRadius", 0.1, { min: 1, max: 12 }),
    ],
    instruction:
      "Find the radius of the 500 cm³ can that needs the least metal.",
    explanation:
      "Thin cans need a lot of side wall; wide cans need big ends. A closed can uses the least metal when its height equals its diameter.",
  },
  {
    slug: "box-packing",
    ref: "prefabs/math-geometry/BoxPacking",
    title: "How many boxes fit in the bin?",
    description:
      "Turn boxes and mix directions to fit more into a bin than one direction allows.",
    tags: ["mathematics", "packing", "volume", "orientation"],
    icon: "▦",
    order: 20,
    label: "Bin and boxes",
    sceneLabel: "Bin seen from above and the front",
    sceneHeight: 470,
    controls: [
      button("Turn the boxes", "PACK_TURN"),
      button("Mix two directions", "PACK_MIX"),
    ],
    instruction: "Fit more boxes than any single direction allows.",
    explanation:
      "Boxes cannot be cut, so bin volume ÷ box volume is only an upper limit. Turning some boxes can use gaps that one direction leaves empty.",
  },
  {
    slug: "fencing-garden",
    ref: "prefabs/math-geometry/FencedGarden",
    title: "Most garden from 20 m of fence",
    description:
      "Change the width of a rectangular garden with a fixed 20 m fence and find the most space.",
    tags: ["mathematics", "quadratics", "maximum", "area"],
    icon: "⌗",
    order: 21,
    label: "Fenced garden",
    sceneLabel: "Garden and area curve",
    sceneHeight: 430,
    controls: [
      slider("Garden width (m)", "gardenWidth", 0.5, { min: 0.5, max: 9.5 }),
    ],
    instruction:
      "Using all 20 m of fence, make the garden with the most space.",
    explanation:
      "A fixed fence links width and depth, so area = width × (10 − width): a parabola whose top is the 5 m × 5 m square.",
  },
];

function recipe(lesson) {
  const model = mathGeometryModels.find((m) => m.ref === lesson.ref);
  if (!model) throw new Error(`Missing model ${lesson.ref}`);
  const state = model.initialize(structuredClone(model.defaults));
  const configuration = model.configuration(state);
  const controls = lesson.controls.map((c, i) => ({
    ...c,
    id: `control/${i + 1}`,
  }));
  const nodes = [
    {
      id: "model",
      definition: lesson.ref,
      version: 1,
      label: lesson.label,
      scope: "scope/lab",
      configuration,
    },
    {
      id: "scene",
      definition: `appearance/${model.presentation}`,
      version: 1,
      label: lesson.sceneLabel,
      scope: "scope/lab",
      configuration: {},
    },
    ...controls.map((c) => ({
      id: c.id,
      definition: `controls/${c.kind}`,
      version: 1,
      label: c.label,
      scope: "scope/lab",
      configuration:
        c.kind === "Slider"
          ? {
              label: c.label,
              mode: "immediate",
              initial: JSON.stringify({ value: configuration[c.field] }),
              parameter: "value",
              step: c.step,
              showNumber: true,
              ...(c.min !== undefined ? { min: c.min, max: c.max } : {}),
            }
          : { label: c.label, mode: "submit", initial: "{}" },
    })),
  ];
  const connections = [
    {
      id: "link/scene",
      kind: "attachment",
      from: { node: "model", port: "appearance" },
      to: { node: "scene", port: "model" },
    },
    ...controls.map((c) => ({
      id: `link/${c.id}`,
      kind: "command",
      from: { node: c.id, port: "submit" },
      to: { node: "model", port: c.command },
    })),
  ];
  const width = 780,
    gap = 20,
    controlWidth =
      controls.length === 1
        ? 370
        : (width - gap * (controls.length - 1)) / controls.length;
  const controlHeight = controls.some((c) => c.kind === "Slider") ? 140 : 80;
  const controlY = lesson.sceneHeight + gap;
  const items = [
    {
      id: "board/layout/scene",
      layoutId: "layout/scene",
      rect: { x: 0, y: 0, width, height: lesson.sceneHeight },
      zIndex: 0,
      locked: false,
      responsiveMinHeight: 260,
    },
    ...controls.map((c, i) => ({
      id: `board/layout/${c.id}`,
      layoutId: `layout/${c.id}`,
      rect: {
        x: i * (controlWidth + gap),
        y: controlY,
        width: controlWidth,
        height: controlHeight,
      },
      zIndex: i + 1,
      locked: false,
      responsiveMinHeight: controlHeight > 100 ? 100 : 64,
    })),
  ];
  // Responsive rows hold at most two items.
  const controlRows = [];
  controls.forEach((c, i) => {
    if (i % 2) controlRows[controlRows.length - 1].push(`board/layout/${c.id}`);
    else controlRows.push([`board/layout/${c.id}`]);
  });
  const fields =
    model.parameters.type === "object" ? model.parameters.properties : {};
  const optional =
    model.parameters.type === "object" ? (model.parameters.optional ?? []) : [];
  return {
    recipeVersion: 2,
    id: `prebuilt/${lesson.slug}`,
    version: 1,
    title: lesson.title,
    description: lesson.description,
    tags: lesson.tags,
    document: {
      formatVersion: 3,
      nodes,
      connections,
      resources: [],
      scopes: [{ id: "scope/lab", label: lesson.title }],
      groups: [],
      layout: {
        id: "layout/root",
        kind: "stack",
        label: "",
        gap: 16,
        columns: 1,
        children: [
          {
            id: "layout/scene",
            kind: "stack",
            label: "",
            gap: 16,
            columns: 1,
            children: [],
            node: "scene",
          },
          ...controls.map((c) => ({
            id: `layout/${c.id}`,
            kind: "stack",
            label: "",
            gap: 16,
            columns: 1,
            children: [],
            node: c.id,
          })),
        ],
      },
      lesson: {
        title: lesson.title,
        instruction: lesson.instruction,
        explanation: lesson.explanation,
      },
      editor: { positions: {}, zoom: 1 },
      presentation: {
        version: 1,
        mode: "board",
        items,
        groups: [],
        startView: {
          x: -24,
          y: -24,
          width: width + 48,
          height: controlY + controlHeight + 48,
        },
        navigation: { mode: "bounded", minZoom: 0.25, maxZoom: 2 },
        immersive: { startup: "board", allowReturnToBoard: true, overlays: [] },
        responsive: true,
        responsiveRows: [["board/layout/scene"], ...controlRows],
      },
    },
    nested: [],
    parameters: Object.entries(fields)
      .filter(
        ([key, schema]) =>
          !optional.includes(key) &&
          (schema.type === "number" || schema.type === "integer"),
      )
      .map(([key, schema]) => ({
        name: key,
        node: "model",
        field: key,
        schema,
        default: configuration[key],
      })),
    externalPorts: [],
    dependencies: [
      { id: lesson.ref, version: 1 },
      { id: `appearance/${model.presentation}`, version: 1 },
      ...[...new Set(controls.map((c) => `controls/${c.kind}`))].map((id) => ({
        id,
        version: 1,
      })),
    ],
    assumptions: [...model.assumptions],
    catalog: {
      icon: lesson.icon,
      category: "mathematics",
      order: lesson.order,
    },
  };
}

const root = path.resolve(__dirname, "../../../src/simulations/pre-made");
const cases = path.resolve(__dirname, "../../recipes/cases");
for (const lesson of lessons) {
  const data = recipe(lesson);
  fs.mkdirSync(path.join(root, lesson.slug), { recursive: true });
  fs.writeFileSync(
    path.join(root, lesson.slug, "recipe.json"),
    `${JSON.stringify(data, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(cases, `${lesson.slug}.json`),
    `${JSON.stringify(
      {
        slug: lesson.slug,
        title: lesson.title,
        visibleItems: data.document.presentation.items.length,
      },
      null,
      2,
    )}\n`,
  );
}
module.exports = { lessons };
console.log(`Wrote ${lessons.length} A1 premade recipes and recipe cases.`);
