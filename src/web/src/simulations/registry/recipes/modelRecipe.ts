import {
  type ComponentInstance,
  type CompositeRecipe,
  emptyAuthoredDocument,
  emptyLayout,
  type Layout,
} from "../../creation-and-editing/authoring-engine/document";
import { loadGasPressureRecipe } from "../../legacy/components/composites/gas";
import {
  acceptedCommandArguments,
  commandPresentation,
} from "../contracts/commandPresentation";
import { outputDataPresentation } from "../contracts/dataPresentation";
import { schemaDefault } from "../contracts/defaults";
import { publicDefinition, publicDefinitions } from "../index";
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
  if (definition === "prefabs/AuthoredGasContainer")
    return loadGasPressureRecipe();
  const model = publicDefinition(definition),
    d = emptyAuthoredDocument(),
    scope = "scope/lab";
  d.scopes.push({ id: scope, label: model.title });
  d.lesson = {
    title: model.title,
    instruction: model.description,
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
      label: "More observations and Model assumptions",
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
    const modelNode = d.nodes.find((node) => node.id === "model");
    const display = modelNode?.configuration.display as
      | { x: number; y: number; width: number; height: number }
      | undefined;
    add(
      `canvases/${kind}`,
      "canvas",
      scene,
      display
        ? {
            xMin: display.x - 8,
            xMax: display.x + display.width + 8,
            yMin: display.y - 8,
            yMax: display.y + display.height + 8,
            grid: false,
          }
        : undefined,
    );
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
    const acceptedDefaults = acceptedCommandArguments(
      key,
      model.defaults,
      args,
    );
    if (acceptedDefaults) Object.assign(args, acceptedDefaults);
    const valueSchema =
      command.arguments.type === "object"
        ? command.arguments.properties.value
        : undefined;
    const widget =
      valueSchema?.type === "boolean"
        ? "controls/Toggle"
        : Object.keys(args).length === 1 &&
            (valueSchema?.type === "number" || valueSchema?.type === "integer")
          ? "controls/Slider"
          : Object.keys(args).length
            ? "controls/Form"
            : "controls/Button";
    const domainSecondary = [
      "ROLL_SCALE_RESISTANCE",
      "DIFF_SCALE_COEFFICIENT",
      "ECO_SCALE_INITIAL_RABBITS",
      "GROW_SET_SCENARIO",
      "CHEM_RESTART_RATE",
      "PHYS_RESTART",
      "DIFF_RESTART",
      "ECO_RESTART",
      "PLANT_RESTART",
      "TRAFFIC_RESTART",
    ].includes(key);
    const secondary =
      domainSecondary ||
      (learningModel &&
        [
          "MOVE_TOKEN",
          "COUNT_TOKEN",
          "PLACE_TOKEN",
          "REMOVE_TOKEN",
          "SET_BAR_FRACTION",
          "TOGGLE_FRACTION_PIECE",
          "SUBDIVIDE_FRACTION",
          "SET_LOOPING",
        ].includes(key));
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
    binding?: import("../../creation-and-editing/authoring-engine/document").Connection["argumentBindings"];
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
    const connection: import("../../creation-and-editing/authoring-engine/document").Connection =
      {
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
  const primaryOutputs: Record<string, string[]> = {
    "models/ratio": ["ratio", "percentage"],
    "models/area-perimeter": ["area", "perimeter"],
    "models/coordinates": ["x", "y"],
    "models/Projectile": ["range", "maxHeight"],
    "models/BridgeResponse": ["selected"],
    "models/TownNavigation": ["time", "activity"],
    "models/ScheduledTrip": ["time"],
    "prefabs/math-foundations/Equation": ["equation", "substitution"],
    "prefabs/math-foundations/Line": ["equation"],
    "prefabs/math-foundations/Circle": ["circumference", "diameter", "ratio"],
    "prefabs/chemistry/Conservation": ["equation", "balanced"],
    "prefabs/chemistry/ReactionRate": ["concentrationA", "concentrationB"],
    "prefabs/physical-systems/Pendulum": ["period", "angle"],
    "prefabs/physical-systems/RollingTrack": ["speed", "distance"],
    "prefabs/physical-systems/ResistiveCircuit": ["totalCurrent", "totalPower"],
    "prefabs/natural-systems/DiffusionField": [
      "centerConcentration",
      "edgeConcentration",
    ],
    "prefabs/natural-systems/PredatorPrey": ["rabbits", "foxes"],
    "prefabs/natural-systems/PlantGrowth": ["biomass", "limitingResources"],
    "prefabs/dynamic-systems/CompoundGrowth": ["compoundTotal", "simpleTotal"],
    "prefabs/dynamic-systems/RingTraffic": ["averageSpeed", "minimumGap"],
    "prefabs/dynamic-systems/CheckoutQueue": ["averageWait", "waiting"],
  };
  const outputLabels: Record<string, string> = {
    pressureKPa: "Pressure",
    saltMass: "Dissolved salt",
    volume: "Solution volume",
    concentration: "Salt concentration",
    range: "Distance travelled",
    maxHeight: "Maximum height",
    duration: "Duration",
    elapsed: "Elapsed time",
    samples: "Recorded observations",
    trajectory: "Trajectory",
    response: "Bridge response",
    selected: "Selected member",
    time: "Time",
    population: "Population",
    activity: "Current activity",
    people: "People",
    ratio: "Ratio",
    percentage: "Percentage",
    area: "Area",
    perimeter: "Perimeter",
    x: "Horizontal position",
    y: "Vertical position",
    equation: "Equation",
    yAtZero: "Value at x = 0",
    yAtOne: "Value at x = 1",
    rise: "Rise",
    run: "Run",
    slope: "Slope",
    intercept: "Vertical intercept",
    intersection: "Intersection",
    side: "Side length",
    entrance: "Entrance",
    closed: "Road closed",
    status: "Status",
    position: "Position",
    fraction: "Fraction",
    decimal: "Decimal value",
    comparison: "Comparison",
    solution: "Solution",
    substitution: "Check by substitution",
    leftCoefficient: "Coefficient",
    leftConstant: "Constant",
    right: "Right side",
    marker: "Marker",
    xMin: "Minimum x",
    xMax: "Maximum x",
    radius: "Radius",
    diameter: "Diameter",
    circumference: "Circumference",
    balanced: "Reaction balance",
    molecules: "Molecule counts",
    temperature: "Temperature",
    comparisonTemperature: "Previous temperature",
    rateConstant: "Rate constant",
    halfLife: "Half-life",
    comparisonRate: "Previous rate",
    comparisonHalfLife: "Previous half-life",
    concentrationA: "Reactant concentration",
    concentrationB: "Product concentration",
    totalConcentration: "Total concentration",
    productPoints: "Product concentration over time",
    period: "Period",
    angle: "Angle",
    cycles: "Completed cycles",
    lastPeriod: "Last complete period",
    entrySpeed: "Starting speed",
    deceleration: "Deceleration",
    stopTime: "Stopping time",
    stoppingDistance: "Stopping distance",
    distance: "Distance",
    speed: "Speed",
    stopped: "Motion",
    totalCurrent: "Total current",
    equivalentResistance: "Equivalent resistance",
    bulbVoltage: "Voltage per bulb",
    bulbCurrent: "Current per bulb",
    bulbPower: "Power per bulb",
    totalPower: "Total power",
    bulbReadings: "Bulb observations",
    diffusionCoefficient: "Diffusion coefficient",
    comparisonCoefficient: "Previous coefficient",
    totalMass: "Total dye mass",
    centerConcentration: "Centre concentration",
    midwayConcentration: "Midway concentration",
    edgeConcentration: "Edge concentration",
    comparisonCenter: "Previous centre concentration",
    stableTimestep: "Stable timestep",
    gridSize: "Grid size",
    rabbits: "Rabbits",
    foxes: "Foxes",
    rabbitDerivative: "Rabbit change rate",
    foxDerivative: "Fox change rate",
    initialRabbitDerivative: "Starting rabbit change rate",
    initialFoxDerivative: "Starting fox change rate",
    comparisonInitialRabbits: "Previous starting rabbits",
    biomass: "Biomass",
    growthRate: "Growth rate",
    comparisonGrowthRate: "Previous growth rate",
    comparisonLight: "Previous light",
    limitingResources: "Limiting resources",
    principal: "Starting balance",
    annualRate: "Annual interest rate",
    years: "Years",
    compoundTotal: "Compound balance",
    simpleTotal: "Simple balance",
    compoundInterest: "Compound interest",
    simpleInterest: "Simple interest",
    compoundPoints: "Compound growth",
    simplePoints: "Simple growth",
    vehicleCount: "Vehicles",
    averageSpeed: "Average speed",
    minimumSpeed: "Slowest speed",
    slowVehicles: "Slow vehicles",
    minimumGap: "Smallest gap",
    desiredHeadway: "Following time gap",
    density: "Vehicle density",
    disturbanceActive: "Braking disturbance",
    vehicles: "Vehicle observations",
    arrivals: "Customer arrivals",
    completed: "Customers served",
    waiting: "Customers waiting",
    inService: "Customers being served",
    averageWait: "Average wait",
    maximumQueue: "Longest queue",
    cashiers: "Open cashiers",
    arrivalRate: "Arrival rate",
    serviceRate: "Service rate",
    seed: "Random seed",
    feedback: "Activity feedback",
    playing: "Playback",
  };
  for (const [output, port] of Object.entries(model.outputs)) {
    if (
      port.kind === "attachment" ||
      output === "data" ||
      output === "board" ||
      output === "configuration" ||
      (learningModel && output === "playing" && !model.commands.SET_PLAYING) ||
      (output === "playing" &&
        quickActions.some(
          (quick) =>
            /SET_(RATE_)?PLAYING$/.test(quick.action) ||
            quick.action === "PHYS_PLAY",
        ))
    )
      continue;
    const display =
      output === "activity" && definition === "models/TownNavigation"
        ? "displays/DataTable"
        : output === "frequencies"
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
      output === "pressureKPa" || primaryOutputs[definition]?.includes(output)
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
                    : outputLabels[output] || output,
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
  {
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
    controls.children = learningModel
      ? [...setup, ...(actions.length ? [actionRow] : []), ...others]
      : [
          ...others.filter((child) => child.id !== advanced.id),
          ...(actions.length ? [actionRow] : []),
          ...others.filter((child) => child.id === advanced.id),
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
