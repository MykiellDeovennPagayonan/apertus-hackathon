import {
  type ComponentInstance,
  type CompositeRecipe,
  emptyAuthoredDocument,
  emptyLayout,
  type Layout,
} from "../../runtime/authoring/types";
import type { ParameterSchema } from "../../runtime/parameterSchema";
import { publicDefinition, publicDefinitions } from "../catalog";
import { commandPresentation } from "../controls/commandPresentation";
import { outputDataPresentation } from "../views/dataPresentation";
import { spatialRecipes } from "./spatial";
export function schemaDefault(schema: ParameterSchema): unknown {
  switch (schema.type) {
    case "number":
    case "integer":
      return Math.max(schema.minimum, Math.min(schema.maximum, 1));
    case "boolean":
      return false;
    case "enum":
      return schema.values[0];
    case "string":
      return schema.enum?.[0] ?? "";
    case "array":
      return Array.from({ length: schema.minItems }, () =>
        schemaDefault(schema.items),
      );
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties)
          .filter(([key]) => !schema.optional?.includes(key))
          .map(([key, s]) => [key, schemaDefault(s)]),
      );
  }
}
export function createPublicNode(
  definition: string,
  id: string,
  scope: string,
): ComponentInstance {
  const d = publicDefinition(definition);
  return {
    id,
    definition,
    version: d.version,
    label: d.title,
    scope,
    configuration: structuredClone(d.defaults),
  };
}
export function modelRecipe(definition: string): CompositeRecipe {
  const model = publicDefinition(definition),
    d = emptyAuthoredDocument(),
    scope = "scope/lab";
  d.scopes.push({ id: scope, label: model.title });
  d.lesson = {
    title: model.title,
    instruction: model.description.slice(0, 150),
    explanation: model.assumptions.join("\n"),
  };
  const scene = {
      ...emptyLayout("layout/scene"),
      kind: "panel" as const,
      label: model.title,
    },
    controls = {
      ...emptyLayout("layout/controls"),
      kind: "panel" as const,
      label: "Try the experiment",
    },
    details = {
      ...emptyLayout("layout/details"),
      kind: "disclosure" as const,
      label: model.tags.includes("dynamic-systems")
        ? "Exact settings and model assumptions"
        : "Model assumptions and measurements",
    };
  d.layout.kind = "split";
  d.layout.children = [scene, controls, details];
  const advanced = {
    ...emptyLayout("layout/advanced"),
    kind: "disclosure" as const,
    label: "More ways to explore",
  };
  const learningModel = model.tags.includes("mathematics");
  function add(
    def: string,
    id: string,
    layout: Layout,
    configuration?: Record<string, unknown>,
  ) {
    const node = createPublicNode(def, id, scope);
    if (configuration) Object.assign(node.configuration, configuration);
    d.nodes.push(node);
    layout.children.push({ ...emptyLayout(`layout/${id}`), node: id });
    return node;
  }
  d.nodes.push(createPublicNode(definition, "model", scope));
  const appearance = [...publicDefinitions.values()].find(
    (p) =>
      (p.category === "appearance" || p.category === "canvases") &&
      p.inputs.model?.unit === definition,
  );
  if (appearance) {
    add(appearance.id, "appearance", scene);
    d.connections.push({
      id: "link/appearance",
      kind: "attachment",
      from: { node: "model", port: "appearance" },
      to: { node: "appearance", port: "model" },
    });
  }
  if (
    !appearance &&
    model.outputs.appearance &&
    /Authored(Line|Square|GasContainer|FractionBar)$/.test(definition)
  ) {
    const kind = model.outputs.appearance.unit;
    add(`canvases/${kind}`, "canvas", scene);
    d.connections.push({
      id: "link/canvas",
      kind: "attachment",
      from: { node: "model", port: "appearance" },
      to: { node: "canvas", port: "objects" },
    });
  }
  if (
    definition === "models/Projectile" ||
    definition === "models/BridgeResponse"
  ) {
    for (const id of definition === "models/Projectile"
      ? [
          "appearance/Launcher",
          "appearance/Trajectory",
          "appearance/VelocityArrow",
          "appearance/ProjectileBody",
        ]
      : [
          "appearance/Beam",
          "appearance/Joint",
          "appearance/BridgeSupport",
          "appearance/LoadTruck",
        ]) {
      const node = createPublicNode(id, id, scope);
      d.nodes.push(node);
      d.connections.push({
        id: `link/${id}`,
        kind: "attachment",
        from: { node: id, port: "scene" },
        to: { node: "appearance", port: "visuals" },
      });
    }
  }
  for (const [key, command] of Object.entries(model.commands)) {
    if (/SET_(RATE_)?PLAYING$/.test(key)) continue;
    const metadata = commandPresentation(key, definition);
    const args = schemaDefault(command.arguments) as Record<string, unknown>;
    // These are authored presets, not range/command contracts. Schemas remain the authority.
    const presets: Record<string, unknown> = {
      CHEM_ADD_WATER: 1,
      CHEM_SET_TEMPERATURE: 320,
      CHEM_SET_COEFFICIENTS: [1, 1, 1],
      SUBTRACT_BOTH: 3,
      DIVIDE_BOTH: 2,
      SET_SLOPE: 1,
      SET_INTERCEPT: 0,
      SET_RADIUS: 1,
    };
    if (Object.hasOwn(presets, key)) args.value = presets[key];
    if (key.startsWith("set:")) {
      const field = key.slice(4);
      args.value =
        (model.defaults.inputs as Record<string, unknown>)?.[field] ??
        model.defaults[field] ??
        args.value;
    }
    if (/SET_.*TASK/.test(key) && model.defaults.task)
      args.value = structuredClone(model.defaults.task);
    if (key === "SET_FRACTION_COMPARISON" && Array.isArray(model.defaults.bars))
      args.value = { a: model.defaults.bars[0], b: model.defaults.bars[1] };
    const valueSchema =
      command.arguments.type === "object"
        ? command.arguments.properties.value
        : undefined;
    const widget =
      valueSchema?.type === "boolean"
        ? "controls/Toggle"
        : key.startsWith("set:") &&
            (valueSchema?.type === "number" || valueSchema?.type === "integer")
          ? "controls/Slider"
          : Object.keys(args).length
            ? "controls/Form"
            : "controls/Button";
    const secondary =
      learningModel &&
      [
        "MOVE_TOKEN",
        "COUNT_TOKEN",
        "PLACE_TOKEN",
        "REMOVE_TOKEN",
        "SET_BAR_FRACTION",
        "TOGGLE_FRACTION_PIECE",
        "SUBDIVIDE_FRACTION",
        "SET_LOOPING",
      ].includes(key);
    add(widget, `control/${key}`, secondary ? advanced : controls, {
      label:
        key === "RESET" && model.tags.includes("natural-systems")
          ? "Reset initial settings"
          : metadata.label || command.description || key.replaceAll("_", " "),
      initial: JSON.stringify(args),
      mode: command.submission === "continuous" ? "immediate" : "submit",
    });
    d.connections.push({
      id: `link/control/${key}`,
      kind: "command",
      from: { node: `control/${key}`, port: "submit" },
      to: { node: "model", port: key },
    });
  }
  if (definition === "prefabs/chemistry/Dilution") {
    add("controls/Button", "quick-water", controls, {
      label: "Add 1 L of water",
      initial: "{}",
      mode: "submit",
    });
    d.connections.push({
      id: "link/quick-water",
      kind: "command",
      from: { node: "quick-water", port: "submit" },
      to: { node: "model", port: "CHEM_ADD_WATER" },
      arguments: { value: 1 },
    });
  }
  const quickActions: {
    action: string;
    label: string;
    value?: unknown;
    binding?: import("../../runtime/authoring/types").Connection["argumentBindings"];
  }[] = [];
  if (definition.endsWith("/DiffusionField"))
    quickActions.push({
      action: "DIFF_SCALE_COEFFICIENT",
      label: "Spread twice as fast",
      value: 2,
    });
  if (definition.endsWith("/PredatorPrey"))
    quickActions.push({
      action: "ECO_SCALE_INITIAL_RABBITS",
      label: "Start with half the rabbits",
      value: 0.5,
    });
  if (definition.endsWith("/PlantGrowth"))
    quickActions.push({
      action: "PLANT_SET_LIGHT",
      label: "Raise light above water",
      binding: {
        value: {
          from: { node: "model", port: "configuration" },
          path: ["water"],
          transform: "atLeast",
          operand: 0.7,
        },
      },
    });
  for (const [action] of Object.entries(model.commands))
    if (/SET_(RATE_)?PLAYING$/.test(action))
      quickActions.push({
        action,
        label: "Play / pause",
        binding: {
          value: { from: { node: "model", port: "playing" }, transform: "not" },
        },
      });
  for (const [i, quick] of quickActions.entries()) {
    const id = `quick/${i}`;
    add("controls/Button", id, controls, {
      label: quick.label,
      initial: "{}",
      mode: "submit",
    });
    const connection: import("../../runtime/authoring/types").Connection = {
      id: `link/${id}`,
      kind: "command",
      from: { node: id, port: "submit" },
      to: { node: "model", port: quick.action },
    };
    if (quick.binding) connection.argumentBindings = quick.binding;
    else
      connection.arguments =
        quick.value === undefined ? {} : { value: quick.value };
    d.connections.push(connection);
  }
  for (const [output, port] of Object.entries(model.outputs)) {
    if (
      port.kind === "attachment" ||
      output === "data" ||
      output === "board" ||
      output === "configuration" ||
      (learningModel && output === "playing" && !model.commands.SET_PLAYING) ||
      (output === "playing" &&
        quickActions.some((quick) => /SET_(RATE_)?PLAYING$/.test(quick.action)))
    )
      continue;
    const display =
      output === "frequencies"
        ? "displays/Histogram"
        : port.kind === "dataset"
          ? "displays/Chart"
          : port.kind === "grid" ||
              (output === "field" &&
                definition === "prefabs/natural-systems/DiffusionField")
            ? "displays/Heatmap"
            : ["atoms", "customers", "frequencies", "steps"].includes(output)
              ? "displays/DataTable"
              : output === "feedback"
                ? "displays/StatusMessage"
                : "displays/Readout";
    add(
      display,
      `display/${output}`,
      output === "pressureKPa"
        ? scene
        : output === "feedback" ||
            output === "playing" ||
            definition === "prefabs/chemistry/Dilution"
          ? controls
          : details,
      {
        label:
          output === "pressureKPa"
            ? "Pressure"
            : output === "atoms"
              ? "Atoms on each side"
              : output === "frequencies"
                ? "Observed and expected frequencies"
                : output === "field"
                  ? "Dye concentration"
                  : output === "points" || output === "comparisonPoints"
                    ? `${output === "comparisonPoints" ? "Comparison: " : ""}${outputDataPresentation(definition, output).yLabel ?? "Observations"}`
                    : `${output} ${port.unit === "1" ? "" : port.unit}`,
        precision: 3,
        ...outputDataPresentation(definition, output),
      },
    );
    d.connections.push({
      id: `link/output/${output}`,
      kind: "value",
      from: { node: "model", port: output },
      to: { node: `display/${output}`, port: "value" },
    });
  }
  add("displays/Text", "assumptions", details, {
    text: model.assumptions.join("\n"),
    variant: "body",
  });
  if (advanced.children.length) controls.children.push(advanced);
  if (learningModel) {
    const actionIds = new Set(
      d.nodes
        .filter((node) => node.definition === "controls/Button")
        .map((node) => node.id),
    );
    const actions = controls.children.filter(
      (child) => child.node && actionIds.has(child.node),
    );
    const setup = controls.children.filter(
      (child) =>
        child.node && /SET_.*TASK|SET_FRACTION_COMPARISON/.test(child.node),
    );
    const others = controls.children.filter(
      (child) => !actions.includes(child) && !setup.includes(child),
    );
    const actionRow = {
      ...emptyLayout("layout/activity-actions"),
      kind: "row" as const,
      label: "",
      gap: 8,
      children: actions,
    };
    controls.children = [
      ...setup,
      ...(actions.length ? [actionRow] : []),
      ...others,
    ];
  }
  const parameters =
    model.configuration.type === "object"
      ? Object.entries(model.configuration.properties)
          .filter(([field]) => Object.hasOwn(model.defaults, field))
          .map(([field, schema]) => ({
            name: field,
            node: "model",
            field,
            schema,
            default: structuredClone(model.defaults[field]),
          }))
      : [];
  return {
    recipeVersion: 1,
    id: `prebuilt/${definition.replaceAll("/", "-")}`,
    version: 1,
    title:
      definition === "prefabs/chemistry/Dilution"
        ? "Dilution Lab"
        : definition === "prefabs/AuthoredGasContainer"
          ? "Gas Pressure"
          : model.title,
    description: model.description,
    tags: [...model.tags, "lab"],
    document: d,
    nested: [],
    parameters,
    externalPorts: [],
    dependencies: [
      ...new Map(
        d.nodes.map((n) => [
          n.definition,
          { id: n.definition, version: n.version },
        ]),
      ).values(),
    ],
    assumptions: [...model.assumptions],
  };
}
const legacyBuiltInRecipes = [...publicDefinitions.values()]
  .filter(
    (d) =>
      d.category === "models" &&
      ((d.id.startsWith("models/") &&
        ![
          "models/TrussJoint",
          "models/TrussMember",
          "models/BridgeLoad",
          "models/BridgeResponse",
          "models/TownBuilding",
          "models/Market",
          "models/DailyRoutine",
          "models/TownNavigation",
        ].includes(d.id)) ||
        /Authored(Line|Square|GasContainer|FractionBar)$/.test(d.id) ||
        /prefabs\/(chemistry|math-foundations|physical-systems|natural-systems|dynamic-systems)\//.test(
          d.id,
        )),
  )
  .map((d) => modelRecipe(d.id));
legacyBuiltInRecipes.push(...spatialRecipes());
export const builtInRecipes = legacyBuiltInRecipes.map(
  (original): CompositeRecipe => {
    const recipe = structuredClone(original);
    if (recipe.id === "prebuilt/prefabs-AuthoredSquare") {
      recipe.title = "Square exploration";
      recipe.description =
        "Explore size and rotation with a square, connected controls, and live geometry results.";
    }
    if (recipe.id === "prebuilt/prefabs-AuthoredFractionBar") {
      recipe.title = "Fraction bar exploration";
      recipe.description =
        "Change a fraction bar using connected controls and live fraction results.";
    }
    recipe.discovery = {
      kind: "experiment",
      group: "experiments",
      summary: recipe.description,
      placement: "Own canvas, or reuse a compatible destination",
    };
    // A small intentional interface: one primary result and one reset action.
    // Optional means connect later; full internal inspection remains in Expand.
    if (!recipe.externalPorts.length) {
      const primary =
        recipe.document.nodes.find((n) => n.id === "model") ??
        recipe.document.nodes.find(
          (n) => publicDefinition(n.definition).category === "models",
        );
      if (primary) {
        const def = publicDefinition(primary.definition);
        const result = Object.entries(def.outputs).find(
          ([name, port]) =>
            ["value", "dataset", "grid"].includes(port.kind) &&
            name !== "configuration",
        );
        if (result)
          recipe.externalPorts.push({
            name: `Result: ${result[0]}`,
            endpoint: { node: primary.id, port: result[0] },
            direction: "output",
            port: result[1],
            required: false,
          });
        const reset = ["reset", "RESET"].find((name) => def.commands[name]);
        if (reset)
          recipe.externalPorts.push({
            name: "Reset",
            endpoint: { node: primary.id, port: reset },
            direction: "input",
            port: { kind: "command", unit: "" },
            required: false,
          });
      }
    }
    if (recipe.id === "prebuilt/prefabs-AuthoredLine") {
      recipe.version = 2;
      recipe.title = "Line exploration";
      recipe.description =
        "Explore slope and intercept with one line, two sliders, a reset button, and live equation and slope results.";
      recipe.document.lesson.title = recipe.title;
      const keep = new Set([
        "model",
        "canvas",
        "control/set:slope",
        "control/set:intercept",
        "control/reset",
        "display/equation",
        "display/slope",
      ]);
      recipe.document.nodes = recipe.document.nodes.filter((n) =>
        keep.has(n.id),
      );
      const labels: Record<string, string> = {
        "control/set:slope": "Slope slider",
        "control/set:intercept": "Intercept slider",
        "control/reset": "Reset line",
        "display/equation": "Equation",
        "display/slope": "Slope result",
      };
      for (const node of recipe.document.nodes)
        if (labels[node.id]) node.label = labels[node.id];
      recipe.document.connections = recipe.document.connections.filter(
        (c) => keep.has(c.from.node) && keep.has(c.to.node),
      );
      const prune = (layout: Layout) => {
        layout.children = layout.children.filter(
          (child) => !child.node || keep.has(child.node),
        );
        layout.children.forEach(prune);
      };
      prune(recipe.document.layout);
      recipe.parameters = recipe.parameters.filter((p) => keep.has(p.node));
      const model = publicDefinition("prefabs/AuthoredLine");
      recipe.externalPorts = [
        {
          name: "Line appearance",
          endpoint: { node: "model", port: "appearance" },
          direction: "output",
          port: model.outputs.appearance,
          required: false,
        },
        {
          name: "Slope",
          endpoint: { node: "model", port: "slope" },
          direction: "output",
          port: model.outputs.slope,
          required: false,
        },
        {
          name: "Intercept",
          endpoint: { node: "model", port: "intercept" },
          direction: "output",
          port: model.outputs.intercept,
          required: false,
        },
      ];
      recipe.discovery.summary = recipe.description;
    }
    return recipe;
  },
);
export function builtInRecipe(id: string, version = 1) {
  const r = [...builtInRecipes, ...legacyBuiltInRecipes].find(
    (r) => r.id === id && r.version === version,
  );
  if (!r) throw new Error(`${id}@${version}: unresolved recipe dependency`);
  return r;
}

export function learningConfiguration(
  board: import("../traits/MathBoards").MathBoard,
): Record<string, unknown> {
  if (board.demo === "fraction-builder")
    return { bars: board.bars.map((b) => b.value) };
  if (board.demo === "counting")
    return {
      task: { mode: board.mode, target: board.target },
      looping: board.sequence.looping,
    };
  if (board.demo === "arithmetic")
    return {
      task: { operation: board.operation, a: board.a, b: board.b },
      looping: board.sequence.looping,
    };
  if (board.demo === "equal-groups")
    return {
      task: {
        mode: board.mode,
        groups: board.groups,
        perGroup: board.perGroup,
        total: board.total,
      },
      looping: board.sequence.looping,
    };
  return { task: { mode: board.mode, a: board.a, b: board.b } };
}
