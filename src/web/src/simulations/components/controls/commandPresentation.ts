import { mathAnalysisArguments } from "../catalog/mathAnalysis";
import { thermalOpticsLabels, thermalOpticsScalarCommands } from "../catalog/physicsThermalOptics";
import { physicsMechanicsLabels, physicsMechanicsScalarCommands } from "../catalog/physicsMechanics";
import { scienceSpecs } from "../../domains/science/specs";
import type { FieldPresentation } from "./SchemaForm";

/** Presentation metadata never changes command names, arguments, or validation. */
export function commandPresentation(command: string, definition: string) {
  const science = scienceSpecs.find(
    (s) => definition === `prefabs/science/${s.name}`,
  );
  if (science && command.startsWith(`SCI_${science.kind.toUpperCase()}_`)) {
    const op = command.slice(`SCI_${science.kind.toUpperCase()}_`.length);
    const setting = science.settings.find(
      (f) => op === `SET_${f.key.toUpperCase()}`,
    );
    const labels: Record<string, string> = {
      STEP: science.step,
      EXPOSE: "Introduce / repeat pathogen",
      INTRODUCE: "Introduce at selected patch",
      REMOVE: "Remove selected patch",
      RESTORE: "Restore native cover",
      BASELINE: "Keep baseline and restart",
      PLAY: "Play",
      PAUSE: "Pause",
      SELECT: "Inspect object",
      SPEED: "Playback speed",
      OVERLAY: "Labels and pathways",
    };
    const presentation: FieldPresentation = setting
      ? {
          value: {
            label: setting.label,
            help: setting.help,
            choices: setting.options
              ? Object.fromEntries(
                  setting.options.map((label, i) => [String(i), label]),
                )
              : undefined,
          },
        }
      : {};
    return {
      legacyLabels: [op.toLowerCase().replaceAll("_", " ")],
      label: setting?.label ?? labels[op],
      presentation,
      actionIntent:
        op === "STEP" || op === "EXPOSE" || op === "INTRODUCE"
          ? ("primary" as const)
          : ("secondary" as const),
      submitLabel: setting?.restart ? "Apply and restart" : undefined,
    };
  }
  const labels: Record<string, string> = {
    ...physicsMechanicsLabels,
    ...thermalOpticsLabels,
    LEVER_SET_PIVOT: "Pivot position",
    LEVER_SET_LENGTH: "Bar length",
    LEVER_SET_LOAD_FORCE: "Load force",
    LEVER_LIFT: "Lift / lower slightly",
    MOVE_LOAD: "Load position",
    SET_LOAD: "Load mass",
    LAUNCH: "Launch projectile",
    RESTART: "Restart flight",
    togglePiece: "Shade or unshade a piece",
    subdivide: "Subdivide the fraction",
    MOVE_MARKET: "Move the market",
    MARKET_BUSY: "Make the market busy",
    CHEM_ADD_WATER: "Add water",
    CHEM_SET_COEFFICIENTS: "Reaction coefficients",
    CHEM_BALANCE: "Balance the reaction",
    CHEM_SET_TEMPERATURE: "Reaction temperature",
    CHEM_RESTART_RATE: "Restart reaction",
    CHEM_STEP_RATE: "Advance reaction by one second",
    CHEM_ADD_TITRANT: "Dispense titrant",
    CHEM_SET_TITRANT_VOLUME: "Titrant volume",
    CHEM_RESET_TITRATION: "Reset titration",
    CHEM_SET_ACID_CONC: "Acid concentration",
    CHEM_SET_EQ_TEMP: "Equilibrium temperature",
    CHEM_SET_EQ_VOLUME: "Chamber volume",
    CHEM_ADD_GAS: "Inject gas",
    CHEM_SET_MATERIAL: "Material substance",
    CHEM_SET_PHASE_TEMP: "Substance temperature",
    CHEM_SET_PHASE_PRESSURE: "Chamber pressure",
    ECON_SET_DEMAND: "Demand intercept",
    ECON_SET_SUPPLY: "Supply intercept",
    ECON_SET_PRICE_CONTROL: "Price ceiling / floor",
    ECON_SET_TAX: "Excise tax",
    ECON_SET_PRICE: "Selling price",
    ECON_SET_CHOKE_PRICE: "Choke price",
    ECON_SET_MAX_QUANTITY: "Maximum demand quantity",
    ECON_SET_MARKET_PRICE: "Market price",
    ECON_SET_FIXED_COST: "Fixed overhead cost",
    PHYS_PLAY: "Playback",
    PHYS_RESTART: "Restart motion",
    PHYS_STEP: "Advance motion by 0.1 seconds",
    PEND_SET_LENGTH: "Pendulum length",
    PEND_SET_GRAVITY: "Gravity",
    PEND_SET_AMPLITUDE: "Starting angle",
    ROLL_SET_HEIGHT: "Ramp height",
    ROLL_SET_RESISTANCE: "Rolling resistance",
    ROLL_SET_GRAVITY: "Gravity",
    ROLL_SCALE_RESISTANCE: "Multiply rolling resistance",
    CIRC_ADD_BULB: "Add a bulb",
    CIRC_SET_BULBS: "Number of bulbs",
    CIRC_SET_TOPOLOGY: "Circuit arrangement",
    CIRC_SET_VOLTAGE: "Supply voltage",
    CIRC_SET_RESISTANCE: "Bulb resistance",
    DIFF_SET_COEFFICIENT: "Diffusion coefficient",
    DIFF_SCALE_COEFFICIENT: "Multiply diffusion coefficient",
    DIFF_RESTART: "Restart diffusion",
    DIFF_STEP: "Advance diffusion by 0.25 seconds",
    ECO_SET_INITIAL_RABBITS: "Starting rabbit population",
    ECO_SCALE_INITIAL_RABBITS: "Multiply starting rabbit population",
    ECO_RESTART: "Restart population study",
    ECO_STEP: "Advance population study by 0.25 model days",
    PLANT_SET_LIGHT: "Available light",
    PLANT_SET_WATER: "Available water",
    PLANT_SET_NUTRIENTS: "Available nutrients",
    PLANT_RESTART: "Restart growth",
    PLANT_STEP: "Advance growth by 0.25 days",
    GROW_SET_PRINCIPAL: "Starting balance",
    GROW_SET_RATE: "Annual interest rate",
    GROW_SET_YEARS: "Years of growth",
    GROW_SET_SCENARIO: "Choose a growth scenario",
    TRAFFIC_BRAKE: "Brake car 1",
    TRAFFIC_SET_HEADWAY: "Following time gap",
    TRAFFIC_STEP: "Advance traffic by 0.25 seconds",
    TRAFFIC_RESTART: "Restart traffic",
    QUEUE_SET_CASHIERS: "Open cashiers",
    QUEUE_SET_ARRIVAL_RATE: "Customer arrival rate",
    QUEUE_SET_SERVICE_RATE: "Service rate per cashier",
    SET_RATIO: "Choose a ratio",
    SET_DIMENSIONS: "Rectangle dimensions",
    MOVE_POINT: "Point coordinates",
    SET_DISTRIBUTION: "Choose a distribution",
    RUN_TRIALS: "Run random trials",
    SET_SLOPE: "Line slope",
    SET_INTERCEPT: "Vertical intercept",
    SET_RADIUS: "Circle radius",
    SUBTRACT_BOTH: "Subtract from both sides",
    DIVIDE_BOTH: "Divide both sides",
    UNDO: "Undo equation step",
    NEXT_STEP: "Next step",
    RESET: "Restart activity",
    reset: "Restore starting values",
    REPLAY: "Replay activity",
    SET_PLAYING: "Playback",
    SET_LOOPING: "Repeat activity",
    SET_ARITHMETIC_TASK: "Choose a calculation",
    SET_COUNTING_TASK: "Choose a counting task",
    SET_GROUPING_TASK: "Choose an equal groups task",
    SET_FRACTION_COMPARISON: "Compare two fractions",
    SET_BAR_FRACTION: "Change one fraction",
    TOGGLE_FRACTION_PIECE: "Shade or unshade a piece",
    SUBDIVIDE_FRACTION: "Divide a bar into smaller parts",
    SET_NUMBER_LINE_TASK: "Choose a fraction task",
    SET_TICK_DIVISIONS: "Number line divisions",
    PLACE_FRACTION: "Move the marker",
    CHECK_PLACEMENT: "Check placement",
    CHECK_COUNT: "Check your count",
    MOVE_TOKEN: "Move a circle",
    COUNT_TOKEN: "Count a circle",
    PLACE_TOKEN: "Place a circle",
    REMOVE_TOKEN: "Remove a circle",
    DISTRIBUTE_NEXT: "Share the next circle",
  };
  const presentation: FieldPresentation = {
    "value.0": { label: "First reactant coefficient" },
    "value.1": { label: "Second reactant coefficient" },
    "value.2": { label: "Product coefficient" },
    "value.bar": { label: "Bar", choices: { "0": "Bar A", "1": "Bar B" } },
    "value.piece": { label: "Piece number" },
    "value.factor": { label: "Subdivision factor" },
    "value.operation": {
      label: "Operation",
      choices: { add: "Addition", subtract: "Subtraction" },
    },
    "value.groups": { label: "Number of baskets" },
    "value.total": { label: "Total circles" },
    "value.numerator": { label: "First quantity" },
    "value.denominator": { label: "Second quantity" },
    "value.width": { label: "Width" },
    "value.height": { label: "Height" },
    "value.x": { label: "Horizontal position" },
    "value.y": { label: "Vertical position" },
    "value.annualRate": {
      label: "Annual interest rate",
      help: "Enter a fraction: 0.05 represents 5%.",
    },
    "value.years": { label: "Years of growth" },
    "value.preset": {
      label: "Trial type",
      choices: { coin: "Coin", die: "Six-sided die" },
    },
    "value.seed": {
      label: "Random seed",
      help: "The same seed reproduces the same trial sequence.",
    },
    "value.target": { label: "Number of circles" },
    "value.perGroup": { label: "Circles per group" },
    "value.n": { label: "Shaded parts" },
    "value.d": { label: "Total parts" },
  };
  if (definition === "prefabs/AuthoredGasContainer" && command === "set:volume")
    presentation.value = { step: 0.05 };
  if (definition.includes("fraction")) {
    if (command === "SET_FRACTION_COMPARISON")
      presentation.value = {
        help: "Shaded parts cannot exceed total parts. Applying replaces both bars; changing a denominator creates a new partition.",
      };
    presentation["value.a"] = { label: "First fraction" };
    presentation["value.b"] = { label: "Second fraction" };
    for (const fraction of ["a", "b", "fraction"]) {
      presentation[`value.${fraction}.n`] = { label: "Shaded parts" };
      presentation[`value.${fraction}.d`] = { label: "Total parts" };
    }
  } else {
    presentation["value.a"] = { label: "First number" };
    presentation["value.b"] = { label: "Second number" };
  }
  if (/SET_.*TASK/.test(command))
    presentation.value = {
      help: "Starting a new activity clears the current progress.",
    };
  const modes: Record<string, string> = definition.includes("counting")
    ? { count: "Count the circles", place: "Place the circles" }
    : definition.includes("equal-groups")
      ? { build: "Build equal groups", share: "Share into baskets" }
      : {
          place: "Place a fraction",
          add: "Add fractions",
          subtract: "Subtract fractions",
        };
  presentation["value.mode"] = { label: "Activity", choices: modes };
  if (command === "CIRC_SET_TOPOLOGY")
    presentation.value = {
      widget: "segmented",
      choices: { series: "Series", parallel: "Parallel" },
      help: "Series: bulbs share one path. Parallel: each bulb has its own path.",
    };
  if (command === "CHEM_SET_MATERIAL")
    presentation.value = {
      widget: "Select",
      choices: {
        water: "Water (H₂O)",
        "carbon-dioxide": "Carbon Dioxide (CO₂)",
        nitrogen: "Nitrogen (N₂)",
      },
      help: "Select material substance to observe its distinctive phase diagram and critical points.",
    };
  if (definition === "models/EclipseGeometry") {
    const help: Record<string, string> = {
      "set:moonAngle":
        "Move the Moon around Earth. 180° gives solar alignment; 0° gives lunar alignment.",
      "set:moonOffset":
        "Move the Moon above or below the alignment. Zero keeps it in the same plane.",
      "set:moonDistance":
        "Move the Moon nearer to or farther from Earth. Distances are scaled for the diagram.",
    };
    presentation.value = { help: help[command] };
  }
  const consequences: Record<string, string> = {
    NUTRIENT_SET_NITROGEN: "0–150 relative supply · 100 is sufficient.",
    NUTRIENT_SET_PHOSPHORUS: "0–150 relative supply · 100 is sufficient.",
    NUTRIENT_SET_POTASSIUM: "0–150 relative supply · 100 is sufficient.",
    FIRE_SET_COVERAGE: "Preset replaces your chosen patches.",
    FIRE_SET_WIND: "0 = mild · 100 = extreme wind.",
    FIRE_SET_MOISTURE: "0 = dry · 100 = very moist fuel.",
    WEB_SET_PRESSURE: "0 = removed · 100 = baseline · 150 = stronger pressure.",
    PRODUCTION_SET_SPECIALIZATION:
      "0 = broad tasks · 100 = narrow specialization.",
    PRODUCTION_SET_DELAY: "0 = balanced · 100 = sixfold delay at Join.",
    PRODUCTION_SET_DISRUPTION: "0 = normal · 100 = four-hour interruption.",

    PEND_SET_LENGTH: "Longer rods swing more slowly.",
    PEND_SET_AMPLITUDE: "Release angle (0–90°). Larger swings take longer.",
    TRAFFIC_SET_HEADWAY:
      "Time each driver leaves to the car ahead. A smaller gap means closer following.",
    CHEM_ADD_WATER:
      "Adds this volume to the current solution. The salt mass stays unchanged.",
    CHEM_SET_COEFFICIENTS:
      "Changes molecule counts; chemical formulas stay fixed.",
    CHEM_SET_TEMPERATURE:
      "Starts a new run at this temperature and keeps the previous temperature for comparison.",
    DIFF_SET_COEFFICIENT:
      "Restarts diffusion with the current coefficient retained for comparison.",
    ECO_SET_INITIAL_RABBITS: "Restarts the study with this initial population.",
    QUEUE_SET_ARRIVAL_RATE:
      "Generates a new queue with the same seed and this arrival rate.",
    QUEUE_SET_SERVICE_RATE:
      "Generates a new queue with the same seed and this service rate.",
    PLANT_SET_LIGHT:
      "Restarts growth and retains the previous light level for comparison. Use 0–1 for the available fraction.",
    PLANT_SET_WATER: "Restarts growth. Use 0–1 for the available fraction.",
    PLANT_SET_NUTRIENTS: "Restarts growth. Use 0–1 for the available fraction.",
    GROW_SET_RATE: "Enter a fraction: 0.05 represents 5% per year.",
    SET_DISTRIBUTION: "Changes the trial setup and replaces its observations.",
    RUN_TRIALS:
      "Runs the chosen number of trials using the current distribution.",
  };
  if (consequences[command])
    presentation.value = { ...presentation.value, help: consequences[command] };
  if (/^(NUTRIENT|FIRE|WEB|PRODUCTION)_SET_/.test(command))
    presentation.value = {
      ...presentation.value,
      limits: false,
      compact: true,
    };
  const propertyLabels: Record<string, string> = {
    distance: "Foot distance",
    height: "Wall contact height",
    moonAngle: "Moon position",
    moonOffset: "Alignment offset",
    moonDistance: "Distance from Earth",
    angle: "Launch angle",
    velocity: "Launch speed",
    gravity: "Gravity",
    slowMo: "Slow motion",
    trajectoryVisible: "Show trajectory",
    showVectors: "Show velocity vectors",
    present: "Include this member",
    time: "Time",
    speed: "Speed",
    roadClosed: "Close the road",
    partitions: "Total parts",
    amount: "Amount of gas",
    temperature: "Temperature",
    volume: "Volume",
    side: "Side length",
    rotation: "Rotation",
    slope: "Slope",
    intercept: "Vertical intercept",
    x: "Horizontal position",
    z: "Ground position",
    closed: "Close the road",
  };
  return {
    legacyLabels:
      (
        {
          "set:moonAngle": [
            "Moon Angle (degrees)",
            "Moon Angle",
            "Set moonAngle",
          ],
          "set:moonOffset": ["Moon Offset", "Set moonOffset"],
          "set:moonDistance": ["Moon Distance", "Set moonDistance"],
          CIRC_SET_TOPOLOGY: ["Topology: Series or Parallel"],
          PEND_SET_LENGTH: ["Length (m)", "Length"],
          PEND_SET_AMPLITUDE: ["Amplitude (deg)", "Amplitude"],
          TRAFFIC_SET_HEADWAY: ["Desired Headway (s)", "Desired Headway"],
          TRAFFIC_BRAKE: ["Brake Lead Vehicle", "Brake lead vehicle"],
        } as Record<string, string[]>
      )[command] ?? [],
    label:
      labels[command] ||
      (command.startsWith("set:")
        ? propertyLabels[command.slice(4)]
        : undefined) ||
      (/SET_(RATE_)?PLAYING$/.test(command) ? "Playback" : undefined),
    presentation,
    actionIntent: /RESET|RESTART|^reset$/.test(command)
      ? ("quiet" as const)
      : command === "CHEM_BALANCE"
        ? ("primary" as const)
        : ("secondary" as const),
    submitLabel: /SET_.*TASK/.test(command)
      ? "Start this activity"
      : command === "SET_FRACTION_COMPARISON"
        ? "Compare fractions"
        : undefined,
  };
}

/** Explicit accepted-value adapters. Additive actions deliberately have no current value. */
export function acceptedCommandArguments(
  command: string,
  state: Record<string, unknown> | undefined,
  draft?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!state) return;
  if (command.startsWith("MA_")) return mathAnalysisArguments(command, state);
  const science = /^SCI_[A-Z]+_SET_(.+)$/.exec(command);
  if (science) {
    const settings = state.settings as Record<string, unknown> | undefined;
    const key = Object.keys(settings ?? {}).find(
      (key) => key.toUpperCase() === science[1],
    );
    if (settings && key) return { value: settings[key] };
  }
  if (command.startsWith("WEB_SET_")) {
    const key = command.slice("WEB_SET_".length).toLowerCase();
    if (Object.hasOwn(state, key)) return { value: state[key] };
  }
  const inputs = state.inputs as Record<string, unknown> | undefined;
  if (command.startsWith("set:")) {
    const key = command.slice(4);
    if (inputs && Object.hasOwn(inputs, key)) return { value: inputs[key] };
    if (Object.hasOwn(state, key)) return { value: state[key] };
    return;
  }
  const scalar: Record<string, string> = {
    ...physicsMechanicsScalarCommands,
    ...thermalOpticsScalarCommands,
    LEVER_SET_PIVOT: "pivotPercent",
    LEVER_SET_LENGTH: "length",
    LEVER_SET_LOAD_FORCE: "loadForce",
    NUTRIENT_SET_NITROGEN: "nitrogen",
    NUTRIENT_SET_PHOSPHORUS: "phosphorus",
    NUTRIENT_SET_POTASSIUM: "potassium",
    FIRE_SET_COVERAGE: "coverage",
    FIRE_SET_WIND: "wind",
    FIRE_SET_MOISTURE: "moisture",
    WEB_SET_PRESSURE: "pressure",
    PRODUCTION_SET_SPECIALIZATION: "specialization",
    PRODUCTION_SET_DELAY: "delay",
    PRODUCTION_SET_DISRUPTION: "disruption",

    MOVE_LOAD: "position",
    SET_LOAD: "magnitude",
    CHEM_SET_TEMPERATURE: "temperature",
    CHEM_SET_COEFFICIENTS: "coefficients",
    CHEM_SET_TITRANT_VOLUME: "titrantVolumeAdded",
    CHEM_SET_ACID_CONC: "acidConcentration",
    CHEM_SET_EQ_TEMP: "temperature",
    CHEM_SET_EQ_VOLUME: "volume",
    CHEM_SET_MATERIAL: "material",
    CHEM_SET_PHASE_TEMP: "temperature",
    CHEM_SET_PHASE_PRESSURE: "pressure",
    ECON_SET_DEMAND: "demandIntercept",
    ECON_SET_SUPPLY: "supplyIntercept",
    ECON_SET_PRICE_CONTROL: "priceControl",
    ECON_SET_TAX: "tax",
    ECON_SET_PRICE: "currentPrice",
    ECON_SET_CHOKE_PRICE: "chokePrice",
    ECON_SET_MAX_QUANTITY: "maxQuantity",
    ECON_SET_MARKET_PRICE: "marketPrice",
    ECON_SET_FIXED_COST: "fixedCost",
    PEND_SET_LENGTH: "length",
    PEND_SET_GRAVITY: "gravity",
    PEND_SET_AMPLITUDE: "amplitude",
    ROLL_SET_HEIGHT: "height",
    ROLL_SET_RESISTANCE: "resistance",
    ROLL_SET_GRAVITY: "gravity",
    CIRC_SET_BULBS: "bulbs",
    CIRC_SET_TOPOLOGY: "topology",
    CIRC_SET_VOLTAGE: "voltage",
    CIRC_SET_RESISTANCE: "resistance",
    DIFF_SET_COEFFICIENT: "diffusionCoefficient",
    ECO_SET_INITIAL_RABBITS: "initialRabbits",
    PLANT_SET_LIGHT: "light",
    PLANT_SET_WATER: "water",
    PLANT_SET_NUTRIENTS: "nutrients",
    GROW_SET_PRINCIPAL: "principal",
    GROW_SET_RATE: "annualRate",
    GROW_SET_YEARS: "years",
    TRAFFIC_SET_HEADWAY: "desiredHeadway",
    QUEUE_SET_CASHIERS: "cashiers",
    QUEUE_SET_ARRIVAL_RATE: "arrivalRate",
    QUEUE_SET_SERVICE_RATE: "serviceRate",
    SET_SLOPE: "slope",
    SET_INTERCEPT: "intercept",
    SET_RADIUS: "radius",
    SET_TICK_DIVISIONS: "divisions",
  };
  if (scalar[command] && Object.hasOwn(state, scalar[command]))
    return { value: state[scalar[command]] };
  if (command === "SET_LOOPING")
    return {
      value:
        (state.sequence as { looping?: boolean } | undefined)?.looping ?? false,
    };
  const compound: Record<string, string[]> = {
    SET_ARITHMETIC_TASK: ["operation", "a", "b"],
    SET_COUNTING_TASK: ["mode", "target"],
    SET_GROUPING_TASK: ["mode", "groups", "perGroup", "total"],
    SET_NUMBER_LINE_TASK: ["mode", "a", "b"],
    SET_RATIO: ["numerator", "denominator"],
    SET_DIMENSIONS: ["width", "height"],
    MOVE_POINT: ["x", "y"],
    SET_DISTRIBUTION: ["preset", "seed", "trials"],
    GROW_SET_SCENARIO: ["annualRate", "years"],
  };
  if (compound[command]?.every((key) => Object.hasOwn(state, key)))
    return {
      value: Object.fromEntries(
        compound[command].map((key) => [key, state[key]]),
      ),
    };
  if (
    command === "PLACE_FRACTION" &&
    state.placed &&
    typeof state.divisions === "number"
  ) {
    const placed = state.placed as { n: number; d: number };
    return { value: (placed.n * state.divisions) / placed.d };
  }
  const bars = state.bars as { value: unknown }[] | undefined;
  if (command === "SET_FRACTION_COMPARISON" && bars?.length === 2)
    return { value: { a: bars[0].value, b: bars[1].value } };
  if (command === "SET_BAR_FRACTION" && bars) {
    const value = draft?.value as { bar?: number } | undefined;
    const bar = value?.bar ?? 0;
    if (bars[bar]) return { value: { bar, fraction: bars[bar].value } };
  }
}
