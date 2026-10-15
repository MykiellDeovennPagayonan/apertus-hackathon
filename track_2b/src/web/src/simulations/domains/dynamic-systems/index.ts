import {
  createCheckoutScenario,
  createGrowthScenario,
  createTrafficRing,
} from "../../legacy/components/prefabs/dynamic-systems/objects";
import { dynamicDefaults } from "../../legacy/components/resources/dynamic-systems/defaults";
import {
  growthApply,
  growthMeasure,
  queueApply,
  queueMeasure,
  trafficApply,
  trafficConfiguration,
  trafficMeasure,
  trafficStep,
} from "../../legacy/components/systems/dynamic-systems/models";
import type {
  DomainContribution,
  DomainModel,
} from "../../registry/contracts/domainContribution";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
} from "../../registry/contracts/parameterSchema";

const action = (
  value: ParameterSchema | undefined,
  description: string,
  timing: "live" | "relaunch" | "rebuild" = "live",
) => ({
  arguments: object(value ? { value } : {}),
  description,
  timing,
  target: "instance" as const,
});
const output = (unit: string, description: string) => ({ unit, description });
const dependencies = (name: string, system: string, control: string) => ({
  resources: ["dynamic-systems/EducationalDefaults"],
  traits: [`dynamic-systems/${name}State`],
  behaviors: [],
  systems: [`dynamic-systems/${system}`],
  visuals: [`dynamic-systems/${name}Visual`],
  views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
  controls: [`dynamic-systems/${control}`],
  prefabs: [`dynamic-systems/${name}`],
  compositions: [],
});

export const compoundGrowth: DomainModel = {
  ref: "prefabs/dynamic-systems/CompoundGrowth",
  version: 1,
  name: "Compound and simple interest",
  presentation: "dynamic-growth",
  maximumInstances: 1,
  creationDefaults: {
    structure: "single",
    objects: [
      {
        label: "Compound growth scenario",
        parameters: { ...dynamicDefaults.growth },
      },
    ],
    explanation:
      "Use one editable balance object. Its authoritative outputs already contain both compound and simple-interest series; those series are not independent objects.",
  },
  description:
    "Compare annual compound growth P(1+r)^t with simple interest P(1+rt) for a starting balance, annual rate, and whole-year duration. Use $100, 5%, and 10 years when the learner does not specify values.",
  assumptions: [
    "Annual compounding over whole annual periods; no deposits, withdrawals, fees, tax, or inflation.",
    "This is a mathematical scenario, not a prediction or financial recommendation. Internal values retain full precision; currency is rounded only for display.",
  ],
  parameters: object(
    {
      principal: num(0.01, 1_000_000, "currency units"),
      annualRate: num(0, 1, "1/year"),
      years: num(0, 25, "years", true),
    },
    ["principal", "annualRate", "years"],
  ),
  defaults: { ...dynamicDefaults.growth },
  outputs: {
    principal: output("currency units", "Starting balance"),
    annualRate: output("1/year", "Annual decimal interest rate"),
    years: output("years", "Whole annual periods"),
    compoundTotal: output("currency units", "Balance with annual compounding"),
    simpleTotal: output("currency units", "Balance with simple interest"),
    compoundInterest: output("currency units", "Compound interest earned"),
    simpleInterest: output("currency units", "Simple interest earned"),
    compoundPoints: output("currency units", "Compound balance by year"),
    simplePoints: output("currency units", "Simple balance by year"),
  },
  requiredObservations: [
    "principal",
    "annualRate",
    "years",
    "compoundTotal",
    "simpleTotal",
    "compoundPoints",
  ],
  graphOutput: "compoundPoints",
  actions: {
    GROW_SET_SCENARIO: action(
      object({
        annualRate: num(0, 1, "1/year"),
        years: num(0, 25, "years", true),
      }),
      "Use this single atomic operation whenever the same prompt specifies BOTH an annual interest rate AND a duration, for example '10 percent for 2 years'; preserve starting balance",
    ),
    GROW_SET_PRINCIPAL: action(
      num(0.01, 1_000_000, "currency units"),
      "Set the starting balance and preserve rate and duration",
    ),
    GROW_SET_RATE: action(
      num(0, 1, "1/year"),
      "Set annual interest as a decimal, where 0.10 means 10 percent, only when the prompt does not also specify a duration; preserve balance and duration",
    ),
    GROW_SET_YEARS: action(
      num(0, 25, "years", true),
      "Set the number of whole annual periods and preserve balance and rate",
    ),
  },
  dependencies: dependencies(
    "CompoundGrowth",
    "AnnualAccumulationSystem",
    "GrowthControls",
  ),
  initialize: createGrowthScenario,
  configuration: (state) => {
    const { principal, annualRate, years } = state;
    return { principal, annualRate, years };
  },
  apply: growthApply,
  measure: growthMeasure,
};

export const ringTraffic: DomainModel = {
  ref: "prefabs/dynamic-systems/RingTraffic",
  version: 1,
  name: "Stop-and-go traffic on a closed road",
  presentation: "dynamic-traffic",
  maximumInstances: 2,
  creationDefaults: {
    structure: "single",
    objects: [
      {
        label: "Closed-road traffic",
        parameters: { ...dynamicDefaults.traffic },
      },
    ],
    explanation:
      "Use one editable ring for an ordinary jam or headway question. Add a second independent lower-density ring only when the learner explicitly requests a control comparison.",
  },
  description:
    "Seeded vehicles follow the Intelligent Driver Model on a periodic closed road. A brief brake disturbance changes authoritative vehicle speeds and can grow into a backward-travelling slow region without an accident. Compare a lower-density independent ring when requested.",
  assumptions: [
    "Intelligent Driver Model with 4 m vehicle length, synchronous fixed substeps of at most 0.05 s, periodic positions, bounded acceleration, and nonnegative speeds.",
    "The brake action slows vehicle 1 for 2.5 simulation seconds. No crash or blocked road is inserted; the view is derived from vehicle state.",
    "Bigger gaps means a larger desired time headway at the same vehicle count and road length. It changes future following behavior rather than instantly moving cars.",
  ],
  parameters: object(
    {
      vehicleCount: num(6, 28, "vehicles", true),
      roadLength: num(100, 1000, "m"),
      desiredSpeed: num(2, 40, "m/s"),
      desiredHeadway: num(0.5, 3, "s"),
      minimumGap: num(1, 10, "m"),
      maximumAcceleration: num(0.2, 5, "m/s²"),
      comfortableBraking: num(0.5, 6, "m/s²"),
      seed: num(1, 2_147_483_647, "1", true),
      playing: boolean,
    },
    [
      "vehicleCount",
      "roadLength",
      "desiredSpeed",
      "desiredHeadway",
      "minimumGap",
      "maximumAcceleration",
      "comfortableBraking",
      "seed",
      "playing",
    ],
  ),
  defaults: { ...dynamicDefaults.traffic },
  outputs: {
    elapsed: output("s", "Simulation time"),
    playing: output("1", "Whether the authoritative clock advances traffic"),
    vehicleCount: output("vehicles", "Conserved vehicle count"),
    averageSpeed: output("m/s", "Mean vehicle speed"),
    minimumSpeed: output("m/s", "Slowest vehicle speed"),
    slowVehicles: output("vehicles", "Vehicles below half desired speed"),
    minimumGap: output("m", "Smallest bumper-to-bumper gap"),
    desiredHeadway: output("s", "Desired time headway"),
    density: output("vehicles/km", "Ring density"),
    disturbanceActive: output("1", "Whether the brake disturbance is active"),
    vehicles: output(
      "vehicle state",
      "Periodic position and speed of every vehicle",
    ),
    points: output("m/s", "Average speed versus simulation seconds"),
  },
  requiredObservations: [
    "elapsed",
    "vehicleCount",
    "averageSpeed",
    "minimumSpeed",
    "minimumGap",
    "desiredHeadway",
    "vehicles",
    "points",
  ],
  graphOutput: "points",
  actions: {
    TRAFFIC_BRAKE: action(
      undefined,
      "Briefly brake the seeded lead vehicle and run the authoritative model",
      "relaunch",
    ),
    TRAFFIC_SET_HEADWAY: action(
      num(0.5, 3, "s"),
      "Set desired time headway at fixed vehicle count; preserve road, seed and model settings",
    ),
    TRAFFIC_SET_PLAYING: action(
      boolean,
      "Play or pause traffic on the shared simulation clock",
    ),
    TRAFFIC_STEP: action(
      undefined,
      "Advance paused traffic by 0.25 simulation seconds",
    ),
    TRAFFIC_RESTART: action(
      undefined,
      "Restore seeded positions and speeds with current accepted settings",
      "relaunch",
    ),
  },
  dependencies: dependencies(
    "RingTraffic",
    "IntelligentDriverSystem",
    "TrafficControls",
  ),
  initialize: createTrafficRing,
  configuration: trafficConfiguration,
  apply: trafficApply,
  measure: trafficMeasure,
  step: trafficStep,
};

export const checkoutQueue: DomainModel = {
  ref: "prefabs/dynamic-systems/CheckoutQueue",
  version: 1,
  name: "One or two checkout cashiers",
  presentation: "dynamic-queue",
  maximumInstances: 1,
  creationDefaults: {
    structure: "single",
    objects: [
      {
        label: "Checkout line",
        parameters: { ...dynamicDefaults.queue },
      },
    ],
    explanation:
      "Use one editable seeded queue. Opening cashier 2 re-evaluates the same stored arrivals and service durations inside that object, rather than creating an unrelated second schedule.",
  },
  description:
    "A seeded FIFO checkout scheduler compares one or two cashiers over a fixed horizon. Changing cashier count reuses exactly the same pre-generated customer arrival times and service durations.",
  assumptions: [
    "Seeded exponential interarrival and service durations; default averages are 0.8 arrivals/min and 1 service/min per cashier over a 60-minute observation horizon.",
    "FIFO is global and each next customer uses the earliest available cashier. Statistics distinguish completed, in-service, and waiting customers at the horizon.",
    "A short seeded run is one scenario, not a guarantee of the theoretical long-run average. There is no warm-up period in the default run.",
  ],
  parameters: object(
    {
      arrivalRate: num(0.05, 2, "/min"),
      serviceRate: num(0.1, 3, "/min/cashier"),
      duration: num(5, 240, "min"),
      cashiers: choice(1, 2),
      seed: num(1, 2_147_483_647, "1", true),
    },
    ["arrivalRate", "serviceRate", "duration", "cashiers", "seed"],
  ),
  defaults: { ...dynamicDefaults.queue },
  outputs: {
    arrivals: output("customers", "Customers arriving by the horizon"),
    completed: output("customers", "Customers completed by the horizon"),
    waiting: output("customers", "Customers still queued at the horizon"),
    inService: output("customers", "Customers in service at the horizon"),
    averageWait: output("min", "Mean scheduled wait for this seeded cohort"),
    maximumQueue: output("customers", "Largest observed FIFO waiting line"),
    cashiers: output("cashiers", "Active service stations"),
    duration: output("min", "Observation horizon"),
    arrivalRate: output("/min", "Average arrival rate parameter"),
    serviceRate: output("/min/cashier", "Average service capacity parameter"),
    seed: output("1", "Reproducible schedule seed"),
    customers: output(
      "customer schedule",
      "First 24 scheduled customer outcomes",
    ),
    points: output("min", "Customer wait versus arrival minute"),
  },
  requiredObservations: [
    "arrivals",
    "completed",
    "waiting",
    "inService",
    "averageWait",
    "maximumQueue",
    "cashiers",
    "customers",
    "points",
  ],
  graphOutput: "points",
  actions: {
    QUEUE_SET_CASHIERS: action(
      choice(1, 2),
      "Use one or two cashiers while preserving the exact arrival and service schedule",
    ),
    QUEUE_SET_ARRIVAL_RATE: action(
      num(0.05, 2, "/min"),
      "Generate a new seeded arrival schedule at this rate while preserving service capacity and seed",
      "rebuild",
    ),
    QUEUE_SET_SERVICE_RATE: action(
      num(0.1, 3, "/min/cashier"),
      "Generate seeded service durations at this per-cashier rate while preserving arrivals and seed",
      "rebuild",
    ),
  },
  dependencies: dependencies(
    "CheckoutQueue",
    "FifoEventScheduler",
    "QueueControls",
  ),
  initialize: createCheckoutScenario,
  configuration: (state) => {
    const { arrivalRate, serviceRate, duration, cashiers, seed } = state;
    return { arrivalRate, serviceRate, duration, cashiers, seed };
  },
  apply: queueApply,
  measure: queueMeasure,
};

/** Explicit integration imports this value; importing it has no registry side effects. */
export const dynamicSystems: DomainContribution = {
  namespace: "dynamic-systems",
  version: 1,
  models: [compoundGrowth, ringTraffic, checkoutQueue],
};
