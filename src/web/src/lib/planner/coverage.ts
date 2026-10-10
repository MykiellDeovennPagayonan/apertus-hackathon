import { publicDefinition } from "../../simulations/components/catalog";
import type {
  AuthoredDocument,
  CompositeRecipe,
} from "../../simulations/runtime/authoring/types";
import type { ComponentCard } from "./bucket";
import type { CapabilityCard } from "./catalog";
import { type Coverage, parseCoverage, type TeachingIntent } from "./schema";

export function coverageFor(
  prompt: string,
  intent: TeachingIntent,
  card: CapabilityCard,
  proposed: Coverage,
): Coverage {
  const coverage = parseCoverage(proposed);
  if (!card.supports.length || !intent.goal.trim())
    throw new Error("No meaningful teaching coverage");
  const evidence = [
    ...card.supports,
    ...card.names,
    ...card.interactionNames,
    ...card.observationNames,
  ].map((value) => value.toLowerCase());
  for (const claim of coverage.covered)
    if (
      !evidence.some(
        (term) =>
          claim.toLowerCase().includes(term) ||
          term.includes(claim.toLowerCase()),
      )
    )
      throw new Error(
        `Coverage claim has no declared teaching evidence: ${claim}`,
      );
  const requested = (pattern: RegExp) =>
    [...prompt.matchAll(new RegExp(pattern.source, "gi"))].some(
      (match) =>
        !/\b(?:without|no|not|don't|do not)\b[^.!?;]{0,35}$/i.test(
          prompt.slice(0, match.index),
        ),
    );
  if (requested(/friction|momentum/i)) {
    coverage.covered = coverage.covered.filter(
      (item) => !/friction|momentum/i.test(item),
    );
    if (!coverage.omitted.some((item) => /friction|momentum/i.test(item)))
      coverage.omitted.push("Friction and momentum");
    coverage.level = "partial";
    if (
      !coverage.explanation.includes("Friction and momentum are not simulated.")
    )
      coverage.explanation =
        `${coverage.explanation} Friction and momentum are not simulated.`.trim();
  }
  // These unavailable quantities are declared in the selected definition, never relabeled outputs.
  if (card.recipeSlug === "bridge") {
    const unavailable = [
      [
        /deflection|millimet(?:re|er)|engineering stress|finite element/i,
        "Exact engineering deflection in millimetres",
        card.limitations[0],
      ],
      [
        /friction|momentum/i,
        "Friction and momentum",
        "Friction and momentum are not simulated.",
      ],
    ] as const;
    for (const [pattern, label, explanation] of unavailable)
      if (requested(pattern)) {
        if (!coverage.omitted.some((item) => pattern.test(item)))
          coverage.omitted.push(label);
        coverage.level = "partial";
        if (label === "Exact engineering deflection in millimetres")
          coverage.explanation = explanation;
        if (!coverage.explanation.includes(explanation))
          coverage.explanation =
            `${coverage.explanation} ${explanation}`.trim();
        coverage.covered = coverage.covered.filter(
          (item) => !pattern.test(item),
        );
      }
  }
  if (coverage.covered.length > 12) {
    coverage.covered = coverage.covered.slice(0, 12);
  }
  if (coverage.omitted.length > 12) {
    coverage.omitted = coverage.omitted.slice(0, 12);
  }
  return parseCoverage(coverage);
}
export function verifyCoverage(recipe: CompositeRecipe, card: CapabilityCard) {
  const modelIds = recipe.document.nodes
    .filter(
      (n) =>
        publicDefinition(n.definition).category === "models" &&
        publicDefinition(n.definition).teaching,
    )
    .map((n) => n.id);
  if (!modelIds.length)
    throw new Error("No supported teaching model in result");
  for (const id of modelIds) {
    if (
      !recipe.document.connections.some(
        (c) =>
          c.from.node === id && (c.kind === "value" || c.kind === "attachment"),
      )
    )
      throw new Error("Teaching model has no visible effect");
  }
  if (
    !recipe.document.nodes.some(
      (n) =>
        n.definition ===
        (card.recipeSlug === "bridge"
          ? "models/BridgeResponse"
          : `models/${card.recipeSlug}`),
    )
  )
    throw new Error("Selected capability was not constructed");
}

export function computeOpenCompositionCoverage(
  prompt: string,
  intent: TeachingIntent,
  document: AuthoredDocument,
  bucketCards: ComponentCard[],
): Coverage {
  const covered: string[] = [];
  const omitted: string[] = [];

  const requested = (pattern: RegExp) =>
    [...prompt.matchAll(new RegExp(pattern.source, "gi"))].some(
      (match) =>
        !/\b(?:without|no|not|don't|do not)\b[^.!?;]{0,35}$/i.test(
          prompt.slice(0, match.index),
        ),
    );

  const presentDefs = new Set(document.nodes.map((n) => n.definition));

  for (const card of bucketCards) {
    if (presentDefs.has(card.id)) {
      for (const sup of card.supports) {
        if (!covered.includes(sup)) covered.push(sup);
      }
    }
  }

  const hasRollingTrack = presentDefs.has(
    "prefabs/physical-systems/RollingTrack",
  );
  if (hasRollingTrack) {
    if (!covered.some((c) => /friction/i.test(c))) {
      covered.push("Rolling friction and stopping distance");
    }
  }

  const simulatesMass =
    presentDefs.has("prefabs/chemistry/Dilution") ||
    presentDefs.has("prefabs/natural-systems/DiffusionField") ||
    presentDefs.has("models/SpringMass") ||
    presentDefs.has("models/BridgeLoad");

  if (requested(/weight|mass/i) && !simulatesMass) {
    omitted.push("Weight / mass");
  }
  if (requested(/momentum/i)) {
    omitted.push("Momentum");
  }
  if (requested(/friction/i) && !hasRollingTrack) {
    omitted.push("Friction");
  }

  const finalCovered = covered.slice(0, 12);
  const finalOmitted = omitted.slice(0, 12);

  if (finalCovered.length === 0) {
    finalCovered.push(intent.goal || "Interactive simulation");
  }

  const level = finalOmitted.length > 0 ? "partial" : "full";
  const explanation =
    level === "partial"
      ? `${finalCovered.join(", ")} is simulated. ${finalOmitted.join(" and ")} are not modeled in this simulation.`
      : "";

  return {
    level,
    covered: finalCovered,
    omitted: finalOmitted,
    explanation,
  };
}
