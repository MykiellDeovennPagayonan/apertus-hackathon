// Authoring utility: write explicit source JSON, never patch recipes at runtime.
const fs = require("node:fs"),
  path = require("node:path");
const { load } = require("../../test-loader.cjs");
const { collectiveModels, collectiveKinds } = load(
  "src/simulations/domains/collective/index.ts",
);
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const premadeRoot = path.resolve(
  __dirname,
  "../../../src/simulations/pre-made",
);
const slugs = [
  "shared-fishing-lake",
  "crowd-exit",
  "voting-systems",
  "natural-selection",
];
const titles = [
  "Can the town keep its lake alive?",
  "Could a pillar change the flow?",
  "Who wins when the rule changes?",
  "Which shades reach the next generation?",
];
collectiveKinds.forEach((kind, i) => {
  const model = collectiveModels[i],
    nodes = [
      {
        id: "model",
        definition: model.ref,
        version: 1,
        label: model.name,
        scope: "scope/lab",
        configuration: model.defaults,
      },
    ];
  for (const [role, definition] of [
    ["scene", `appearance/collective-${kind}`],
    ["action", `controls/collective-${kind}-action`],
    ...(kind === "crowd"
      ? []
      : [["choice", `controls/collective-${kind}-choice`]]),
    ["caption", `displays/collective-${kind}-caption`],
  ])
    nodes.push({
      id: role,
      definition,
      version: 1,
      label: role === "scene" ? "Teaching scene" : role,
      scope: "scope/lab",
      configuration: {},
    });
  const connections = [
    {
      id: "link/scene",
      kind: "attachment",
      from: { node: "model", port: "appearance" },
      to: { node: "scene", port: "model" },
    },
  ];
  for (const n of nodes.filter((n) =>
    ["action", "choice", "caption"].includes(n.id),
  )) {
    connections.push({
      id: `link/state/${n.id}`,
      kind: "value",
      from: { node: "model", port: "scene" },
      to: { node: n.id, port: "value" },
    });
    for (const op of Object.keys(publicDefinition(n.definition).outputs))
      connections.push({
        id: `link/${n.id}/${op}`,
        kind: "command",
        from: { node: n.id, port: op },
        to: { node: "model", port: op },
      });
  }
  const layout = {
    id: "layout/root",
    kind: "stack",
    label: "",
    gap: 16,
    columns: 1,
    children: nodes
      .filter((n) => n.id !== "model")
      .map((n) => ({
        id: `layout/${n.id}`,
        kind: "stack",
        label: "",
        gap: 8,
        columns: 1,
        children: [],
        node: n.id,
      })),
  };
  const positions = {
    scene: { x: 0, y: 0, width: 1080, height: 480 },
    caption: { x: 0, y: 578, width: 1080, height: 80 },
    action: { x: 620, y: 504, width: 460, height: 64 },
    choice: { x: 0, y: 504, width: 600, height: 64 },
  };
  const items = layout.children.map((l, i) => ({
    id: `board/${l.node}`,
    layoutId: l.id,
    rect: positions[l.node],
    zIndex: i,
    locked: false,
    responsiveMinHeight:
      l.node === "scene"
        ? kind === "crowd"
          ? 400
          : 340
        : l.node === "caption"
          ? 72
          : 64,
  }));
  const boundary = { x: -24, y: -96, width: 1128, height: 820 };
  const document = {
    formatVersion: 3,
    nodes,
    connections,
    resources: [],
    scopes: [{ id: "scope/lab", label: model.name }],
    groups: [],
    layout,
    lesson: {
      title: model.name,
      instruction: titles[i],
      explanation: model.assumptions.join(" "),
    },
    editor: { positions: {}, zoom: 1 },
    presentation: {
      version: 1,
      mode: "board",
      items,
      groups: [],
      startView: boundary,
      learnerArea: boundary,
      navigation: { mode: "bounded", minZoom: 1, maxZoom: 2 },
      immersive: { startup: "board", allowReturnToBoard: true, overlays: [] },
      responsive: true,
      responsiveRows: ["scene", "caption", "action", "choice"]
        .filter((role) => nodes.some((n) => n.id === role))
        .map((role) => [`board/${role}`]),
      responsiveGap: 16,
    },
  };
  const recipe = {
    recipeVersion: 2,
    id: `prebuilt/${slugs[i]}`,
    version: 1,
    title: model.name,
    description: model.description,
    tags: [kind === "selection" ? "science" : "social-systems", ...model.tags],
    document,
    nested: [],
    parameters: Object.entries(model.parameters.properties).map(
      ([field, schema]) => ({
        name: field,
        node: "model",
        field,
        schema,
        default: model.defaults[field],
      }),
    ),
    externalPorts: [],
    dependencies: [...new Set(nodes.map((n) => n.definition))].map((id) => ({
      id,
      version: 1,
    })),
    assumptions: model.assumptions,
    catalog: {
      icon: ["≈", "↗", "●", "◌"][i],
      category: kind === "selection" ? "science" : "social-systems",
      order: 40 + i,
    },
  };
  fs.mkdirSync(path.join(premadeRoot, slugs[i]), { recursive: true });
  fs.writeFileSync(
    path.join(premadeRoot, slugs[i], "recipe.json"),
    JSON.stringify(recipe, null, 2) + "\n",
  );
});
