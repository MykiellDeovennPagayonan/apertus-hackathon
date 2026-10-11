const fs = require("node:fs"),
  path = require("node:path");
const { load } = require("../../test-loader.cjs");
const { thermalOptics, thermalOpticsSpecs } = load(
  "src/simulations/domains/physics/thermalOptics.ts",
);
const cases = require("./a4-cases.json");
const web = path.resolve(__dirname, "../../..");
for (const c of cases) {
  const m = thermalOptics.models.find((m) => m.ref === c.ref);
  const controls =
    m.presentation === "physics-cooling"
      ? [["time", "PT_COOLING_TIME", "Minutes elapsed"]]
      : thermalOpticsSpecs
          .find((s) => s.key === c.kind)
          .controls.map((c) => [c.field, c.command, c.label, c.type, c.step]);
  const objects = m.creationDefaults?.objects || [
    { label: m.name, parameters: {} },
  ];
  const nodes = [],
    connections = [],
    items = [],
    children = [],
    dependencies = new Set();
  const add = (id, definition, label, configuration) => {
    nodes.push({
      id,
      definition,
      version: 1,
      label,
      scope: "scope/lab",
      configuration,
    });
    dependencies.add(definition);
  };
  const place = (node, x, y, width, height) => {
    const id = `layout/${node}`;
    children.push({
      id,
      kind: "stack",
      label: "",
      gap: 12,
      columns: 1,
      children: [],
      node,
    });
    items.push({
      id: `board/${id}`,
      layoutId: id,
      rect: { x, y, width, height },
      zIndex: items.length,
      locked: false,
      responsiveMinHeight: height,
    });
  };
  objects.forEach((o, i) => {
    add(`model${i}`, m.ref, o.label, { ...m.defaults, ...o.parameters });
    add(
      `appearance${i}`,
      `appearance/${m.presentation}`,
      `${o.label} scene`,
      {},
    );
    connections.push({
      id: `link/appearance${i}`,
      kind: "attachment",
      from: { node: `model${i}`, port: "appearance" },
      to: { node: `appearance${i}`, port: "model" },
    });
    place(`appearance${i}`, i * 696, 0, 680, 390);
  });
  controls.forEach(([field, command, label, kind = "Slider", step = 1], i) => {
    const id = `control/${field}`,
      configuration = {
        label,
        mode: "immediate",
        initial:
          kind === "Button"
            ? "{}"
            : JSON.stringify({ value: m.defaults[field] }),
      };
    if (kind === "Slider")
      Object.assign(configuration, {
        parameter: "value",
        step,
        showNumber: false,
      });
    add(id, `controls/${kind}`, label, configuration);
    objects.forEach((_, j) => {
      connections.push({
        id: `link/${field}${j}`,
        kind: "command",
        from: { node: id, port: "submit" },
        to: { node: `model${j}`, port: command },
      });
    });
    place(id, i * 344, 410, 328, kind === "Button" ? 80 : kind === "Select" ? 160 : 128);
  });
  const width = Math.max(
    680,
    objects.length * 696 - 16,
    controls.length * 344 - 16,
  );
  const recipe = {
    recipeVersion: 2,
    id: `prebuilt/${c.slug}`,
    version: 1,
    title: m.name,
    description: c.question || m.description,
    tags: ["physics", ...m.tags],
    document: {
      formatVersion: 3,
      nodes,
      connections,
      resources: [],
      scopes: [{ id: "scope/lab", label: m.name }],
      groups: [],
      layout: {
        id: "layout/root",
        kind: "stack",
        label: "",
        gap: 16,
        columns: 1,
        children,
      },
      lesson: {
        title: m.name,
        instruction: c.question || m.description,
        explanation: m.assumptions.join(" "),
      },
      editor: { positions: {}, zoom: 1 },
      presentation: {
        version: 1,
        mode: "board",
        items,
        groups: [],
        startView: { x: -24, y: -24, width: width + 48, height: 640 },
        navigation: { mode: "bounded", minZoom: 0.25, maxZoom: 2 },
        immersive: { startup: "board", allowReturnToBoard: true, overlays: [] },
        responsive: true,
        responsiveRows: [
          objects.map((_, i) => `board/layout/appearance${i}`),
          ...Array.from({ length: Math.ceil(controls.length / 2) }, (_, i) =>
            controls
              .slice(i * 2, i * 2 + 2)
              .map(([f]) => `board/layout/control/${f}`),
          ),
        ],
        responsiveGap: 16,
        learnerArea: { x: -24, y: -24, width: width + 48, height: 720 },
      },
    },
    nested: [],
    parameters: [],
    externalPorts: [],
    dependencies: [...dependencies].map((id) => ({ id, version: 1 })),
    assumptions: [...m.assumptions],
    catalog: {
      icon: "◉",
      category: "physics",
      order: 140 + Number(c.id.slice(-2)),
    },
  };
  objects.forEach((_, i) => {
    Object.entries(m.defaults).forEach(([field]) => {
      recipe.parameters.push({
        name: field + i,
        node: `model${i}`,
        field,
        schema: m.parameters.properties[field],
        default: recipe.document.nodes.find((n) => n.id === `model${i}`)
          .configuration[field],
      });
    });
  });
  const dir = path.join(web, "src/simulations/pre-made", c.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "recipe.json"),
    `${JSON.stringify(recipe, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(web, "scripts/recipes/cases", `${c.slug}.json`),
    `${JSON.stringify(
      {
        slug: c.slug,
        title: m.name,
        visibleItems: objects.length + controls.length,
      },
      null,
      2,
    )}\n`,
  );
}
console.log("A4 owned recipes generated");
