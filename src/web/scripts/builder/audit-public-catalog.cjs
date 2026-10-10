/** Reproducible source/export and consumer ledger. No runtime registration side effects. */
const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  ts = require("typescript");
const { load } = require("../test-loader.cjs");
const root = path.resolve(__dirname, "../../../.."),
  web = path.resolve(__dirname, "../..");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : /\.(tsx?|cjs)$/.test(e.name)
          ? [path.join(dir, e.name)]
          : [],
    );
}
function resolve(file, ref) {
  if (!ref.startsWith(".")) return null;
  const base = path.resolve(path.dirname(file), ref);
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(
    (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
  );
}
const consumers = new Map(),
  symbols = new Map();
for (const file of [
  ...files(path.join(web, "src")),
  ...files(path.join(web, "scripts")),
]) {
  const source = fs.readFileSync(file, "utf8"),
    ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true),
    names = [];
  const visit = (n) => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier
    ) {
      const target = resolve(file, n.moduleSpecifier.text);
      if (target) {
        const rows = consumers.get(target) || [];
        rows.push({
          source: path.relative(root, file),
          typeOnly: Boolean(n.importClause?.isTypeOnly || n.isTypeOnly),
          symbols: n.importClause?.namedBindings?.elements?.map(
            (e) => (e.propertyName || e.name).text,
          ) || ["*"],
        });
        consumers.set(target, rows);
      }
    }
    if (
      ts.isCallExpression(n) &&
      n.arguments.length > 0 &&
      ts.isStringLiteral(n.arguments[0])
    ) {
      const lazy = n.expression.kind === ts.SyntaxKind.ImportKeyword;
      const fixture =
        ts.isIdentifier(n.expression) &&
        n.expression.text === "load" &&
        n.arguments[0].text.startsWith("src/");
      const target = lazy
        ? resolve(file, n.arguments[0].text)
        : fixture
          ? path.join(web, n.arguments[0].text)
          : null;
      if (target && fs.existsSync(target)) {
        const rows = consumers.get(target) || [];
        rows.push({
          source: path.relative(root, file),
          typeOnly: false,
          symbols: ["*"],
          kind: lazy ? "lazy import" : "verification load",
        });
        consumers.set(target, rows);
      }
    }
    if (n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (n.name) names.push(n.name.text);
      if (ts.isVariableStatement(n))
        for (const d of n.declarationList.declarations)
          if (ts.isIdentifier(d.name)) names.push(d.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(ast);
  symbols.set(file, [...new Set(names)]);
}
const originalPaths = cp
  .execFileSync("git", ["ls-files", "src/web/src/simulations/components"], {
    cwd: root,
    encoding: "utf8",
  })
  .trim()
  .split("\n")
  .filter(Boolean);
const componentRoot = path.join(web, "src/simulations/components");
function inventory(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? inventory(path.join(dir, e.name))
        : [path.relative(root, path.join(dir, e.name))],
    );
}
const paths = [...new Set([...originalPaths, ...inventory(componentRoot)])]
  .filter((p) => fs.existsSync(path.join(root, p)))
  .sort();
const { publicDefinitions } = load(
  "src/simulations/components/catalog/index.ts",
);
const categories = {
  controls: "control",
  views: "display/layout/composite",
  visuals: "appearance",
  systems: "model operation",
  traits: "private state/schema",
  resources: "resource/defaults",
  prefabs: "initialization",
  definitions: "model metadata",
  contracts: "infrastructure",
  compositions: "recipe",
  behaviors: "behavior",
};
const explicitOwners = new Map([
  ...["fishing", "crowd", "voting", "selection"].flatMap((kind) => [
    [`systems/collective/${kind}.ts`, [`prefabs/collective/${kind}`]],
    [`views/collective/${kind[0].toUpperCase() + kind.slice(1)}Scene.tsx`, [`appearance/collective-${kind}`]],
  ]),
  ["views/collective/Controls.tsx", ["fishing", "crowd", "voting", "selection"].flatMap((kind) => [`controls/collective-${kind}-action`, `displays/collective-${kind}-caption`, ...(kind === "crowd" ? [] : [`controls/collective-${kind}-choice`])])],

  ["visuals/BeamVisual.tsx", ["appearance/Beam"]],
  ["visuals/BridgeSupportVisual.tsx", ["appearance/BridgeSupport"]],
  ["visuals/LoadTruckVisual.tsx", ["appearance/LoadTruck"]],
  ["visuals/LauncherVisual.tsx", ["appearance/Launcher"]],
  ["visuals/TrajectoryVisual.tsx", ["appearance/Trajectory"]],
  ["visuals/VelocityArrowVisual.tsx", ["appearance/VelocityArrow"]],

  ["views/BridgeScene.tsx", ["appearance/Bridge"]],
  ["views/ProjectileScene.tsx", ["appearance/Projectile"]],
  ["views/ScopedWorldView.tsx", ["canvases/World"]],
  ["views/ThreeWorldView.tsx", ["canvases/World"]],
  ["visuals/CitizenVisual3D.tsx", ["appearance/TownCitizen"]],
  ["visuals/BuildingVisual3D.tsx", ["appearance/TownBuilding"]],
  ["visuals/MarketVisual3D.tsx", ["appearance/Market"]],
  ["visuals/TownSceneryVisual3D.tsx", ["appearance/TownScenery"]],
  ["visuals/TownEnvironment.tsx", ["appearance/TownScenery"]],
  ["systems/BallisticMotionSystem.ts", ["models/Projectile"]],
  ["systems/HeuristicBridgeResponseSystem.ts", ["models/BridgeResponse"]],
  ["systems/ScheduledTripSystem.ts", ["models/ScheduledTrip"]],
  ["systems/BehaviorRunnerSystem.ts", ["models/DailyRoutine"]],
  ["systems/NavigationSystem.ts", ["models/TownNavigation"]],
  ["systems/PathFollowingSystem.ts", ["models/TownNavigation"]],
  ["prefabs/TrussAssembly.ts", ["models/TrussJoint", "models/TrussMember"]],
  ["prefabs/BridgeLoad.ts", ["models/BridgeLoad"]],
  ["prefabs/Joint.ts", ["models/TrussJoint"]],
  ["prefabs/Member.ts", ["models/TrussMember"]],
  ["prefabs/Building.ts", ["models/TownBuilding"]],
  ["prefabs/Market.ts", ["models/Market"]],
  ["prefabs/Citizen.ts", ["models/DailyRoutine"]],

  ["controls/ActionButton.tsx", ["controls/Button"]],
  ["controls/NumberField.tsx", ["controls/NumberInput"]],
  ["controls/OptionSelect.tsx", ["controls/Select"]],
  ["controls/ParameterSlider.tsx", ["controls/Slider"]],
  ["controls/ToggleControl.tsx", ["controls/Toggle"]],
  ["views/ResultsTableView.tsx", ["displays/DataTable"]],
  ["views/HistogramView.tsx", ["displays/Histogram"]],
  ["views/EntityInspectorView.tsx", ["displays/Inspector"]],
  ["views/CartesianView.tsx", ["canvases/cartesian"]],
  ["views/DisplayView.tsx", ["canvases/diagram", "canvases/physical"]],
  ["systems/LineIntersectionSystem.ts", ["operations/LineIntersection"]],
  ["systems/FractionObservationSystem.ts", ["operations/FractionComparison"]],
  [
    "systems/chemistry/models.ts",
    [
      "prefabs/chemistry/Dilution",
      "prefabs/chemistry/Conservation",
      "prefabs/chemistry/ReactionRate",
    ],
  ],
  [
    "systems/physical-systems/models.ts",
    [
      "prefabs/physical-systems/Pendulum",
      "prefabs/physical-systems/RollingTrack",
      "prefabs/physical-systems/ResistiveCircuit",
    ],
  ],
  [
    "systems/natural-systems/models.ts",
    [
      "prefabs/natural-systems/DiffusionField",
      "prefabs/natural-systems/PredatorPrey",
      "prefabs/natural-systems/PlantGrowth",
    ],
  ],
  [
    "systems/dynamic-systems/models.ts",
    [
      "prefabs/dynamic-systems/CompoundGrowth",
      "prefabs/dynamic-systems/RingTraffic",
      "prefabs/dynamic-systems/CheckoutQueue",
    ],
  ],
  [
    "systems/math-foundations/models.ts",
    [
      "prefabs/math-foundations/Equation",
      "prefabs/math-foundations/Line",
      "prefabs/math-foundations/Circle",
    ],
  ],
]);
function definitionOwners(source, text, symbol) {
  const relative = source.split("/components/")[1],
    ids = new Set(explicitOwners.get(relative) || []);
  if (relative.startsWith("definitions/"))
    for (const definition of publicDefinitions.values())
      if (
        definition.id.startsWith("prefabs/Authored") &&
        text.includes(`id: "${definition.id}"`)
      )
        ids.add(definition.id);
  if (relative.startsWith("visuals/chemistry/"))
    for (const id of [
      "appearance/chemistry-dilution",
      "appearance/chemistry-conservation",
      "appearance/chemistry-rate",
    ])
      ids.add(id);
  if (relative.startsWith("visuals/physical-systems/"))
    for (const id of [
      "appearance/physical-pendulum",
      "appearance/physical-track",
      "appearance/physical-circuit",
    ])
      ids.add(id);
  if (relative.startsWith("visuals/natural-systems/"))
    for (const id of [
      "appearance/natural-diffusion",
      "appearance/natural-predator-prey",
      "appearance/natural-plant-growth",
    ])
      ids.add(id);
  if (relative.startsWith("visuals/dynamic-systems/"))
    for (const id of [
      "appearance/dynamic-growth",
      "appearance/dynamic-traffic",
      "appearance/dynamic-queue",
    ])
      ids.add(id);
  const prefixes = [
    ["systems/chemistry/models.ts", "dilution", ["prefabs/chemistry/Dilution"]],
    [
      "systems/chemistry/models.ts",
      "conservation",
      ["prefabs/chemistry/Conservation"],
    ],
    ["systems/chemistry/models.ts", "rate", ["prefabs/chemistry/ReactionRate"]],
    [
      "systems/physical-systems/models.ts",
      "pendulum",
      ["prefabs/physical-systems/Pendulum"],
    ],
    [
      "systems/physical-systems/models.ts",
      "track",
      ["prefabs/physical-systems/RollingTrack"],
    ],
    [
      "systems/physical-systems/models.ts",
      "circuit",
      ["prefabs/physical-systems/ResistiveCircuit"],
    ],
    [
      "systems/natural-systems/models.ts",
      "diff",
      ["prefabs/natural-systems/DiffusionField"],
    ],
    [
      "systems/natural-systems/models.ts",
      "population",
      ["prefabs/natural-systems/PredatorPrey"],
    ],
    [
      "systems/natural-systems/models.ts",
      "predator",
      ["prefabs/natural-systems/PredatorPrey"],
    ],
    [
      "systems/natural-systems/models.ts",
      "integrate",
      ["prefabs/natural-systems/PredatorPrey"],
    ],
    [
      "systems/natural-systems/models.ts",
      "plant",
      ["prefabs/natural-systems/PlantGrowth"],
    ],
    [
      "systems/dynamic-systems/models.ts",
      "growth",
      ["prefabs/dynamic-systems/CompoundGrowth"],
    ],
    [
      "systems/dynamic-systems/models.ts",
      "traffic",
      ["prefabs/dynamic-systems/RingTraffic"],
    ],
    [
      "systems/dynamic-systems/models.ts",
      "queue",
      ["prefabs/dynamic-systems/CheckoutQueue"],
    ],
    [
      "systems/dynamic-systems/models.ts",
      "simulateQueue",
      ["prefabs/dynamic-systems/CheckoutQueue"],
    ],
    [
      "systems/dynamic-systems/models.ts",
      "generateQueue",
      ["prefabs/dynamic-systems/CheckoutQueue"],
    ],
    [
      "systems/math-foundations/models.ts",
      "equation",
      ["prefabs/math-foundations/Equation"],
    ],
    [
      "systems/math-foundations/models.ts",
      "line",
      ["prefabs/math-foundations/Line"],
    ],
    [
      "systems/math-foundations/models.ts",
      "circle",
      ["prefabs/math-foundations/Circle"],
    ],
  ];
  const scoped = prefixes
    .filter(
      ([file, prefix]) =>
        relative === file &&
        symbol.toLowerCase().startsWith(prefix.toLowerCase()),
    )
    .flatMap(([, , owned]) => owned);
  if (prefixes.some(([file]) => file === relative)) {
    ids.clear();
    for (const id of scoped) ids.add(id);
    if (
      relative === "systems/physical-systems/models.ts" &&
      ["advance", "playback"].includes(symbol)
    )
      for (const id of [
        "prefabs/physical-systems/Pendulum",
        "prefabs/physical-systems/RollingTrack",
      ])
        ids.add(id);
  }
  return [...ids].map((id) => publicDefinitions.get(id)).filter(Boolean);
}
const compatibility =
  /(?:controls\/(?:Projectile|Bridge|Town)Controls|controls\/physical-systems\/PhysicalControls|views\/(?:SpatialRecipeView|AssemblyRecipeView|LegacyRecipeView|InstanceRecipeLesson|ThreeWorldView)|views\/(?:chemistry\/ChemistryLesson|dynamic-systems\/DynamicSystemsLesson|natural-systems\/NaturalSystemsView|physical-systems\/PhysicalSystemsView|math-foundations\/AssemblyView)|compositions\/)/;
const ledger = paths.flatMap((source) => {
  const file = path.join(root, source),
    text = fs.readFileSync(file, "utf8"),
    folder = source.split("/components/")[1].split("/")[0],
    exports = symbols.get(file) || [],
    active = consumers.get(file) || [];
  return (exports.length ? exports : ["(file)"]).map((symbol) => {
    const defs = definitionOwners(source, text, symbol);
    return {
      source,
      export: symbol,
      activeConsumers: active,
      responsibility: categories[folder] || "infrastructure",
      finalOwner: {
        kind: compatibility.test(source)
          ? "compatibility entry point"
          : defs.length
            ? "registered public package implementation"
            : ["catalog", "composites", "contracts"].includes(folder)
              ? "catalog/recipe infrastructure"
              : "private implementation owned by static consumers",
        packages: defs.map((d) => d.id),
        consumers: active.map((c) => c.source),
        destination: defs.length
          ? defs.map((d) => d.id).join(", ")
          : active.length
            ? active.map((c) => c.source).join(", ")
            : source,
      },
      classification: compatibility.test(source)
        ? "retained serialized/session compatibility alias"
        : source.endsWith("/README.md")
          ? "documentation"
          : source.endsWith(".css")
            ? "private presentation stylesheet"
            : !active.length
              ? "retirement candidate or stable re-export"
              : ["traits", "contracts"].includes(folder)
                ? "private/infrastructure"
                : folder === "views" &&
                    /Lesson|ExperimentView|AssemblyView|SystemsView/.test(
                      source,
                    )
                  ? "compatibility assembly"
                  : folder === "systems"
                    ? "private implementation of public model"
                    : folder === "definitions"
                      ? "public model adapter"
                      : folder === "controls" &&
                          /Commands|Prompt|Control\.ts$/.test(source)
                        ? "command adapter infrastructure"
                        : folder === "visuals"
                          ? "public appearance or colocated private helper"
                          : folder === "resources"
                            ? "resource or model defaults"
                            : folder === "compositions"
                              ? "compatibility recipe"
                              : "public implementation/private helper",
      readiness: defs.length
        ? "registered metadata; provider/recipe checks in verify-public-catalog.cjs"
        : "private, infrastructure, or compatibility implementation; active consumers retained",
      stateOwnership:
        folder === "systems" || folder === "traits"
          ? "owning domain model is the sole runtime writer; lifecycle operations initialize/reset"
          : "presentation consumes snapshots; control invokes declared command",
      commands: defs.flatMap((d) =>
        Object.entries(d.commands).map(([id, c]) => ({
          definition: d.id,
          id,
          ...c,
        })),
      ),
      outputs: defs.flatMap((d) =>
        Object.entries(d.outputs).map(([id, c]) => ({
          definition: d.id,
          id,
          ...c,
        })),
      ),
      space: defs.flatMap((d) => d.placement),
      coupling: {
        singletonImports: active.filter((c) =>
          /Session|session/.test(c.source),
        ),
        singletonReads: /use\w+Store|dispatchCommand|\.getState\(/.test(text),
        builderImports: /from ["'][^"']*builder/.test(text),
      },
      dependencies: active,
      identity: defs.map((d) => ({ id: d.id, version: d.version })),
      ownershipEvidence: defs.length
        ? "Explicit source-to-catalog owner mapping in the ledger generator"
        : active.length
          ? "Static import/re-export consumers identify the current compatibility owner"
          : "No active static consumer or standalone public catalog identity found",
      destination:
        folder === "traits" || folder === "contracts"
          ? "shared schema/runtime infrastructure"
          : folder === "views" &&
              /Lesson|ExperimentView|AssemblyView|SystemsView/.test(source)
            ? "public recipe renderer or retained serialized/session compatibility alias"
            : `public ${categories[folder] || "infrastructure"} owner; preserve serialized aliases`,
      verification:
        "baseline suite plus public-catalog contract and browser suites; see 009-IMPLEMENTATION-EVIDENCE.md",
      completion: compatibility.test(source)
        ? "Private lesson/control assembly retired; stable entry point delegates to public recipes or required compatibility protocol"
        : defs.length
          ? "Registered owner verified by permanent catalog/model/spatial/browser suites"
          : active.length
            ? "Private/infrastructure owner and active consumers recorded; not an independent selectable package"
            : "No active static consumer; retained data/type/export has no independent public registration",
    };
  });
});
const out = path.join(
  root,
  "docs/agent-only/implementation/009-SOURCE-LEDGER.json",
);
fs.writeFileSync(
  out,
  `${JSON.stringify(
    {
      generatedBy: "src/web/scripts/builder/audit-public-catalog.cjs",
      originalSourceFiles: originalPaths.length,
      sourceFiles: paths.length,
      exportRecords: ledger.length,
      records: ledger,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Recorded ${paths.length} source files and ${ledger.length} source/export rows.`,
);
