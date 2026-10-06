import { publicDefinition } from "../../simulations/components/catalog";
import type { CompositeRecipe } from "../../simulations/runtime/authoring/types";
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
