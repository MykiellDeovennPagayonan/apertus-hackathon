import { arrangementTemplates } from "./presentation/arrangement";
import { publicDefinitions } from "../../registry/index";
import {
  catalogComponentIds,
  catalogRecipeAllowed,
} from "../../registry/catalogScope";
import { parameterLeaves } from "../../registry/contracts/controlContract";
import { hasBoundControl } from "./bindings";
import { boardItemMinimum } from "./presentation/board";
import {
  patchSchema,
  recipeOverrideSchema,
  type ToolRequest,
} from "./operations";
import { suggestConnections } from "../validator/runnable";
import type { AuthoredDocument } from "./document";
import {
  choice,
  num,
  object,
  type ParameterSchema,
} from "../../registry/contracts/parameterSchema";
import { premadeRecipe } from "../../registry/recipes/premade";
import {
  type JsonSchema,
  toJsonSchema,
} from "../input/inference/structuredSchema";
import type { ComponentBucketCard } from "../component-selection/componentCandidates";

const alias: ParameterSchema = {
  type: "string",
  minLength: 1,
  maxLength: 32,
};
const text: ParameterSchema = {
  type: "string",
  maxLength: 200,
};

export type AllowedTurnTool = {
  tool: string;
  schema: ParameterSchema;
};

export type TurnToolDefinition = AllowedTurnTool;

export type TurnActionEnvelope = {
  action: "tool" | "done";
  tool?: ToolRequest;
  note?: string;
};

/**
 * Builds compact allowed tools and turn schema based on the current draft and bucket.
 */
export function buildTurnTools(
  document: AuthoredDocument,
  bucketCards: ComponentBucketCard[],
): AllowedTurnTool[] {
  const tools: AllowedTurnTool[] = [];
  const nodeIds = document.nodes.map((n) => n.id);

  // 1. insert_component (for initial components in bucket)
  const initialCards = bucketCards.filter((c) => c.kind === "initial");
  for (const card of initialCards) {
    const def = publicDefinitions.get(card.id);
    if (!catalogComponentIds.has(card.id)) continue;
    if (!def) continue;
    const existingCount = document.nodes.filter(
      (n) => n.definition === card.id,
    ).length;
    if (def.category === "models" && existingCount >= 2) continue;
    if (def.category !== "models" && existingCount >= 4) continue;
    tools.push({
      tool: "insert_component",
      schema: object({
        definition: choice(def.id),
        version: choice(def.version),
        alias,
        configuration: patchSchema(def.configuration),
      }),
    });
  }

  // 2. insert_recipe (for composite components in bucket)
  const compositeCards = bucketCards.filter(
    (c) => c.kind === "composite" && c.recipeSlug,
  );
  for (const card of compositeCards) {
    if (!card.recipeSlug) continue;
    try {
      const recipe = premadeRecipe(card.recipeSlug);
      if (!catalogRecipeAllowed(recipe)) continue;
      tools.push({
        tool: "insert_recipe",
        schema: object({
          recipe: choice(card.recipeSlug),
          version: choice(recipe.version),
          alias,
          overrides: recipeOverrideSchema(recipe),
        }),
      });
    } catch {
      // Skip if recipe lookup fails
    }
  }

  // 3. connect (from live outputs to live inputs/commands)
  const candidates = suggestConnections(document);
  // Prefer explicit named event-command contracts before the bounded shortlist.
  // Otherwise several empty-payload actions can displace an essential setter.
  const rankedConnections = [...candidates].sort((a, b) => {
    const priority = (c: typeof a) =>
      c.kind === "command" ? (c.from.port === c.to.port ? 0 : 2) : 1;
    return priority(a) - priority(b);
  });
  for (const c of rankedConnections.slice(0, 16)) {
    tools.push({
      tool: "connect",
      schema: object({
        from: object({ node: choice(c.from.node), port: choice(c.from.port) }),
        to: object({ node: choice(c.to.node), port: choice(c.to.port) }),
      }),
    });
  }

  // 4. configure live nodes
  if (nodeIds.length > 0) {
    for (const node of [...document.nodes, ...document.resources]) {
      const def = publicDefinitions.get(node.definition);
      if (
        !def ||
        (def.configuration.type === "object" &&
          !Object.keys(def.configuration.properties).length)
      )
        continue;
      tools.push({
        tool: "configure",
        schema: object({
          target: choice(node.id),
          changes: patchSchema(def.configuration),
        }),
      });
    }

    // 5. add_control per (target, command): fields come from that command only
    for (const node of document.nodes) {
      const def = publicDefinitions.get(node.definition);
      if (!def) continue;
      for (const [command, contract] of Object.entries(def.commands)) {
        const leaves = parameterLeaves(contract.arguments).map((l) => l.path);
        const fields = (leaves.length ? leaves : [""]).filter(
          (field) => !hasBoundControl(document, node.id, command, field),
        );
        if (!fields.length) continue;
        tools.push({
          tool: "add_control",
          schema: object({
            target: choice(node.id),
            command: choice(command),
            field: choice(...fields),
            widget: choice("slider", "number", "toggle", "select", "button"),
            label: text,
          }),
        });
      }
    }

    // 6. add_observation per source with its own value outputs
    for (const node of document.nodes) {
      const def = publicDefinitions.get(node.definition);
      if (!def) continue;
      const outputs = Object.entries(def.outputs)
        .filter(([, port]) => port.kind === "value")
        .map(([name]) => name);
      if (!outputs.length) continue;
      tools.push({
        tool: "add_observation",
        schema: object({
          source: choice(node.id),
          output: choice(...outputs),
          widget: choice("readout", "inspector"),
          label: text,
        }),
      });
    }

    // 7. remove
    tools.push({
      tool: "remove",
      schema: object({
        targets: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: choice(...nodeIds),
        },
      }),
    });
  }

  // 8. set_lesson
  tools.push({
    tool: "set_lesson",
    schema: object({
      title: { type: "string", maxLength: 100 },
      instruction: { type: "string", maxLength: 500 },
      explanation: { type: "string", minLength: 0, maxLength: 1500 },
    }),
  });

  // 9. arrange
  const layoutTargets = document.layout.children.map((l) => l.node ?? l.id);
  tools.push({
    tool: "arrange",
    schema: object(
      {
        template: choice(...arrangementTemplates),
        main: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: layoutTargets.length > 0 ? choice(...layoutTargets) : text,
        },
        controls: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: layoutTargets.length > 0 ? choice(...layoutTargets) : text,
        },
        results: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: layoutTargets.length > 0 ? choice(...layoutTargets) : text,
        },
        beside: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: layoutTargets.length > 0 ? choice(...layoutTargets) : text,
        },
        below: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: layoutTargets.length > 0 ? choice(...layoutTargets) : text,
        },
        narrowOrder: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: layoutTargets.length > 0 ? choice(...layoutTargets) : text,
        },
        preserveLocked: { type: "boolean" },
      },
      ["beside", "below"],
    ),
  });

  if (document.presentation?.mode === "board")
    for (const item of document.presentation.items) {
      if (!item.layoutId || item.locked) continue;
      const minimum = boardItemMinimum(document, item.layoutId);
      tools.push({
        tool: "resize",
        schema: object({
          target: choice(item.id),
          width: num(minimum.width, 10000, "px"),
          height: num(minimum.height, 10000, "px"),
        }),
      });
    }
  return tools;
}

export function buildTurnEnvelopeSchema(
  tools: AllowedTurnTool[],
  allowDone = true,
): JsonSchema {
  const toolChoices = tools.map((t) =>
    toJsonSchema(
      object({
        tool: choice(t.tool),
        arguments: t.schema,
      }),
    ),
  );

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      action: { enum: allowDone ? ["tool", "done"] : ["tool"] },
      tool: {
        type: "object",
        anyOf: toolChoices,
      },
      note: { type: "string", maxLength: 200 },
    },
    required: allowDone ? ["action"] : ["action", "tool"],
  };
}
