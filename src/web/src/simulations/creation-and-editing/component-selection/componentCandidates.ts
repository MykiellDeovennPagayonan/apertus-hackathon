import { publicDefinitions } from "../../registry/index";
import {
  catalogComponentIds,
  catalogRecipeAllowed,
} from "../../registry/catalogScope";
import {
  discoverableDefinition,
  definitionDiscovery,
  searchRank,
} from "../../registry/discovery";
import { compositionRequirements } from "../../legacy/components/catalog/explorationTeaching";
import { listPremadeRecipes } from "../../registry/recipes/premade";
import type { TeachingIntent } from "../intent-interpreter/contracts";

export type PortSummary = {
  name: string;
  kind: string;
  unit: string;
};

export type ComponentBucketCard = {
  id: string;
  version: number;
  kind: "initial" | "composite";
  recipeSlug?: string;
  title: string;
  summary: string;
  supports: string[];
  limitations: string[];
  inputs: PortSummary[];
  outputs: PortSummary[];
  commands: string[];
};

export type ComponentCard = ComponentBucketCard;

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const contains = (text: string, phrase: string) =>
  ` ${words(text)} `.includes(` ${words(phrase)} `);

export function buildInitialCard(id: string): ComponentBucketCard | null {
  const def = publicDefinitions.get(id);
  if (!def) return null;
  const discovery = def.discovery ?? definitionDiscovery(def);
  const inputs: PortSummary[] = Object.entries(def.inputs).map(([name, p]) => ({
    name,
    kind: p.kind,
    unit: p.unit || "",
  }));
  const outputs: PortSummary[] = Object.entries(def.outputs).map(
    ([name, p]) => ({
      name,
      kind: p.kind,
      unit: p.unit || "",
    }),
  );
  const commands = Object.keys(def.commands);
  const supports = [...def.tags];
  if (def.configuration.type === "object" && def.configuration.properties) {
    for (const p of Object.keys(def.configuration.properties)) {
      if (p.length > 2 && !supports.includes(p)) supports.push(p);
    }
  }
  for (const o of Object.keys(def.outputs)) {
    if (o.length > 2 && !supports.includes(o)) supports.push(o);
  }

  const descLower = (def.description || "").toLowerCase();
  const idLower = def.id.toLowerCase();

  // Domain-specific keyword associations
  if (descLower.includes("friction") || descLower.includes("resistance")) {
    supports.push("friction", "rolling resistance", "stopping distance");
  }
  if (descLower.includes("pendulum")) {
    supports.push(
      "pendulum",
      "harmonic oscillator",
      "oscillator",
      "oscillation",
      "period",
    );
  }
  if (
    descLower.includes("circuit") ||
    descLower.includes("voltage") ||
    descLower.includes("current")
  ) {
    supports.push("circuit", "voltage", "current", "resistance", "bulbs");
  }
  if (idLower.includes("dilution") || descLower.includes("diluting")) {
    supports.push("dilution", "saline", "salt", "concentration", "salt water");
  }
  if (idLower.includes("reactionrate") || descLower.includes("reaction rate")) {
    supports.push(
      "reaction rate",
      "half life",
      "half-life",
      "temperature",
      "chemical kinetics",
    );
  }
  if (
    idLower.includes("conservation") ||
    descLower.includes("balancing chemical")
  ) {
    supports.push(
      "chemical equation",
      "balancing",
      "conservation",
      "molecules",
    );
  }
  if (idLower.includes("predatorprey") || descLower.includes("lotka")) {
    supports.push(
      "predator prey",
      "lotka volterra",
      "rabbits",
      "foxes",
      "population",
    );
  }
  if (idLower.includes("plantgrowth") || descLower.includes("plant limiting")) {
    supports.push("plant growth", "biomass", "limiting resource", "nutrients");
  }
  if (
    idLower.includes("diffusion") ||
    descLower.includes("diffusion in water")
  ) {
    supports.push("diffusion", "dye", "concentration");
  }
  if (
    idLower.includes("compoundgrowth") ||
    descLower.includes("compound and simple")
  ) {
    supports.push(
      "compound interest",
      "simple interest",
      "interest rate",
      "principal",
      "annual rate",
    );
  }
  if (idLower.includes("ringtraffic") || descLower.includes("traffic")) {
    supports.push(
      "traffic",
      "traffic jam",
      "congestion",
      "headway",
      "vehicles",
    );
  }
  if (
    idLower.includes("checkoutqueue") ||
    descLower.includes("checkout cashiers")
  ) {
    supports.push(
      "queue",
      "checkout queue",
      "cashiers",
      "cashier",
      "waiting time",
      "arrival rate",
      "service rate",
    );
  }
  if (idLower.includes("equation") || descLower.includes("linear equation")) {
    supports.push("solve equation", "balance scale", "linear equation");
  }
  if (idLower.includes("circle") || descLower.includes("radius")) {
    supports.push("circle", "circumference", "diameter", "pi");
  }
  if (idLower.includes("line") || descLower.includes("slope")) {
    supports.push("line slope", "linear function", "slope", "intercept");
  }
  if (
    idLower.includes("titration") ||
    descLower.includes("titration") ||
    descLower.includes("neutralization")
  ) {
    supports.push(
      "titration",
      "acid base",
      "neutralization",
      "ph",
      "equivalence point",
      "buret",
      "phenolphthalein",
    );
  }
  if (
    idLower.includes("gasequilibrium") ||
    descLower.includes("gas equilibrium") ||
    descLower.includes("le chatelier")
  ) {
    supports.push(
      "gas equilibrium",
      "le chatelier",
      "equilibrium constant",
      "n2o4",
      "no2",
      "chemical equilibrium",
    );
  }
  if (
    idLower.includes("beerlambert") ||
    descLower.includes("beer lambert") ||
    descLower.includes("spectrophotometry") ||
    descLower.includes("absorbance")
  ) {
    supports.push(
      "beer lambert",
      "beer lambert law",
      "beer's law",
      "spectrophotometry",
      "absorbance",
      "transmittance",
      "optical path length",
      "cuvette",
      "molar absorptivity",
      "light attenuation",
    );
  }
  if (
    idLower.includes("galvaniccell") ||
    descLower.includes("galvanic cell") ||
    descLower.includes("nernst") ||
    descLower.includes("voltaic")
  ) {
    supports.push(
      "galvanic cell",
      "voltaic cell",
      "daniell cell",
      "nernst equation",
      "electrochemistry",
      "cell potential",
      "cell voltage",
      "zinc and copper",
      "salt bridge",
      "redox",
      "anode and cathode",
    );
  }
  if (
    idLower.includes("marketequilibrium") ||
    descLower.includes("market equilibrium") ||
    descLower.includes("supply and demand")
  ) {
    supports.push(
      "market equilibrium",
      "supply and demand",
      "equilibrium price",
      "consumer surplus",
      "producer surplus",
      "price control",
      "price ceiling",
      "deadweight loss",
    );
  }
  if (
    idLower.includes("priceelasticity") ||
    descLower.includes("price elasticity") ||
    descLower.includes("elasticity of demand")
  ) {
    supports.push(
      "price elasticity",
      "elasticity",
      "total revenue",
      "elastic",
      "inelastic",
      "choke price",
    );
  }
  if (
    idLower.includes("costandprofit") ||
    descLower.includes("cost and profit") ||
    descLower.includes("profit maximization")
  ) {
    supports.push(
      "production costs",
      "cost and profit",
      "marginal cost",
      "average total cost",
      "profit maximization",
      "fixed cost",
      "break even",
    );
  }
  if (
    idLower.includes("tradeandtariffs") ||
    descLower.includes("tariffs and import") ||
    descLower.includes("trade tariffs") ||
    descLower.includes("import tariff")
  ) {
    supports.push(
      "trade tariffs",
      "tariffs and imports",
      "tariff",
      "import quota",
      "world price",
      "tariff revenue",
      "deadweight loss with imports",
      "deadweight loss",
    );
  }
  if (
    idLower.includes("monopolypricing") ||
    descLower.includes("monopoly pricing") ||
    descLower.includes("monopoly power") ||
    descLower.includes("market power")
  ) {
    supports.push(
      "monopoly pricing",
      "monopoly power",
      "market power",
      "marginal revenue",
      "deadweight loss with market power",
      "mark-up",
      "lerner index",
      "deadweight loss",
    );
  }

  return {
    id: def.id,
    version: def.version,
    kind: "initial",
    title: def.title,
    summary: def.description || discovery?.summary || def.title,
    supports: [...new Set(supports)],
    limitations: [...(def.assumptions || [])],
    inputs,
    outputs,
    commands,
  };
}

export function buildCompositeCard(slug: string): ComponentBucketCard | null {
  const all = listPremadeRecipes();
  const entry = all.find((r) => r.slug === slug);
  if (!entry) return null;
  const { recipe } = entry;
  const model = recipe.document.nodes
    .map((n) => publicDefinitions.get(n.definition))
    .find((d) => d?.teaching);

  return {
    id: recipe.id,
    version: recipe.version,
    kind: "composite",
    recipeSlug: slug,
    title: recipe.title,
    summary: recipe.description,
    supports: model?.teaching?.concepts
      ? [...model.teaching.concepts]
      : [...recipe.tags],
    limitations: model?.teaching?.limitations
      ? [...model.teaching.limitations, ...recipe.assumptions]
      : [...recipe.assumptions],
    inputs: [],
    outputs: recipe.parameters.map((p) => ({
      name: p.name,
      kind: "value",
      unit:
        "unit" in p.schema && typeof p.schema.unit === "string"
          ? p.schema.unit
          : "",
    })),
    commands: recipe.parameters.map((p) => p.name),
  };
}

/** Retrieve ≤ 12 component cards (split between initial and composite) relevant to the prompt and intent. */
export function retrieveComponentBucket(
  prompt: string,
  intent?: TeachingIntent,
  maxCards = 12,
): ComponentBucketCard[] {
  const query = [
    prompt,
    intent?.goal ?? "",
    ...(intent?.concepts ?? []),
    ...(intent?.interactions ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const cards: { card: ComponentBucketCard; score: number }[] = [];

  // 1. Score composite recipes
  for (const { slug, recipe } of listPremadeRecipes()) {
    if (!catalogRecipeAllowed(recipe)) continue;
    const card = buildCompositeCard(slug);
    if (!card) continue;
    const rank = searchRank(recipe.title, query);
    let score = rank === 0 ? 12 : rank === 1 ? 8 : rank === 2 ? 4 : 0;
    for (const t of recipe.tags) {
      if (contains(query, t)) score += 4;
    }
    for (const s of card.supports) {
      if (contains(query, s)) score += 5;
    }
    if (contains(query, slug)) score += 8;
    if (score > 0) cards.push({ card, score });
  }

  // 2. Score initial components (models, prefabs, controls, displays)
  const candidateIds = [
    ...[...publicDefinitions.values()]
      .filter(discoverableDefinition)
      .filter((d) => d.category === "models")
      .map((d) => d.id),
    "controls/Slider",
    "controls/NumberInput",
    "controls/Toggle",
    "controls/Button",
    "controls/Select",
    "displays/Readout",
    "displays/Inspector",
    "displays/Text",
  ];

  for (const id of candidateIds) {
    if (!catalogComponentIds.has(id)) continue;
    const card = buildInitialCard(id);
    if (!card) continue;
    const rank = searchRank(card.title, query);
    let score = rank === 0 ? 12 : rank === 1 ? 8 : rank === 2 ? 4 : 0;
    for (const s of card.supports) {
      if (s.length > 1 && contains(query, s)) score += 3;
    }
    if (contains(query, card.title)) score += 5;
    if (contains(query, id)) score += 6;
    for (const word of new Set(words(card.title).split(" "))) {
      if (word.length > 3 && contains(query, word)) score += 2;
    }
    // Baseline scores for essential UI scaffolding
    if (id === "displays/Readout") score += 2;
    if (id === "controls/Slider") score += 2;
    cards.push({ card, score });
  }

  // Sort descending by score
  cards.sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id));

  const intentTerms = intent
    ? [intent.goal, ...(intent.concepts || [])].join(" ").toLowerCase().trim()
    : "";

  if (intentTerms) {
    const hasIntentModelOverlap = (card: ComponentBucketCard) => {
      if (contains(intentTerms, card.title)) return true;
      if (contains(intentTerms, card.id)) return true;
      for (const s of card.supports) {
        if (
          s.length > 2 &&
          (contains(intentTerms, s) || contains(s, intentTerms))
        )
          return true;
      }
      return false;
    };

    const anyModelMatches = cards.some(
      ({ card, score }) =>
        score > 2 &&
        (card.kind === "composite" ||
          publicDefinitions.get(card.id)?.category === "models") &&
        hasIntentModelOverlap(card),
    );

    if (!anyModelMatches) {
      return [];
    }
  }

  // Diversity selection: top models/composites + guaranteed displays and controls
  const selected: ComponentBucketCard[] = [];
  const selectedIds = new Set<string>();

  function addCard(c: ComponentBucketCard) {
    if (selected.length < maxCards && !selectedIds.has(c.id)) {
      selected.push(c);
      selectedIds.add(c.id);
    }
  }

  let hasModel = false;
  let compositeCount = 0;
  const maxComposites = Math.floor(maxCards / 3);

  // Pick highest scoring cards, balancing initial and composite
  for (const { card, score } of cards) {
    if (score > 2) {
      if (card.kind === "composite") {
        if (compositeCount < maxComposites) {
          addCard(card);
          compositeCount++;
          hasModel = true;
        }
      } else {
        addCard(card);
        if (publicDefinitions.get(card.id)?.category === "models") {
          hasModel = true;
        }
      }
    }
  }

  if (!hasModel) {
    return [];
  }

  // Reserve bounded room for the selected models' actual dependencies and views.
  const directIds = new Set(
    cards
      .filter(
        ({ card }) =>
          card.kind === "initial" &&
          publicDefinitions.get(card.id)?.category === "models" &&
          (contains(prompt, card.title) ||
            card.supports.some(
              (term) => term.length > 3 && contains(prompt, term),
            ) ||
            words(card.title)
              .split(" ")
              .some((term) => term.length > 4 && contains(prompt, term))),
      )
      .map(({ card }) => card.id),
  );
  const roots = selected
    .filter(
      (c) =>
        c.kind === "initial" &&
        publicDefinitions.get(c.id)?.category === "models",
    )
    .filter((c) => !directIds.size || directIds.has(c.id))
    .slice(0, 3);
  if (roots.length) {
    selected.splice(0);
    selectedIds.clear();
    const visit = (id: string) => {
      if (!catalogComponentIds.has(id)) return;
      if (selectedIds.has(id)) return;
      const card = buildInitialCard(id);
      if (!card) return;
      addCard(card);
      const requirements = compositionRequirements[id];
      for (const dependency of requirements?.dependencies ?? [])
        visit(dependency);
      if (requirements?.appearance) visit(requirements.appearance);
      else
        for (const def of [...publicDefinitions.values()].filter(
          discoverableDefinition,
        ))
          if (def.category === "appearance" && def.inputs.model?.unit === id)
            visit(def.id);
    };
    for (const root of roots) visit(root.id);
  }

  // Ensure standard displays and controls exist in the bucket
  const essentialScaffolding = [
    "displays/Readout",
    "displays/Inspector",
    "controls/Slider",
    "controls/NumberInput",
  ];
  for (const id of essentialScaffolding) {
    if (!catalogComponentIds.has(id)) continue;
    const card = buildInitialCard(id);
    if (card) addCard(card);
  }

  // Enforce ≤ maxCards limit
  const finalCards = selected.slice(0, maxCards);

  // Serialized size limit check (keep ≤ 6000 chars)
  let serialized = JSON.stringify(finalCards);
  while (serialized.length > 6000 && finalCards.length > 4) {
    finalCards.pop();
    serialized = JSON.stringify(finalCards);
  }

  return finalCards;
}
