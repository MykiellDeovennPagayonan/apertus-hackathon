import { publicDefinitions } from "../../simulations/components/catalog";
import { parameterLeaves } from "../../simulations/components/controls/controlContract";
import {
  type ToolRequest,
  validateToolRequest,
} from "../../simulations/runtime/authoring/operations";
import { DocumentRuntime } from "../../simulations/runtime/authoring/runtime";
import type { AuthoredDocument } from "../../simulations/runtime/authoring/types";
import {
  type ParameterSchema,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import type { CreationArguments } from "./stages";

export type FixerResult = {
  request: ToolRequest | null;
  action: "tool" | "done";
  fixes: string[];
  issues: string[];
};

/**
 * Strips markdown fences, removes trailing commas, trims outer prose if exactly
 * one balanced JSON block exists. Never closes truncated brackets.
 */
export function cleanJsonText(raw: string): {
  cleaned: string;
  fixes: string[];
  error?: string;
} {
  const fixes: string[] = [];
  let text = raw.trim();

  // 1. Strip markdown fences
  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    fixes.push("stripped_markdown_fence");
  }

  // 2. Remove trailing commas in objects and arrays
  const trailingCommaRegex = /,\s*([}\]])/g;
  if (trailingCommaRegex.test(text)) {
    text = text.replace(trailingCommaRegex, "$1");
    fixes.push("removed_trailing_commas");
  }

  // 3. Count top-level balanced objects and check bracket balance
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return { cleaned: text, fixes, error: "No JSON object found" };
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;
  let fullObjects = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === "\\") {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) fullObjects++;
      }
    }
  }

  if (fullObjects > 1) {
    return {
      cleaned: text,
      fixes,
      error: "Multiple JSON objects found in response; expected exactly one",
    };
  }
  if (depth !== 0 || fullObjects === 0) {
    return {
      cleaned: text,
      fixes,
      error: "Unbalanced brackets; possible truncated output",
    };
  }

  if (firstBrace > 0 || lastBrace < text.length - 1) {
    text = text.slice(firstBrace, lastBrace + 1);
    fixes.push("trimmed_outer_prose");
  }

  return { cleaned: text, fixes };
}

/**
 * Normalizes common envelope misspellings safely (e.g. args -> arguments, unwrapping {action, tool}).
 */
export function normalizeEnvelope(obj: unknown): {
  normalized: unknown;
  action: "tool" | "done";
  fixes: string[];
} {
  const fixes: string[] = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { normalized: obj, action: "tool", fixes };
  }

  const record = { ...(obj as Record<string, unknown>) };

  // Turn envelope: { action: "done" } or { action: "tool", tool: { ... } }
  if (record.action === "done") {
    return { normalized: null, action: "done", fixes: ["action_done"] };
  }
  const action: "tool" | "done" = "tool";
  if (
    record.action === "tool" &&
    record.tool &&
    typeof record.tool === "object"
  ) {
    const inner = normalizeEnvelope(record.tool);
    return {
      normalized: inner.normalized,
      action: inner.action,
      fixes: ["unwrapped_turn_envelope", ...inner.fixes],
    };
  }

  // Alias normalization: "args" -> "arguments"
  if ("args" in record && !("arguments" in record)) {
    record.arguments = record.args;
    delete record.args;
    fixes.push("normalized_args_to_arguments");
  }

  return { normalized: record, action, fixes };
}

/**
 * Normalizes case and whitespace of target/source/node references against known live targets.
 */
export function normalizeReferences(
  request: ToolRequest,
  liveTargets: string[],
  document?: AuthoredDocument,
): { request: ToolRequest; fixes: string[] } {
  const fixes: string[] = [];
  const req = structuredClone(request);
  const targetMap = new Map<string, string>(); // lowercase -> canonical
  for (const t of liveTargets) {
    targetMap.set(t.toLowerCase().trim(), t);
  }

  function resolveRef(current: string): string {
    if (liveTargets.includes(current)) return current;
    const match = targetMap.get(current.toLowerCase().trim());
    if (match && match !== current) {
      fixes.push(`normalized_target_${current}_to_${match}`);
      return match;
    }
    const suffixMatch = liveTargets.find(
      (t) =>
        t.toLowerCase().endsWith(`/${current.toLowerCase().trim()}`) ||
        current.toLowerCase().trim().endsWith(`/${t.toLowerCase()}`),
    );
    if (suffixMatch) {
      fixes.push(`normalized_target_${current}_to_${suffixMatch}`);
      return suffixMatch;
    }
    if (document) {
      const defMatch = document.nodes.find(
        (n) =>
          n.definition.toLowerCase().endsWith(current.toLowerCase().trim()) ||
          n.definition.toLowerCase().includes(current.toLowerCase().trim()),
      );
      if (defMatch) {
        fixes.push(`normalized_target_${current}_to_${defMatch.id}`);
        return defMatch.id;
      }
    }
    return current;
  }

  if (req.tool === "regenerate_truss") {
    req.arguments.target = resolveRef(req.arguments.target);
  } else if (req.tool === "configure") {
    req.arguments.target = resolveRef(req.arguments.target);
    if (req.arguments.changes && typeof req.arguments.changes === "object") {
      const changes = req.arguments.changes as Record<string, unknown>;
      for (const [k, v] of Object.entries(changes)) {
        if (typeof v === "string") {
          const m = v.trim().match(/^(-?[0-9]+(?:\.[0-9]+)?)\s*[a-zA-Z%°/]*$/);
          if (m) {
            changes[k] = Number(m[1]);
            fixes.push(`coerced_config_${k}_string_to_number`);
          }
        }
      }
      if (document) {
        const targetNode =
          document.nodes.find((n) => n.id === req.arguments.target) ||
          document.nodes.find(
            (n) =>
              n.id
                .toLowerCase()
                .endsWith(`/${req.arguments.target.toLowerCase().trim()}`) ||
              req.arguments.target
                .toLowerCase()
                .trim()
                .endsWith(`/${n.id.toLowerCase()}`),
          );
        if (targetNode) {
          req.arguments.target = targetNode.id;
          const def = publicDefinitions.get(targetNode.definition);
          if (targetNode.definition.includes("RollingTrack")) {
            if ("friction" in changes && !("resistance" in changes)) {
              changes.resistance = changes.friction;
              delete changes.friction;
              fixes.push("normalized_config_friction_to_resistance");
            }
            if ("roughness" in changes && !("resistance" in changes)) {
              changes.resistance = changes.roughness;
              delete changes.roughness;
              fixes.push("normalized_config_roughness_to_resistance");
            }
          }
          if (targetNode.definition.includes("BridgeLoad")) {
            if (
              changes.position !== undefined &&
              typeof changes.position === "number" &&
              changes.position > 0.95
            ) {
              if (changes.magnitude === undefined) {
                fixes.push("redirected_bridge_load_position_to_magnitude");
                changes.magnitude = Math.min(30, Math.max(2, changes.position));
                delete changes.position;
              } else {
                changes.position = 0.95;
              }
            } else if (
              changes.position !== undefined &&
              typeof changes.position === "number" &&
              changes.position < 0.05
            ) {
              changes.position = 0.05;
            }
            if (
              changes.magnitude !== undefined &&
              typeof changes.magnitude === "number"
            ) {
              changes.magnitude = Math.min(30, Math.max(2, changes.magnitude));
            }
          }
          if (
            def?.configuration &&
            typeof def.configuration === "object" &&
            "properties" in def.configuration
          ) {
            const props = (def.configuration as Record<string, unknown>)
              .properties as Record<string, Record<string, unknown>>;
            for (const [propName, propSchema] of Object.entries(props || {})) {
              if (
                (propSchema.type === "number" ||
                  propSchema.type === "integer") &&
                typeof changes[propName] === "number"
              ) {
                const val = changes[propName] as number;
                if (
                  typeof propSchema.minimum === "number" &&
                  val < propSchema.minimum
                ) {
                  fixes.push(`clamped_config_${propName}_min`);
                  changes[propName] = propSchema.minimum;
                } else if (
                  typeof propSchema.maximum === "number" &&
                  val > propSchema.maximum
                ) {
                  fixes.push(`clamped_config_${propName}_max`);
                  changes[propName] = propSchema.maximum;
                }
              }
            }
          }
        }
      }
    }
  } else if (req.tool === "insert_component") {
    if (
      req.arguments.configuration &&
      typeof req.arguments.configuration === "object"
    ) {
      const cfg = req.arguments.configuration as Record<string, unknown>;
      for (const [k, v] of Object.entries(cfg)) {
        if (typeof v === "string" && /^-?[0-9]+(?:\.[0-9]+)?$/.test(v.trim())) {
          cfg[k] = Number(v.trim());
          fixes.push(`coerced_insert_config_${k}_string_to_number`);
        }
      }
      if (req.arguments.definition?.includes("RollingTrack")) {
        if ("friction" in cfg && !("resistance" in cfg)) {
          cfg.resistance = cfg.friction;
          delete cfg.friction;
          fixes.push("normalized_insert_config_friction_to_resistance");
        }
        if ("roughness" in cfg && !("resistance" in cfg)) {
          cfg.resistance = cfg.roughness;
          delete cfg.roughness;
          fixes.push("normalized_insert_config_roughness_to_resistance");
        }
      }
    }
  } else if (req.tool === "remove") {
    const rawArgs = req.arguments as Record<string, unknown>;
    if ("target" in rawArgs && !("targets" in rawArgs)) {
      rawArgs.targets = [rawArgs.target];
      delete rawArgs.target;
      fixes.push("normalized_remove_target_to_targets");
    } else if (typeof rawArgs.targets === "string") {
      rawArgs.targets = [rawArgs.targets];
      fixes.push("normalized_remove_targets_string_to_array");
    }
    if (Array.isArray(rawArgs.targets)) {
      rawArgs.targets = (rawArgs.targets as string[]).map(resolveRef);
      if (document) {
        const liveIds = new Set(document.nodes.map((n) => n.id));
        const filtered = (rawArgs.targets as string[]).filter((t: string) =>
          liveIds.has(t),
        );
        if (
          filtered.length > 0 &&
          filtered.length !== (rawArgs.targets as string[]).length
        ) {
          fixes.push("filtered_nonexistent_remove_targets");
          rawArgs.targets = filtered;
        }
      }
      req.arguments.targets = rawArgs.targets as string[];
    }
  } else if (req.tool === "add_control") {
    req.arguments.target = resolveRef(req.arguments.target);
    if (document) {
      const targetNode = document.nodes.find(
        (n) => n.id === req.arguments.target,
      );
      if (targetNode) {
        const def = publicDefinitions.get(targetNode.definition);
        const cmd = def?.commands[req.arguments.command];
        if (cmd) {
          const leaves = parameterLeaves(cmd.arguments);
          if (leaves.length === 1 && req.arguments.field !== leaves[0].path) {
            fixes.push(
              `normalized_control_field_${req.arguments.field}_to_${leaves[0].path}`,
            );
            req.arguments.field = leaves[0].path;
          } else if (
            leaves.length > 1 &&
            (!req.arguments.field ||
              !leaves.some((l) => l.path === req.arguments.field))
          ) {
            const match = leaves.find(
              (l) =>
                req.arguments.field &&
                l.path
                  .toLowerCase()
                  .includes(req.arguments.field.toLowerCase()),
            );
            if (match) {
              fixes.push(
                `normalized_control_field_${req.arguments.field}_to_${match.path}`,
              );
              req.arguments.field = match.path;
            }
          }
        }
      }
    }
  } else if (req.tool === "add_observation") {
    req.arguments.source = resolveRef(req.arguments.source);
    if (document) {
      const sourceNode = document.nodes.find(
        (n) => n.id === req.arguments.source,
      );
      if (sourceNode) {
        const def = publicDefinitions.get(sourceNode.definition);
        if (def) {
          const validOutputs = Object.entries(def.outputs)
            .filter(([_, port]) => port.kind === "value")
            .map(([k]) => k);
          if (
            req.arguments.output &&
            !validOutputs.includes(req.arguments.output)
          ) {
            const match = validOutputs.find(
              (o) => o.toLowerCase() === req.arguments.output.toLowerCase(),
            );
            if (match) {
              fixes.push(
                `normalized_observation_output_${req.arguments.output}_to_${match}`,
              );
              req.arguments.output = match;
            }
          }
          if (req.arguments.widget === "readout") {
            try {
              const runtime = new DocumentRuntime(document);
              const outputVal =
                runtime.getSnapshot().outputs[sourceNode.id]?.[
                  req.arguments.output
                ];
              if (
                typeof outputVal !== "number" &&
                req.arguments.output !== "board"
              ) {
                fixes.push(
                  "normalized_observation_widget_readout_to_inspector",
                );
                req.arguments.widget = "inspector";
              }
            } catch {
              if (sourceNode.definition === "models/BridgeResponse") {
                fixes.push(
                  "normalized_observation_widget_readout_to_inspector",
                );
                req.arguments.widget = "inspector";
              }
            }
          }
        }
      }
    }
  } else if (req.tool === "connect") {
    if (req.arguments.from?.node) {
      req.arguments.from.node = resolveRef(req.arguments.from.node);
    }
    if (req.arguments.to?.node) {
      req.arguments.to.node = resolveRef(req.arguments.to.node);
    }
    if (document) {
      const fromNode = req.arguments.from?.node
        ? document.nodes.find((n) => n.id === req.arguments.from.node)
        : undefined;
      const toNode = req.arguments.to?.node
        ? document.nodes.find((n) => n.id === req.arguments.to.node)
        : undefined;
      const fromDef = fromNode
        ? publicDefinitions.get(fromNode.definition)
        : undefined;
      const toDef = toNode
        ? publicDefinitions.get(toNode.definition)
        : undefined;

      // Detect swapped from and to
      if (fromDef && toDef) {
        const fromHasOutput =
          fromDef.outputs && req.arguments.from.port in fromDef.outputs;
        const toHasOutput =
          toDef.outputs && req.arguments.to.port in toDef.outputs;
        const fromHasInput =
          fromDef.inputs && req.arguments.from.port in fromDef.inputs;
        const toHasInput =
          toDef.inputs && req.arguments.to.port in toDef.inputs;

        if (!fromHasOutput && toHasOutput && fromHasInput && !toHasInput) {
          fixes.push("normalized_connect_swapped_from_and_to");
          const temp = req.arguments.from;
          req.arguments.from = req.arguments.to;
          req.arguments.to = temp;
        }
      }

      // Normalize port casing / snake_case
      if (fromDef?.outputs) {
        const validOutputs = Object.keys(fromDef.outputs);
        if (!validOutputs.includes(req.arguments.from.port)) {
          const match = validOutputs.find(
            (o) =>
              o.toLowerCase() ===
              req.arguments.from.port.toLowerCase().replace(/_/g, ""),
          );
          if (match) {
            fixes.push(
              `normalized_connect_from_port_${req.arguments.from.port}_to_${match}`,
            );
            req.arguments.from.port = match;
          }
        }
      }
      if (toDef?.inputs) {
        const validInputs = Object.keys(toDef.inputs);
        if (!validInputs.includes(req.arguments.to.port)) {
          const match = validInputs.find(
            (i) =>
              i.toLowerCase() ===
              req.arguments.to.port.toLowerCase().replace(/_/g, ""),
          );
          if (match) {
            fixes.push(
              `normalized_connect_to_port_${req.arguments.to.port}_to_${match}`,
            );
            req.arguments.to.port = match;
          }
        }
      }
    }
  } else if (req.tool === "arrange") {
    if (req.arguments.preserveLocked !== true) {
      req.arguments.preserveLocked = true;
      fixes.push("normalized_preserve_locked_true");
    }
    const validTemplates = ["scene-with-sidebar", "comparison", "vertical"];
    if (!validTemplates.includes(req.arguments.template)) {
      req.arguments.template = "scene-with-sidebar";
      fixes.push("normalized_arrange_template");
    }
    for (const key of ["main", "controls", "results", "narrowOrder"] as const) {
      if (Array.isArray(req.arguments[key])) {
        req.arguments[key] = (req.arguments[key] as string[]).map(resolveRef);
      }
    }
  }

  return { request: req, fixes };
}

/**
 * Normalizes and fixes recipe creation configurations and explicit prompt quantities:
 * - Bridge: load magnitude (tonnes), position (halfway / percentage)
 * - Arithmetic: starting number a, added/subtracted number b, operation, looping
 * - Area-perimeter: width and height for rectangles, equal perimeters
 * - String-to-number coercion in overrides
 */
export function fixConfiguration(
  prompt: string,
  slug: string,
  configuration: CreationArguments,
): { fixes: string[] } {
  const fixes: string[] = [];
  if (
    !configuration ||
    !Array.isArray(configuration.instances) ||
    configuration.instances.length === 0
  ) {
    return { fixes };
  }

  const numberPattern = "([0-9]+(?:\\.[0-9]+)?)";
  const first = configuration.instances[0];
  if (!first.overrides || typeof first.overrides !== "object") {
    first.overrides = {};
  }

  const comparisonKeywords =
    /\b(?:compare|comparison|versus|\bvs\b|difference|differ|between two|side by side|both|two (?:bridges?|models?|rectangles?|tracks?))\b/i;
  if (!comparisonKeywords.test(prompt) && configuration.instances.length > 1) {
    fixes.push("pruned_unrequested_comparison_instances");
    configuration.instances = [configuration.instances[0]];
  }

  // Coerce all string numbers in overrides to numbers
  for (const inst of configuration.instances) {
    if (inst.overrides && typeof inst.overrides === "object") {
      for (const [k, v] of Object.entries(inst.overrides)) {
        if (typeof v === "string" && /^-?[0-9]+(?:\.[0-9]+)?$/.test(v.trim())) {
          inst.overrides[k] = Number(v.trim());
          fixes.push(`coerced_override_${k}_to_number`);
        }
      }
    }
  }

  if (slug === "bridge") {
    if (
      typeof first.overrides.magnitude === "string" &&
      /^-?[0-9]+(?:\.[0-9]+)?$/.test(
        (first.overrides.magnitude as string).trim(),
      )
    ) {
      first.overrides.magnitude = Number(
        (first.overrides.magnitude as string).trim(),
      );
      fixes.push("coerced_bridge_magnitude_string_to_number");
    }
    if (
      typeof first.overrides.position === "string" &&
      /^-?[0-9]+(?:\.[0-9]+)?$/.test(
        (first.overrides.position as string).trim(),
      )
    ) {
      first.overrides.position = Number(
        (first.overrides.position as string).trim(),
      );
      fixes.push("coerced_bridge_position_string_to_number");
    }

    const loadMatch = prompt.match(
      new RegExp(
        `${numberPattern}[ -]*(tonnes?|tons?|t|kilograms?|kg)\\b(?:[- ]+load)?`,
        "i",
      ),
    );
    if (loadMatch) {
      const rawMag =
        Number(loadMatch[1]) *
        (/^(?:kg|kilogram)/i.test(loadMatch[2]) ? 0.001 : 1);
      const clampedMag = Math.min(30, Math.max(2, rawMag));
      if (first.overrides.magnitude === undefined) {
        fixes.push(`fixed_bridge_magnitude_to_${clampedMag}`);
        first.overrides.magnitude = clampedMag;
      }
    }

    if (typeof first.overrides.magnitude === "number") {
      if (first.overrides.magnitude > 30) {
        fixes.push(
          `clamped_bridge_magnitude_max_${first.overrides.magnitude}_to_30`,
        );
        first.overrides.magnitude = 30;
      } else if (first.overrides.magnitude < 2) {
        fixes.push(
          `clamped_bridge_magnitude_min_${first.overrides.magnitude}_to_2`,
        );
        first.overrides.magnitude = 2;
      }
    }

    if (typeof first.overrides.position === "number") {
      if (first.overrides.position > 0.95) {
        fixes.push("clamped_bridge_position_max_to_0.95");
        first.overrides.position = 0.95;
      } else if (first.overrides.position < 0.05) {
        fixes.push("clamped_bridge_position_min_to_0.05");
        first.overrides.position = 0.05;
      }
    }

    if (/\b(?:start|initially)\b[^.!?]*\bhalfway\b/i.test(prompt)) {
      if (first.overrides.position === undefined) {
        fixes.push("fixed_bridge_position_to_0.5");
        first.overrides.position = 0.5;
      }
    }

    const posMatch = prompt.match(
      new RegExp(
        `\\b(?:start|initially)\\b[^.!?]*?\\b${numberPattern}\\s*%\\s*(?:across|along)`,
        "i",
      ),
    );
    if (posMatch && first.overrides.position === undefined) {
      const expectedPos = Math.min(
        0.95,
        Math.max(0.05, Number(posMatch[1]) / 100),
      );
      fixes.push(`fixed_bridge_position_to_${expectedPos}`);
      first.overrides.position = expectedPos;
    }
  } else if (slug === "arithmetic") {
    if (!first.overrides.task || typeof first.overrides.task !== "object") {
      first.overrides.task = {};
    }
    const task = first.overrides.task as Record<string, unknown>;
    for (const key of ["a", "b"]) {
      if (
        typeof task[key] === "string" &&
        /^-?[0-9]+(?:\.[0-9]+)?$/.test((task[key] as string).trim())
      ) {
        task[key] = Number((task[key] as string).trim());
        fixes.push(`coerced_arithmetic_${key}_string_to_number`);
      }
    }
    const aMatch = prompt.match(
      new RegExp(
        `\\b(?:start(?:ing)? (?:with|at)|first number (?:is|to|at))\\s+${numberPattern}`,
        "i",
      ),
    );
    const bMatch = prompt.match(
      new RegExp(`\\b(add|subtract|take away)\\s+${numberPattern}`, "i"),
    );

    if (aMatch && task.a === undefined) {
      const expectedA = Number(aMatch[1]);
      fixes.push(`fixed_arithmetic_a_to_${expectedA}`);
      task.a = expectedA;
    }
    if (bMatch && task.b === undefined) {
      const expectedB = Number(bMatch[2]);
      fixes.push(`fixed_arithmetic_b_to_${expectedB}`);
      task.b = expectedB;
    }
    if (bMatch && !task.operation) {
      const expectedOp = bMatch[1].toLowerCase() === "add" ? "add" : "subtract";
      fixes.push(`fixed_arithmetic_operation_to_${expectedOp}`);
      task.operation = expectedOp;
    }
    if (
      /\b(?:wait|press|click|tap)\b/i.test(prompt) &&
      first.overrides.looping !== false
    ) {
      fixes.push("fixed_arithmetic_looping_to_false");
      first.overrides.looping = false;
    }
  } else if (slug === "area-perimeter") {
    const factors: Record<string, number> = {
      m: 1,
      metre: 1,
      metres: 1,
      meter: 1,
      meters: 1,
      cm: 0.01,
      centimetre: 0.01,
      centimetres: 0.01,
      centimeter: 0.01,
      centimeters: 0.01,
      mm: 0.001,
      millimetre: 0.001,
      millimetres: 0.001,
      millimeter: 0.001,
      millimeters: 0.001,
      km: 1000,
      kilometre: 1000,
      kilometres: 1000,
      kilometer: 1000,
      kilometers: 1000,
      ft: 0.3048,
      feet: 0.3048,
      foot: 0.3048,
    };
    const dimension = new RegExp(
      `${numberPattern}\\s*(${Object.keys(factors)
        .sort((a, b) => b.length - a.length)
        .join("|")})\\b\\s+(wide|high|tall)`,
      "gi",
    );
    const mentions = [...prompt.matchAll(dimension)];
    const markers = [...prompt.matchAll(/\b([A-Z])\s+(?:is|starts?|has)\b/g)];

    for (const match of mentions) {
      const marker = markers
        .filter((m) => (m.index ?? 0) < (match.index ?? 0))
        .at(-1);
      const instance = marker
        ? configuration.instances.find((i) => i.alias === marker[1])
        : configuration.instances.length === 1
          ? first
          : undefined;
      if (instance?.overrides) {
        const field = match[3].toLowerCase() === "wide" ? "width" : "height";
        const expected = Number(match[1]) * factors[match[2].toLowerCase()];
        if (instance.overrides[field] === undefined) {
          fixes.push(`fixed_${instance.alias}_${field}_to_${expected}`);
          instance.overrides[field] = expected;
        }
      }
    }
  }

  return { fixes };
}

/**
 * Format fixer pipeline for turn tool calls:
 * 1. Clean JSON text (strip fences, trailing commas, single balanced object)
 * 2. Parse JSON
 * 3. Normalize envelope (done vs tool, unwrap, args -> arguments)
 * 4. Normalize references against live targets
 * 5. Validate with validateToolRequest and optional turn schema
 */
export function fixAndValidateToolResponse(
  rawText: string,
  liveTargets: string[],
  turnSchema?: ParameterSchema,
  onEvent?: (event: string, data: unknown) => void,
  document?: AuthoredDocument,
): FixerResult {
  const issues: string[] = [];
  const allFixes: string[] = [];

  const {
    cleaned,
    fixes: cleanFixes,
    error: cleanErr,
  } = cleanJsonText(rawText);
  allFixes.push(...cleanFixes);

  if (cleanErr) {
    issues.push(cleanErr);
    onEvent?.("fixer.rejected", {
      raw: rawText.slice(0, 300),
      error: cleanErr,
    });
    return { request: null, action: "tool", fixes: allFixes, issues };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "JSON syntax error";
    issues.push(`Malformed JSON: ${msg}`);
    onEvent?.("fixer.rejected", { raw: rawText.slice(0, 300), error: msg });
    return { request: null, action: "tool", fixes: allFixes, issues };
  }

  const { normalized, action, fixes: envFixes } = normalizeEnvelope(parsed);
  allFixes.push(...envFixes);

  if (action === "done") {
    onEvent?.("fixer.applied", { action: "done", fixes: allFixes });
    return { request: null, action: "done", fixes: allFixes, issues: [] };
  }

  try {
    validateToolRequest(normalized as ToolRequest);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tool validation failed";
    issues.push(msg);
    onEvent?.("fixer.rejected", { error: msg, parsed: normalized });
    return { request: null, action: "tool", fixes: allFixes, issues };
  }

  const { request: refRequest, fixes: refFixes } = normalizeReferences(
    normalized as ToolRequest,
    liveTargets,
    document,
  );
  allFixes.push(...refFixes);

  if (turnSchema) {
    try {
      validateValue(turnSchema, refRequest);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Turn schema validation failed";
      issues.push(msg);
      onEvent?.("fixer.rejected", { error: msg, request: refRequest });
      return { request: null, action: "tool", fixes: allFixes, issues };
    }
  }

  if (allFixes.length > 0) {
    onEvent?.("fixer.applied", { fixes: allFixes, tool: refRequest.tool });
  }

  return {
    request: refRequest,
    action: "tool",
    fixes: allFixes,
    issues: [],
  };
}
