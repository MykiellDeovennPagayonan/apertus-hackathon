import { object, choice, validateValue } from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import { isPlaybackCommand } from "../../registry/contracts/interactionPolicy";
import type { CompositeRecipe } from "../authoring-engine/document";
import type { GenerationBudget } from "../budget";
import { controls, terms } from "../component-selection/assemblyCandidates";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { TeachingIntent } from "../intent-interpreter/contracts";

/** The application retains bindings; inference resolves one small decision at a time. */
export async function choosePresentation(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
  source: CompositeRecipe,
  requiredCapabilities: string[],
) {
  budget.trace?.("stage", { task: "choose_presentation" });
  const wires = controls(source);
  const nodes = [...source.document.nodes, ...source.document.resources];
  const commandCards = [...new Set(wires.map(wire => `${wire.to.node}.${wire.to.port}`))].map((endpoint, index) => {
    const wire = wires.find(wire => `${wire.to.node}.${wire.to.port}` === endpoint)!;
    const control = nodes.find(node => node.id === wire.from.node)!;
    const model = nodes.find(node => node.id === wire.to.node)!;
    const command = publicDefinition(model).commands[wire.to.port];
    return {
      id: `c${index + 1}`,
      endpoint,
      label: String(control.configuration.label ?? control.label),
      meaning: command.description.slice(0, 200),
      adjustable: command.arguments.type === "object" && Object.keys(command.arguments.properties).length > 0,
      playback: isPlaybackCommand(wire.to.port) && publicDefinition(model).lifecycle.clock,
    };
  });
  const observationCards = source.document.nodes.filter(node => publicDefinition(node).category === "displays").map((node, index) => ({
    id: `r${index + 1}`,
    node: node.id,
    label: String(node.configuration.label ?? node.label),
    outputs: source.document.connections.filter(wire => wire.kind === "value" && wire.to.node === node.id).map(wire => {
      const contract = publicDefinition(nodes.find(node => node.id === wire.from.node)!).outputs[wire.from.port];
      return { name: wire.from.port, meaning: contract.description?.slice(0, 140), unit: contract.unit };
    }),
  }));
  const scenes = source.document.nodes.filter(node => ["appearance", "canvases"].includes(publicDefinition(node).category)).map(node => ({
    label: publicDefinition(node).title,
    meaning: publicDefinition(node).description.slice(0, 160),
    communicates: publicDefinition(node).presentedOutputs ?? [],
  }));
  const selectedControls = new Set(commandCards.filter(card => card.playback).map(card => card.id));
  const adjustable = commandCards.filter(card => card.adjustable && !card.playback);
  const requestedInputs = intent.requestedInputs ?? intent.interactions.filter(interaction => /\b(?:adjust|change|modify|control|set|vary|move|drag|resize|manipulate|increase|decrease|choose|select)\b/i.test(interaction));
  const labelTerms = adjustable.map(card => terms(card.label));

  for (const interaction of requestedInputs) {
    const words = terms(interaction);
    const matching = adjustable.filter((_, index) => [...labelTerms[index]].some(word => words.has(word) && labelTerms.filter(label => label.has(word)).length === 1));
    if (matching.length) {
      for (const card of matching) selectedControls.add(card.id);
      budget.trace?.("presentation.binding", { interaction, controls: matching.map(card => card.endpoint), source: "registry label" });
      continue;
    }
    if (!adjustable.length)
      return { controls: [], observations: [], unsupported: `The available activity has no adjustable input for ${interaction}.` };
    const schema = object({ candidate: choice(...adjustable.map(card => card.id), "unavailable") });
    const answer = await requestStructured<{candidate: string}>([
      { role: "system", content: 'Resolve the requested interaction using one supported input. Return only {"candidate":"c1"} using a supplied ID, or {"candidate":"unavailable"}. Do not substitute playback or an unrelated quantity.' },
      { role: "user", content: JSON.stringify({ request: request.prompt, interaction, candidates: adjustable.map(({id, label, meaning}) => ({id, label, meaning})) }) },
    ], content => { const {value} = parseArgumentJson(content); validateValue(schema, value); return value as {candidate: string}; },
    'Return only {"candidate":"supplied-id"}. No schema or extra keys.', budget.signal, {
      budget, stage: "assembly_input", schema: toJsonSchema(schema), maxTokens: 64,
      onEvent: (event, data) => budget.trace?.(`assembly_input.${event}`, data),
    });
    if (answer.candidate === "unavailable")
      return { controls: [], observations: [], unsupported: `The available activity cannot support ${interaction}.` };
    selectedControls.add(answer.candidate);
    budget.trace?.("presentation.binding", { interaction, controls: [commandCards.find(card => card.id === answer.candidate)!.endpoint], source: "semantic selection" });
  }

  const selectNext = async (kind: "controls" | "observations", candidates: {id: string; label: string}[], retained: string[]) => {
    const schema = object({ candidate: choice("done", ...candidates.map(card => card.id)) });
    const answer = await requestStructured<{candidate: string}>([
      { role: "system", content: kind === "controls"
        ? 'The requested inputs and necessary playback are already retained. Decide whether the ORIGINAL request is complete. Choose done when it is complete. Choose another control only if the activity cannot work without it. Return {"candidate":"done"}. Do not expose unrelated variables or optional restart/reset/step actions. Return one supplied candidate ID, never an array.'
        : 'Decide whether the scene and retained components already explain the ORIGINAL requested outcome. Choose done when they do. Choose one observation only for missing necessary feedback, never duplicate values. Return {"candidate":"done"}. Do not invent measurements from a learning question or expose internal diagnostics. Return one supplied candidate ID, never an array.' },
      { role: "user", content: JSON.stringify({ request: request.prompt, scenes, controls: commandCards.filter(card => selectedControls.has(card.id)).map(card => card.label), retained, candidates: [{id: "done", label: kind === "controls" ? "The requested interactions are already supported; add no more controls" : "The scene and retained components already communicate the requested outcome; add no readout"}, ...candidates] }) },
    ], content => { const {value} = parseArgumentJson(content); validateValue(schema, value); return value as {candidate: string}; },
    'Return only {"candidate":"done"} or {"candidate":"one-supplied-id"}. Do not copy the candidate list.', budget.signal, {
      budget, stage: `assembly_${kind}`, schema: toJsonSchema(schema), maxTokens: 64,
      onEvent: (event, data) => budget.trace?.(`assembly_${kind}.${event}`, data),
    });
    return answer.candidate;
  };
  let remainingControls = commandCards.filter(card => !selectedControls.has(card.id));
  while (remainingControls.length) {
    const id = await selectNext("controls", remainingControls.map(({id, label, meaning}) => ({id, label, meaning})), commandCards.filter(card => selectedControls.has(card.id)).map(card => card.label));
    if (id === "done") break;
    selectedControls.add(id);
    remainingControls = remainingControls.filter(card => card.id !== id);
  }
  const selectedObservations = new Set<string>();
  let remainingObservations = observationCards;
  while (remainingObservations.length) {
    const id = await selectNext("observations", remainingObservations.map(({id, label, outputs}) => ({id, label, outputs})), observationCards.filter(card => selectedObservations.has(card.id)).map(card => card.label));
    if (id === "done") break;
    selectedObservations.add(id);
    remainingObservations = remainingObservations.filter(card => card.id !== id);
  }
  const result = {
    controls: commandCards.filter(card => selectedControls.has(card.id)).map(card => card.endpoint),
    observations: observationCards.filter(card => selectedObservations.has(card.id)).map(card => card.node),
  };
  for (const capability of requiredCapabilities) {
    const matching = wires.filter(wire => terms(wire.to.port).has(capability));
    if (matching.length && !matching.some(wire => result.controls.includes(`${wire.to.node}.${wire.to.port}`)))
      return { ...result, unsupported: `The selected interface is missing the requested ${capability} adjustment.` };
  }
  budget.trace?.("presentation.review", { controls: result.controls.length, observations: result.observations.length, exceedsGuidance: result.controls.length > 3 || result.observations.length > 1 });
  budget.trace?.("presentation.selection", result);
  return { ...result, unsupported: undefined };
}
