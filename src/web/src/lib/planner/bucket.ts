import { publicDefinitions } from "../../simulations/components/catalog";
import {
  definitionDiscovery,
  searchRank,
} from "../../simulations/components/catalog/discovery";
import { listPremadeRecipes } from "../../simulations/runtime/recipes/registry";
import type { TeachingIntent } from "./schema";

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
      if (!supports.includes(p)) supports.push(p);
    }
  }
  for (const o of Object.keys(def.outputs)) {
    if (!supports.includes(o)) supports.push(o);
  }
  const descLower = (def.description || "").toLowerCase();
  if (descLower.includes("friction") || descLower.includes("resistance")) {
    if (!supports.includes("friction")) supports.push("friction");
    if (!supports.includes("rolling resistance"))
      supports.push("rolling resistance");
  }
  if (descLower.includes("pendulum")) {
    if (!supports.includes("pendulum")) supports.push("pendulum");
  }
  if (
    descLower.includes("circuit") ||
    descLower.includes("voltage") ||
    descLower.includes("current")
  ) {
    if (!supports.includes("circuit")) supports.push("circuit");
  }

  return {
    id: def.id,
    version: def.version,
    kind: "initial",
    title: def.title,
    summary: def.description || discovery?.summary || def.title,
    supports,
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
      .filter((d) => d.category === "models")
      .map((d) => d.id),
    "controls/Slider",
    "controls/NumberInput",
    "controls/Toggle",
    "controls/ActionButton",
    "displays/Readout",
    "displays/Inspector",
    "displays/Text",
  ];

  for (const id of candidateIds) {
    const card = buildInitialCard(id);
    if (!card) continue;
    const rank = searchRank(card.title, query);
    let score = rank === 0 ? 12 : rank === 1 ? 8 : rank === 2 ? 4 : 0;
    for (const s of card.supports) {
      if (contains(query, s)) score += 3;
    }
    if (contains(query, card.title)) score += 5;
    if (contains(query, id)) score += 6;
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
        if (contains(intentTerms, s) || contains(s, intentTerms)) return true;
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

  // Ensure standard displays and controls exist in the bucket
  const essentialScaffolding = [
    "displays/Readout",
    "displays/Inspector",
    "controls/Slider",
    "controls/NumberInput",
  ];
  for (const id of essentialScaffolding) {
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
