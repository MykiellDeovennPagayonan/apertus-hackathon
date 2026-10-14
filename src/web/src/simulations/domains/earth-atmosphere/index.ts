import {
  atmosphereState,
  energyFlux,
  faultState,
  initializeEnergy,
  integrateEnergy,
  lightningState,
  rainbowState,
  tsunamiState,
  weatherState,
} from "../../legacy/components/systems/earth-atmosphere/physics";
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
  validateValue,
} from "../../registry/contracts/parameterSchema";
export const earthKinds = [
  "earthquake",
  "tsunami",
  "atmosphere",
  "greenhouse",
  "lightning",
  "rainbow",
  "weather",
] as const;
export type EarthKind = (typeof earthKinds)[number];
export interface EarthState {
  kind: EarthKind;
  phase: number;
  progress: number;
  playing: boolean;
  target: number;
  config: Record<string, number | boolean>;
  energy: ReturnType<typeof initializeEnergy>;
}
export const command = (kind: EarthKind, op: string) =>
  `EA_${kind.toUpperCase()}_${op}`;
export const names: Record<EarthKind, string> = {
  earthquake: "How earthquakes form",
  tsunami: "How tsunamis form",
  atmosphere: "Atmosphere layers and ozone",
  greenhouse: "The greenhouse effect",
  lightning: "How lightning forms",
  rainbow: "How rainbows form",
  weather: "How weather forms",
};
export const questions: Record<EarthKind, string> = {
  earthquake: "Why can slow movement cause sudden shaking?",
  tsunami: "How does a seabed disturbance reach the coast?",
  atmosphere: "What changes as you go higher?",
  greenhouse: "How do greenhouse gases affect Earth's heat?",
  lightning: "What happens before lightning flashes?",
  rainbow: "How do raindrops turn sunlight into a rainbow?",
  weather: "How do heating and moist air make weather?",
};
export const tags: Record<EarthKind, string[]> = {
  earthquake: [
    "earthquake",
    "earthquakes",
    "earth quakes",
    "ground shake",
    "seismic",
    "fault",
    "rupture",
  ],
  tsunami: ["tsunami", "tsunamis", "seabed", "ocean waves", "coastal surge"],
  atmosphere: [
    "atmosphere",
    "atmospheric layers",
    "ozone",
    "ozone layer",
    "earth air layers",
    "troposphere",
    "stratosphere",
  ],
  greenhouse: [
    "greenhouse",
    "greenhouse effect",
    "green house effect",
    "greenhouse gases",
    "global warming",
    "infrared",
  ],
  lightning: [
    "lightning",
    "storm",
    "lighting made in a storm",
    "thunder",
    "charges",
    "electrification",
  ],
  rainbow: [
    "rainbow",
    "rainbows",
    "double rainbow",
    "refraction",
    "sunlight",
    "raindrops",
    "dispersion",
  ],
  weather: [
    "weather",
    "weather formed",
    "clouds and rain",
    "air drier",
    "front",
    "air masses",
    "sea breeze",
  ],
};
export const defaults: Record<EarthKind, Record<string, number | boolean>> = {
  earthquake: { fault: 0, locking: 3, speed: 1 },
  tsunami: { depth: 4000, displacement: 1, speed: 1 },
  atmosphere: { altitude: 0, ozone: 1, uv: false, speed: 1 },
  greenhouse: { absorption: 0.76, albedo: 0.3, solar: 1361, speed: 1 },
  lightning: { intracloud: false, distance: 1000, speed: 1 },
  rainbow: { elevation: 12, observer: 0, secondary: false, speed: 1 },
  weather: { moisture: 80, scenario: 0, speed: 1 },
};
const speed = num(0.2, 2);
export const schemas: Record<EarthKind, ParameterSchema> = {
  earthquake: object({ fault: choice(0, 1, 2), locking: num(1, 5), speed }),
  tsunami: object({
    depth: num(500, 6000, "m"),
    displacement: num(-2, 2, "m"),
    speed,
  }),
  atmosphere: object({
    altitude: num(0, 800, "km"),
    ozone: num(0.1, 1),
    uv: boolean,
    speed,
  }),
  greenhouse: object({
    absorption: num(0, 0.95),
    albedo: num(0, 0.8),
    solar: num(1000, 1600, "W/m²"),
    speed,
  }),
  lightning: object({
    intracloud: boolean,
    distance: num(100, 5000, "m"),
    speed,
  }),
  rainbow: object({
    elevation: num(0, 65, "°"),
    observer: num(-3, 3, "m"),
    secondary: boolean,
    speed,
  }),
  weather: object({
    moisture: num(20, 100, "%"),
    scenario: choice(0, 1, 2),
    speed,
  }),
};
export const assumptions: Record<EarthKind, string[]> = {
  earthquake: [
    "Illustrative spring-slider loading with prescribed rupture, waves and compressed timescales; not earthquake prediction. Fault displacement is exaggerated.",
  ],
  tsunami: [
    "Long-wave offshore propagation uses sqrt(g·depth); shelf amplitude uses Green's-law approximation. Coastal arrival and map are prescribed illustrations, not inundation or evacuation forecasts. Vertical scale exaggerated.",
  ],
  atmosphere: [
    "Representative variable layer boundaries and compressed altitude display. Ozone transmission is qualitative, not measured UV exposure; ionosphere overlaps layers.",
  ],
  greenhouse: [
    "Two gray-body reservoirs with heat capacity, fixed solar input and compressed time. Absorption is a teaching parameter, not CO2 ppm; no full spectral or circulation model.",
  ],
  lightning: [
    "Representative mixed-phase charging and prescribed channel stages. Charge-transfer details and initiation are simplified; no predicted strike locations. Negative ground flash is one example.",
  ],
  rainbow: [
    "Geometric optics with spherical droplets and sampled wavelengths; partial internal reflection. Observer and explanatory camera are independent. No wave-optical supernumerary bows.",
  ],
  weather: [
    "Parcel lapse-rate and saturation model in a prescribed flow. Simplified condensate growth/precipitation; not a weather forecast. Water vapor, cloud water and rain are distinct.",
  ],
};
export const extraActions = {
  earthquake: [],
  tsunami: ["NEXT_WAVE"],
  atmosphere: ["SHOW_OZONE"],
  greenhouse: [],
  lightning: ["SHOW_THUNDER"],
  rainbow: [],
  weather: [],
} as const;
const settingHelp: Record<string, string> = {
  fault:
    "Fault style: 0 sideways strike-slip, 1 normal extension, 2 reverse compression.",
  locking:
    "Fault locking strength in this illustrative model; higher values store more elastic energy.",
  depth:
    "Deep-ocean depth in metres; greater depth increases offshore wave speed.",
  displacement:
    "Signed vertical seabed displacement in metres; zero means no source wave.",
  altitude:
    "Probe altitude in kilometres; the ozone-rich stratosphere is around 15–35 km.",
  ozone:
    "Relative ozone amount: 1 is normal, lower values mean less ozone and more transmitted UV-B.",
  uv: "Show the ultraviolet absorption investigation when true; atmospheric layers when false.",
  absorption:
    "Fraction of surface infrared absorbed by the atmosphere. Increase for more greenhouse gas; preserve sunlight.",
  solar:
    "Incoming solar flux in W/m². Preserve it unless explicitly asked to change sunlight.",
  albedo:
    "Fraction of incoming sunlight reflected; independent of infrared absorption.",
  intracloud:
    "True: discharge inside a cloud; false: negative cloud-to-ground example.",
  distance:
    "Observer distance in metres; greater distance delays thunder without delaying the flash noticeably.",
  elevation:
    "Sun elevation in degrees; higher Sun lowers the visible rainbow arc.",
  observer:
    "Observer's physical sideways position in metres; distinct from explanatory camera.",
  secondary:
    "Change rainbow type: true shows a double rainbow, including the secondary bow from two internal reflections with reversed colors; false shows the primary bow.",
  moisture:
    "Starting relative humidity in percent; lower values mean drier air.",
  scenario:
    "Lifting setting: 0 daytime coast/sea breeze, 1 mountain, 2 cold front.",
  speed:
    "Teaching animation rate, 1 normal, below 1 slower. Does not change physical wave speed.",
};
export const lastPhase: Record<EarthKind, number> = {
  earthquake: 5,
  tsunami: 5,
  atmosphere: 0,
  greenhouse: 6,
  lightning: 6,
  rainbow: 5,
  weather: 6,
};
export function initialize(
  kind: EarthKind,
  config: Record<string, number | boolean>,
): EarthState {
  validateValue(schemas[kind], config);
  return {
    kind,
    phase: 0,
    progress: 0,
    playing: false,
    target: 0,
    config: { ...config },
    energy: initializeEnergy(0.76, 0.3, 1361),
  };
}
export function metrics(s: EarthState) {
  const c = s.config;
  switch (s.kind) {
    case "earthquake":
      return faultState(
        s.phase,
        s.progress,
        Number(c.locking),
        Number(c.fault),
      );
    case "tsunami":
      return tsunamiState(
        Number(c.depth),
        Number(c.displacement),
        s.phase,
        s.progress,
      );
    case "atmosphere":
      return atmosphereState(Number(c.altitude), Number(c.ozone));
    case "greenhouse":
      return {
        ...s.energy,
        ...energyFlux(
          s.energy,
          Number(c.absorption),
          Number(c.albedo),
          Number(c.solar),
        ),
      };
    case "lightning":
      return lightningState(
        s.phase,
        s.progress,
        Number(c.distance),
        Boolean(c.intracloud),
      );
    case "rainbow":
      return rainbowState(
        Number(c.elevation),
        Number(c.observer),
        Boolean(c.secondary),
      );
    case "weather":
      return weatherState(s.phase, Number(c.moisture), Number(c.scenario));
  }
}
const captions: Record<Exclude<EarthKind, "atmosphere">, string[]> = {
  earthquake: [
    "Slow plate movement loads a fault that is held in place by friction.",
    "The fault stays locked while the surrounding rock bends.",
    "A patch slips suddenly, releasing stored elastic energy.",
    "Rupture spreads across the fault; it does not stay at one point.",
    "Seismic waves travel outward and shake the surface.",
    "The blocks remain offset. An event does not remove every nearby stress.",
  ],
  tsunami: [
    "A tsunami begins with a rapid displacement of water, often from seabed movement.",
    "Moving the seabed displaces the water above it.",
    "Long waves travel through the water column, faster in deeper water.",
    "Over the shelf, waves slow and their spacing shortens; height can increase.",
    "Coastal arrival can be a fast-rising surge. This shoreline view is schematic.",
    "Later waves follow. The first wave is not necessarily the largest.",
  ],
  greenhouse: [
    "Sunlight supplies energy. Follow what happens as that energy leaves Earth.",
    "Some sunlight is reflected; the rest warms the surface in this simplified model.",
    "The warmed surface emits thermal infrared radiation.",
    "Greenhouse gases absorb some infrared and emit upward and downward.",
    "More absorption reduces escaping energy at the previous temperature; the surface warms.",
    "Temperature changes over time, rather than jumping to a new value.",
    "Temperature adjusts toward a new energy balance. Ozone depletion is a different process.",
  ],
  lightning: [
    "Inside a storm, updrafts move ice crystals among supercooled droplets and graupel.",
    "Collisions transfer charge between particles; they do not create net charge.",
    "Small positive ice particles rise while heavier negative graupel stays lower.",
    "A faint branched leader develops through the air.",
    "The leader connects with a streamer, establishing a conducting channel.",
    "The bright return-stroke front travels upward along that channel in a negative ground flash.",
    "The flash reaches you before thunder. Sound travels much more slowly than light.",
  ],
  rainbow: [
    "The Sun is behind the observer, with rain ahead. The rainbow depends on this geometry.",
    "Sunlight bends as it enters a droplet; different wavelengths bend differently.",
    "Some light reflects inside the droplet. This is partial internal reflection.",
    "Light bends again as it exits; only some paths reach the observer's eye.",
    "Many droplets send different colors toward the eye, making an observer-dependent arc.",
    "Move the observer: different droplets contribute. A rainbow has no fixed landscape endpoint.",
  ],
  weather: [
    "Unequal heating helps move air. Here the coastal circulation is prescribed for teaching.",
    "Land warms faster than the sea during the day, helping drive a sea breeze.",
    "A rising parcel expands and cools.",
    "If it cools to saturation, water vapor can condense into cloud droplets.",
    "Cloud water is different from invisible vapor; drier air may not form a cloud here.",
    "Cloud particles need to grow before they can fall as precipitation.",
    "Some condensed water falls as rain in this simplified growth stage; clouds do not always rain.",
  ],
};
export function caption(s: EarthState): string {
  if (s.kind === "tsunami" && Number(s.config.displacement) === 0)
    return "Without seabed displacement, no tsunami wave forms in this model.";
  if (s.kind === "atmosphere") {
    const m = atmosphereState(
      Number(s.config.altitude),
      Number(s.config.ozone),
    );
    if (s.config.uv)
      return Number(s.config.ozone) < 1
        ? "Less stratospheric ozone lets more UV-B through; it does not open a hole in the air."
        : "Stratospheric ozone absorbs much UV-B. Oxygen and ozone strongly absorb UV-C.";
    return [
      "Almost all ordinary weather is in the troposphere.",
      "The stratosphere contains the ozone-rich region that absorbs harmful ultraviolet.",
      "Many meteors ablate in the mesosphere.",
      "Auroras occur in this very thin upper atmosphere. Particle temperature is not dense-air warmth.",
      "The exosphere thins gradually into space; these boundaries are approximate.",
    ][m.layer];
  }
  if (
    s.kind === "rainbow" &&
    s.phase >= 4 &&
    !rainbowState(
      Number(s.config.elevation),
      Number(s.config.observer),
      Boolean(s.config.secondary),
    ).visible
  )
    return "With the Sun this high, this bow lies below the horizon for an observer on level ground.";
  if (s.kind === "weather" && Number(s.config.scenario) !== 0 && s.phase <= 2)
    return Number(s.config.scenario) === 1
      ? "The mountain forces moist air upward. The rising parcel expands and cools."
      : "Denser cool air lifts the warm air at a front. The rising parcel expands and cools.";
  if (
    s.kind === "weather" &&
    s.phase >= 3 &&
    !weatherState(s.phase, Number(s.config.moisture), Number(s.config.scenario))
      .saturated
  )
    return "This parcel is still below saturation. Rising air does not automatically form a cloud.";
  if (s.kind === "rainbow" && s.config.secondary && s.phase >= 2)
    return "Two internal reflections make the secondary bow, with reversed colors outside the primary bow.";
  if (
    s.kind === "lightning" &&
    s.config.intracloud &&
    s.phase >= 3 &&
    s.phase < 6
  )
    return "This discharge connects regions inside the cloud, without a ground connection.";
  return captions[s.kind][s.phase];
}
export function apply(s: EarthState, op: string, value?: unknown): EarthState {
  if (op === "SHOW_OZONE" && s.kind === "atmosphere")
    return {
      ...s,
      config: { ...s.config, altitude: 25, uv: false },
      playing: false,
    };
  if (op === "NEXT_WAVE" && s.kind === "tsunami")
    return { ...s, phase: 5, target: 5, progress: 0, playing: false };
  if (op === "SHOW_THUNDER" && s.kind === "lightning")
    return { ...s, phase: 6, target: 6, progress: 0, playing: false };
  if (op === "RESTART")
    return {
      ...initialize(s.kind, s.config),
      energy: initializeEnergy(
        Number(s.config.absorption ?? 0.76),
        Number(s.config.albedo ?? 0.3),
        Number(s.config.solar ?? 1361),
      ),
    };
  if (op === "PAUSE") return { ...s, playing: false };
  if (op.startsWith("SET_")) {
    const key = op.slice(4),
      config = { ...s.config, [key]: value };
    validateValue(schemas[s.kind], config);
    if (s.kind === "atmosphere" && key === "ozone") config.uv = true;
    const next = {
      ...s,
      config: config as EarthState["config"],
      playing: key === "speed" ? s.playing : false,
    };
    // Energy-condition edits preserve reservoir temperature to expose the imbalance.
    if (s.kind === "greenhouse" && key !== "speed")
      return {
        ...next,
        phase: Math.min(s.phase, 3),
        target: Math.min(s.phase, 3),
        progress: 0,
      };
    if (
      s.kind === "greenhouse" ||
      s.kind === "atmosphere" ||
      s.kind === "rainbow" ||
      key === "speed"
    )
      return next;
    return { ...initialize(s.kind, next.config), phase: s.phase };
  }
  if (op === "ADVANCE" || op === "RUN") {
    if (s.playing) return s;
    const target = Math.min(lastPhase[s.kind], s.phase + 1);
    if (op === "RUN") return { ...s, target, playing: target !== s.phase };
    return advance({ ...s, target, playing: true }, 100);
  }
  throw new Error("Unknown Earth lesson action");
}
export function advance(s: EarthState, delta: number): EarthState {
  if (!s.playing || !Number.isFinite(delta) || delta <= 0) return s;
  const accumulated =
    s.progress + (Math.min(delta, 100) * Number(s.config.speed)) / 1.6;
  const progress = accumulated >= 1 - 1e-10 ? 1 : accumulated;
  let energy = s.energy;
  if (s.kind === "greenhouse" && s.target >= 4)
    energy = integrateEnergy(
      energy,
      Number(s.config.absorption),
      Number(s.config.albedo),
      Number(s.config.solar),
      (progress - s.progress) * 2000000,
    );
  return {
    ...s,
    progress: progress === 1 ? 0 : progress,
    phase: progress === 1 ? s.target : s.phase,
    playing: progress < 1,
    energy,
  };
}
export const earthModels: DomainModel[] = earthKinds.map((kind) => ({
  ref: `prefabs/earth-atmosphere/${kind}`,
  version: 1,
  name: names[kind],
  description: `${questions[kind]} Interactive staged explanation of ${tags[kind].slice(0, 3).join(", ")}.`,
  tags: tags[kind],
  assumptions: assumptions[kind],
  presentation: `earth-atmosphere-${kind}`,
  parameters: schemas[kind],
  defaults: defaults[kind],
  maximumInstances: 2,
  requiredObservations: [],
  outputs: {
    scene: {
      unit: `earth-atmosphere/${kind}`,
      description: "Accepted teaching state",
    },
    caption: { unit: "1", description: "Short timely explanation" },
  },
  actions: Object.fromEntries([
    ...["RUN", "ADVANCE", "PAUSE", "RESTART", ...extraActions[kind]].map(
      (op) => [
        command(kind, op),
        {
          arguments: object({}),
          description:
            op === "ADVANCE"
              ? "Reveal the next teaching stage immediately without animation"
              : op === "NEXT_WAVE"
                ? "Reveal a later tsunami wave arrival"
                : op === "SHOW_OZONE"
                  ? "Locate the ozone layer: highlight its ozone-rich stratospheric region around 25 km, preserving ozone amount"
                  : op === "SHOW_THUNDER"
                    ? "Explain thunder delay by revealing the light-and-sound stage"
                    : `${op} this lesson stage`,
          timing: "live",
          target: "instance",
        },
      ],
    ),
    ...Object.entries(
      (schemas[kind] as Extract<ParameterSchema, { type: "object" }>)
        .properties,
    ).map(([key, schema]) => [
      command(kind, `SET_${key}`),
      {
        arguments: object({ value: schema }),
        description: settingHelp[key],
        timing: "live",
        target: "instance",
      },
    ]),
  ]) as DomainModel["actions"],
  dependencies: {
    resources: [],
    traits: [],
    behaviors: [],
    systems: [],
    visuals: [],
    views: [],
    controls: [],
    prefabs: [],
    compositions: [],
  },
  initialize: (c) => {
    const s = initialize(kind, {
      ...defaults[kind],
      ...c,
    } as EarthState["config"]);
    s.energy = initializeEnergy(
      Number(s.config.absorption ?? 0.76),
      Number(s.config.albedo ?? 0.3),
      Number(s.config.solar ?? 1361),
    );
    return s as unknown as Record<string, unknown>;
  },
  configuration: (s) => ({ ...(s as unknown as EarthState).config }),
  reconfigure: (s, c) => {
    let n = s as unknown as EarthState;
    validateValue(schemas[kind], c);
    for (const [key, value] of Object.entries(c))
      if (n.config[key] !== value) n = apply(n, `SET_${key}`, value);
    return n as unknown as Record<string, unknown>;
  },
  apply: (s, a, v) =>
    apply(
      s as unknown as EarthState,
      a.replace(`EA_${kind.toUpperCase()}_`, ""),
      v,
    ) as unknown as Record<string, unknown>,
  measure: (s) => ({
    scene: {
      ...(s as unknown as EarthState),
      metrics: metrics(s as unknown as EarthState),
    },
    caption: caption(s as unknown as EarthState),
  }),
  step: (s, d) =>
    advance(s as unknown as EarthState, d) as unknown as Record<
      string,
      unknown
    >,
}));
export const earthAtmosphere: DomainContribution = {
  namespace: "earth-atmosphere",
  version: 1,
  models: earthModels,
};
