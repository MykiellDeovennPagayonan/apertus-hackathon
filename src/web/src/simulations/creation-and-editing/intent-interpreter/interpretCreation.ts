import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { requestStage } from "../input/inference/stage";
import { toJsonSchema } from "../input/inference/structuredSchema";
import {
  intentResponseSchema,
  intentSources,
  parseIntentResponse,
} from "./contracts";
export async function interpretCreation(
  request: GenerationRequest,
  budget: GenerationBudget,
) {
  const intent = await requestStage(
    "teaching_intent",
    request,
    budget,
    toJsonSchema(intentResponseSchema(request.prompt)),
    {
      policy:
        "Describe the goal, concepts, actions and observations concisely. Use 1–3 short entries per concepts/interactions/observations list; do not invent extra interactions or feedback. question is ONE short learning question, in familiar language, about the visible relationship the user wants to explore. Mention all explicitly requested adjustments in that question. Never describe an adjustable quantity as constant or fixed unless the user requested that constraint. Never begin it with Design, Create, Build or Implement. explicitConstraints is ALWAYS an array of {meaning, sourceId} objects. Select sourceId from constraintSources for each explicit quantity, unit, negation or starting constraint. The application attaches the exact original text; do not return sourceText. Multiple constraints may refer to the same source. Do not claim supported capabilities. suggestedStructure is 'comparison' when the learner requests multiple independent model instances or comparing conditions. Otherwise use 'single'. instanceCount is the requested number of independent instances (1–3): default 1 for a single experiment, 2 for a comparison without an explicit count. Counts of particles, measurements or settings are not model instances. comparisonConditions is 'different' for requested distinct starting conditions, 'same' for explicitly equal starting conditions, otherwise 'unspecified'.",
      constraintSources: intentSources(request.prompt),
    },
    (value) => parseIntentResponse(value, request.prompt),
    undefined,
    {
      exampleRequest:
        "Explore how changing a value changes the result. Start at 5.",
      exampleResponse: {
        goal: "Explore the relationship between a value and its result",
        concepts: ["relationship"],
        interactions: ["change the value"],
        observations: ["result"],
        explicitConstraints: [
          { meaning: "Initial value", sourceId: "source-1" },
        ],
        suggestedStructure: "single",
        instanceCount: 1,
        comparisonConditions: "unspecified",
        question: "How does changing the value change the result?",
      },
    },
    768,
  );
  return intent;
}
