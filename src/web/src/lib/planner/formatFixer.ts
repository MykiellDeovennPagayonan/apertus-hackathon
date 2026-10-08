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

  // 0. Strip <think>...</think> reasoning blocks
  if (/<think>[\s\S]*?<\/think>/i.test(text)) {
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    fixes.push("stripped_think_tags");
  }

  // 1. Strip markdown fences or extract fenced code block
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
    fixes.push("stripped_markdown_fence");
  } else if (text.startsWith("```")) {
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

const CANONICAL_TOOL_MAP: Record<string, ToolRequest["tool"]> = {
  insert_component: "insert_component",
  insertcomponent: "insert_component",
  "insert-component": "insert_component",
  add_component: "insert_component",
  addcomponent: "insert_component",
  "add-component": "insert_component",
  create_component: "insert_component",
  createcomponent: "insert_component",
  put_component: "insert_component",

  insert_recipe: "insert_recipe",
  insertrecipe: "insert_recipe",
  "insert-recipe": "insert_recipe",
  add_recipe: "insert_recipe",
  addrecipe: "insert_recipe",
  load_recipe: "insert_recipe",
  loadrecipe: "insert_recipe",

  configure: "configure",
  config: "configure",
  set_configuration: "configure",
  setconfiguration: "configure",
  set_config: "configure",
  update_configuration: "configure",
  update_config: "configure",
  patch_configuration: "configure",
  patch_config: "configure",

  add_control: "add_control",
  addcontrol: "add_control",
  "add-control": "add_control",
  create_control: "add_control",
  createcontrol: "add_control",
  insert_control: "add_control",
  insertcontrol: "add_control",
  bind_control: "add_control",

  add_observation: "add_observation",
  addobservation: "add_observation",
  "add-observation": "add_observation",
  create_observation: "add_observation",
  createobservation: "add_observation",
  insert_observation: "add_observation",
  add_readout: "add_observation",
  addreadout: "add_observation",
  add_inspector: "add_observation",
  addinspector: "add_observation",

  connect: "connect",
  connect_ports: "connect",
  connectports: "connect",
  "connect-ports": "connect",
  wire: "connect",
  link: "connect",
  create_connection: "connect",

  regenerate_truss: "regenerate_truss",
  regeneratetruss: "regenerate_truss",
  "regenerate-truss": "regenerate_truss",
  update_truss: "regenerate_truss",
  updatetruss: "regenerate_truss",
  rebuild_truss: "regenerate_truss",

  remove: "remove",
  delete: "remove",
  delete_component: "remove",
  deletecomponent: "remove",
  remove_component: "remove",
  removecomponent: "remove",
  destroy: "remove",

  arrange: "arrange",
  layout: "arrange",
  set_layout: "arrange",
  setlayout: "arrange",
  arrange_layout: "arrange",
  arrangelayout: "arrange",
  "arrange-layout": "arrange",

  set_lesson: "set_lesson",
  setlesson: "set_lesson",
  "set-lesson": "set_lesson",
  update_lesson: "set_lesson",
  updatelesson: "set_lesson",
  lesson: "set_lesson",
};

/**
 * Normalizes common envelope misspellings safely (e.g. args -> arguments, unwrapping {action, tool},
 * OpenAI function call schemas, arrays, tool name canonicalization).
 */
export function normalizeEnvelope(obj: unknown): {
  normalized: unknown;
  action: "tool" | "done";
  fixes: string[];
} {
  const fixes: string[] = [];

  // 1. Unwrap arrays e.g. [ { action: "tool", ... } ]
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const inner = normalizeEnvelope(obj[0]);
      return {
        normalized: inner.normalized,
        action: inner.action,
        fixes: ["unwrapped_array_envelope", ...inner.fixes],
      };
    }
    return { normalized: obj, action: "tool", fixes };
  }

  if (!obj || typeof obj !== "object") {
    return { normalized: obj, action: "tool", fixes };
  }

  const record = { ...(obj as Record<string, unknown>) };

  // 2. Done action recognition
  const doneKeywords = new Set([
    "done",
    "finish",
    "finished",
    "complete",
    "completed",
    "stop",
    "end",
  ]);
  if (
    (typeof record.action === "string" &&
      doneKeywords.has(record.action.toLowerCase().trim())) ||
    (typeof record.status === "string" &&
      doneKeywords.has(record.status.toLowerCase().trim())) ||
    (typeof record.tool === "string" &&
      doneKeywords.has(record.tool.toLowerCase().trim())) ||
    record.done === true
  ) {
    return { normalized: null, action: "done", fixes: ["action_done"] };
  }

  // 3. Unwrap nested envelopes
  // - Turn envelope: { action: "tool", tool: { ... } } or { action: "call", ... }
  if (
    (record.action === "tool" ||
      record.action === "call" ||
      record.action === "use_tool") &&
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

  // - OpenAI function format: { function: { name, arguments } } or { type: "function", function: ... }
  if (record.function && typeof record.function === "object") {
    const inner = normalizeEnvelope(record.function);
    return {
      normalized: inner.normalized,
      action: inner.action,
      fixes: ["unwrapped_function_envelope", ...inner.fixes],
    };
  }

  // - OpenAI tool_call format: { tool_call: { ... } } or { tool_calls: [ ... ] }
  if (record.tool_call && typeof record.tool_call === "object") {
    const inner = normalizeEnvelope(record.tool_call);
    return {
      normalized: inner.normalized,
      action: inner.action,
      fixes: ["unwrapped_tool_call_envelope", ...inner.fixes],
    };
  }
  if (Array.isArray(record.tool_calls) && record.tool_calls.length > 0) {
    const inner = normalizeEnvelope(record.tool_calls[0]);
    return {
      normalized: inner.normalized,
      action: inner.action,
      fixes: ["unwrapped_tool_calls_envelope", ...inner.fixes],
    };
  }

  // 4. Tool name key normalization
  if (typeof record.name === "string" && !record.tool) {
    record.tool = record.name;
    delete record.name;
    fixes.push("normalized_name_to_tool");
  } else if (typeof record.tool_name === "string" && !record.tool) {
    record.tool = record.tool_name;
    delete record.tool_name;
    fixes.push("normalized_tool_name_to_tool");
  } else if (typeof record.call === "string" && !record.tool) {
    record.tool = record.call;
    delete record.call;
    fixes.push("normalized_call_to_tool");
  }

  // 5. Arguments key normalization
  if ("args" in record && !("arguments" in record)) {
    record.arguments = record.args;
    delete record.args;
    fixes.push("normalized_args_to_arguments");
  } else if ("parameters" in record && !("arguments" in record)) {
    record.arguments = record.parameters;
    delete record.parameters;
    fixes.push("normalized_parameters_to_arguments");
  } else if ("params" in record && !("arguments" in record)) {
    record.arguments = record.params;
    delete record.params;
    fixes.push("normalized_params_to_arguments");
  } else if (
    "input" in record &&
    !("arguments" in record) &&
    typeof record.input === "object"
  ) {
    record.arguments = record.input;
    delete record.input;
    fixes.push("normalized_input_to_arguments");
  }

  // 6. Stringified JSON arguments (common in OpenAI tool responses)
  if (typeof record.arguments === "string") {
    try {
      record.arguments = JSON.parse(record.arguments as string);
      fixes.push("parsed_stringified_arguments");
    } catch {
      // Retain raw string if parse fails
    }
  }

  // 7. Canonical tool name mapping
  if (typeof record.tool === "string") {
    const rawTool = (record.tool as string).toLowerCase().trim();
    const canonical = CANONICAL_TOOL_MAP[rawTool];
    if (canonical) {
      if (canonical !== record.tool) {
        fixes.push(`normalized_tool_${record.tool}_to_${canonical}`);
        record.tool = canonical;
      }
    }
  }

  return { normalized: record, action: "tool", fixes };
}

function humanize(str: string): string {
  const spaced = str
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return str;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Normalizes case, whitespace, definitions, argument aliases, and missing defaults
 * across all authoring tools against known live targets and document schema.
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

  if (req.tool === "insert_component") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;

    // 1. Definition normalization
    if (typeof rawArgs.definition === "string") {
      const defStr = rawArgs.definition.trim();
      if (!publicDefinitions.has(defStr)) {
        for (const [id] of publicDefinitions) {
          if (
            id.toLowerCase() === defStr.toLowerCase() ||
            id.toLowerCase().endsWith(`/${defStr.toLowerCase()}`) ||
            id.toLowerCase().replace(/[-_]/g, "").endsWith(defStr.toLowerCase().replace(/[-_]/g, ""))
          ) {
            fixes.push(`resolved_definition_${defStr}_to_${id}`);
            rawArgs.definition = id;
            break;
          }
        }
      }
    }

    // 2. Version default
    if (typeof rawArgs.version !== "number") {
      rawArgs.version = 1;
      fixes.push("defaulted_insert_version_1");
    }

    // 3. Alias default & sanitization
    if (typeof rawArgs.alias !== "string" || !rawArgs.alias.trim()) {
      const defPart =
        (typeof rawArgs.definition === "string"
          ? rawArgs.definition.split("/").pop()
          : "comp") || "comp";
      rawArgs.alias = `${defPart.toLowerCase()}_1`;
      fixes.push("defaulted_insert_alias");
    } else {
      let sanitized = rawArgs.alias.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      if (!/^[a-zA-Z]/.test(sanitized)) {
        sanitized = `c_${sanitized}`;
      }
      if (sanitized !== rawArgs.alias) {
        fixes.push(`sanitized_alias_${rawArgs.alias}_to_${sanitized}`);
        rawArgs.alias = sanitized;
      }
    }

    // 4. Configuration normalization
    if (
      !rawArgs.configuration ||
      typeof rawArgs.configuration !== "object" ||
      Array.isArray(rawArgs.configuration)
    ) {
      const altCfg = rawArgs.config || rawArgs.parameters || rawArgs.props;
      if (altCfg && typeof altCfg === "object" && !Array.isArray(altCfg)) {
        rawArgs.configuration = altCfg;
        fixes.push("normalized_config_to_configuration");
      } else {
        rawArgs.configuration = {};
        fixes.push("defaulted_insert_configuration");
      }
    }

    const cfg = rawArgs.configuration as Record<string, unknown>;
    for (const [k, v] of Object.entries(cfg)) {
      if (typeof v === "string" && /^-?[0-9]+(?:\.[0-9]+)?$/.test(v.trim())) {
        cfg[k] = Number(v.trim());
        fixes.push(`coerced_insert_config_${k}_string_to_number`);
      }
    }
    if (
      typeof rawArgs.definition === "string" &&
      rawArgs.definition.includes("RollingTrack")
    ) {
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

    const def =
      typeof rawArgs.definition === "string"
        ? publicDefinitions.get(rawArgs.definition)
        : undefined;
    if (
      def?.configuration &&
      typeof def.configuration === "object" &&
      "properties" in def.configuration
    ) {
      const props = (def.configuration as Record<string, unknown>)
        .properties as Record<string, Record<string, unknown>>;
      for (const [propName, propSchema] of Object.entries(props || {})) {
        if (
          (propSchema.type === "number" || propSchema.type === "integer") &&
          typeof cfg[propName] === "number"
        ) {
          let val = cfg[propName] as number;
          if (
            propName.toLowerCase().includes("rate") &&
            typeof propSchema.maximum === "number" &&
            propSchema.maximum <= 1 &&
            val > 1
          ) {
            val = val / 100;
            fixes.push(`normalized_insert_${propName}_percent_to_decimal`);
          }
          if (
            typeof propSchema.minimum === "number" &&
            val < propSchema.minimum
          ) {
            fixes.push(`clamped_insert_config_${propName}_min`);
            val = propSchema.minimum;
          } else if (
            typeof propSchema.maximum === "number" &&
            val > propSchema.maximum
          ) {
            fixes.push(`clamped_insert_config_${propName}_max`);
            val = propSchema.maximum;
          }
          cfg[propName] = propSchema.type === "integer" ? Math.round(val) : val;
        }
      }
    }

    // 5. Clean extra keys outside ["definition", "version", "alias", "configuration"]
    for (const key of Object.keys(rawArgs)) {
      if (!["definition", "version", "alias", "configuration"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_insert_arg_${key}`);
      }
    }
  } else if (req.tool === "configure") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (typeof rawArgs.target === "string") {
      rawArgs.target = resolveRef(rawArgs.target);
    } else if (document && document.nodes.length > 0) {
      rawArgs.target = document.nodes[0].id;
      fixes.push("defaulted_configure_target");
    }

    if (
      !rawArgs.changes ||
      typeof rawArgs.changes !== "object" ||
      Array.isArray(rawArgs.changes)
    ) {
      const altChanges =
        rawArgs.parameters || rawArgs.config || rawArgs.settings || rawArgs.patch;
      if (altChanges && typeof altChanges === "object" && !Array.isArray(altChanges)) {
        rawArgs.changes = altChanges;
        fixes.push("normalized_parameters_to_changes");
      } else {
        const rootChanges: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rawArgs)) {
          if (k !== "target" && k !== "changes") {
            rootChanges[k] = v;
            delete rawArgs[k];
          }
        }
        if (Object.keys(rootChanges).length > 0) {
          rawArgs.changes = rootChanges;
          fixes.push("collected_root_arguments_into_changes");
        } else {
          rawArgs.changes = {};
        }
      }
    }

    const changes = rawArgs.changes as Record<string, unknown>;
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
        document.nodes.find((n) => n.id === rawArgs.target) ||
        document.nodes.find(
          (n) =>
            n.id.toLowerCase().endsWith(`/${String(rawArgs.target).toLowerCase().trim()}`) ||
            String(rawArgs.target).toLowerCase().trim().endsWith(`/${n.id.toLowerCase()}`),
        );
      if (targetNode) {
        rawArgs.target = targetNode.id;
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
              (propSchema.type === "number" || propSchema.type === "integer") &&
              typeof changes[propName] === "number"
            ) {
              let val = changes[propName] as number;
              if (
                propName.toLowerCase().includes("rate") &&
                typeof propSchema.maximum === "number" &&
                propSchema.maximum <= 1 &&
                val > 1
              ) {
                val = val / 100;
                fixes.push(`normalized_config_${propName}_percent_to_decimal`);
              }
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
              } else {
                changes[propName] = propSchema.type === "integer" ? Math.round(val) : val;
              }
            }
          }
        }
      }
    }

    // Clean extra keys outside ["target", "changes"]
    for (const key of Object.keys(rawArgs)) {
      if (!["target", "changes"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_config_arg_${key}`);
      }
    }
  } else if (req.tool === "add_control") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (typeof rawArgs.target === "string") {
      rawArgs.target = resolveRef(rawArgs.target);
    } else if (document && document.nodes.length > 0) {
      rawArgs.target = document.nodes[0].id;
      fixes.push("defaulted_control_target");
    }

    const validWidgets = [
      "slider",
      "number",
      "toggle",
      "select",
      "button",
      "stepper",
      "schema",
    ];
    const widgetCandidate = (rawArgs.widget || rawArgs.type || rawArgs.control_type) as string;
    if (typeof widgetCandidate === "string" && validWidgets.includes(widgetCandidate.toLowerCase())) {
      rawArgs.widget = widgetCandidate.toLowerCase();
    } else if (!rawArgs.widget || !validWidgets.includes(rawArgs.widget as string)) {
      rawArgs.widget = "slider";
      fixes.push("defaulted_control_widget_slider");
    }

    if (document) {
      const targetNode =
        document.nodes.find(
          (n) =>
            n.id === rawArgs.target ||
            n.id.endsWith(`/${rawArgs.target}`) ||
            n.id.includes(String(rawArgs.target)),
        ) || (document.nodes.length === 1 ? document.nodes[0] : undefined);
      if (targetNode) {
        const def = publicDefinitions.get(targetNode.definition);
        if (def && def.commands) {
          const availableCommands = Object.keys(def.commands);
          let cmd: (typeof def.commands)[string] | undefined =
            def.commands[rawArgs.command as string];

          const isCommandBindable = (cName: string) => {
            const cCmd = def.commands[cName];
            if (!cCmd) return false;
            const l = parameterLeaves(cCmd.arguments);
            if (l.length === 0) return true;
            return l.some((leaf) =>
              ["number", "integer", "boolean", "enum", "string"].includes(
                leaf.schema.type,
              ),
            );
          };

          if (cmd && !isCommandBindable(rawArgs.command as string)) {
            cmd = undefined;
          }

          if (!cmd && availableCommands.length > 0) {
            const bindableCommands = availableCommands.filter(isCommandBindable);
            const candidates = bindableCommands.length > 0 ? bindableCommands : availableCommands;
            const targetConcept = String(rawArgs.command || rawArgs.field || "")
              .toLowerCase()
              .replace(/^set:/, "")
              .replace(/[^a-z0-9]/g, "");

            // 1. Check if any command name contains targetConcept
            const nameMatch = candidates.find((c) => {
              const cClean = c.toLowerCase().replace(/[^a-z0-9]/g, "");
              return (
                cClean === targetConcept ||
                cClean.includes(targetConcept) ||
                (targetConcept.length > 3 && targetConcept.includes(cClean))
              );
            });

            // 2. Check if any command takes an argument leaf containing targetConcept
            const leafMatch = candidates.find((c) => {
              const leaves = parameterLeaves(def.commands[c].arguments);
              return leaves.some((l) =>
                l.path.toLowerCase().replace(/[^a-z0-9]/g, "").includes(targetConcept),
              );
            });

            const resolvedCmdName = nameMatch || leafMatch || candidates[0];
            if (resolvedCmdName) {
              fixes.push(
                `normalized_control_command_${rawArgs.command}_to_${resolvedCmdName}`,
              );
              rawArgs.command = resolvedCmdName;
              cmd = def.commands[resolvedCmdName];
            }
          }

          if (cmd) {
            const leaves = parameterLeaves(cmd.arguments);
            if (leaves.length === 1 && rawArgs.field !== leaves[0].path) {
              fixes.push(
                `normalized_control_field_${rawArgs.field}_to_${leaves[0].path}`,
              );
              rawArgs.field = leaves[0].path;
            } else if (
              leaves.length > 1 &&
              (!rawArgs.field || !leaves.some((l) => l.path === rawArgs.field))
            ) {
              const match = leaves.find(
                (l) =>
                  rawArgs.field &&
                  l.path.toLowerCase().includes(String(rawArgs.field).toLowerCase()),
              );
              if (match) {
                fixes.push(
                  `normalized_control_field_${rawArgs.field}_to_${match.path}`,
                );
                rawArgs.field = match.path;
              } else {
                rawArgs.field = leaves[0].path;
                fixes.push(`defaulted_control_field_${leaves[0].path}`);
              }
            }

            // Normalize widget to match schema type
            if (leaves.length === 0) {
              if (rawArgs.widget !== "button") {
                fixes.push(
                  `normalized_control_widget_${rawArgs.widget}_to_button_for_no_arg_command`,
                );
                rawArgs.widget = "button";
              }
              rawArgs.field = "";
            } else {
              if (rawArgs.widget === "button") {
                const targetLeaf =
                  leaves.find((l) => l.path === rawArgs.field) || leaves[0];
                if (targetLeaf.schema.type === "boolean") {
                  rawArgs.widget = "toggle";
                } else if (targetLeaf.schema.type === "enum") {
                  rawArgs.widget = "select";
                } else {
                  rawArgs.widget = "slider";
                }
                fixes.push(
                  `normalized_control_widget_button_to_${rawArgs.widget}`,
                );
              }
              const targetLeaf =
                leaves.find((l) => l.path === rawArgs.field) || leaves[0];
              if (targetLeaf) {
                if (
                  targetLeaf.schema.type === "enum" &&
                  rawArgs.widget !== "select"
                ) {
                  fixes.push(
                    `normalized_control_widget_${rawArgs.widget}_to_select_for_enum`,
                  );
                  rawArgs.widget = "select";
                } else if (
                  targetLeaf.schema.type === "boolean" &&
                  rawArgs.widget !== "toggle" &&
                  rawArgs.widget !== "button"
                ) {
                  fixes.push(
                    `normalized_control_widget_${rawArgs.widget}_to_toggle_for_boolean`,
                  );
                  rawArgs.widget = "toggle";
                }
              }
            }
          }
        }
      }
    }

    if (typeof rawArgs.field !== "string") {
      rawArgs.field = "";
    }

    if (typeof rawArgs.label !== "string" || !rawArgs.label.trim()) {
      rawArgs.label = humanize(String(rawArgs.field || rawArgs.command || "Control"));
      fixes.push("defaulted_control_label");
    }

    for (const key of Object.keys(rawArgs)) {
      if (!["target", "command", "field", "widget", "label"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_control_arg_${key}`);
      }
    }
  } else if (req.tool === "add_observation") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (!rawArgs.source && rawArgs.target) {
      rawArgs.source = rawArgs.target;
      delete rawArgs.target;
      fixes.push("normalized_observation_target_to_source");
    }
    if (typeof rawArgs.source === "string") {
      rawArgs.source = resolveRef(rawArgs.source);
    } else if (document && document.nodes.length > 0) {
      rawArgs.source = document.nodes[0].id;
      fixes.push("defaulted_observation_source");
    }

    if (document) {
      const sourceNode =
        document.nodes.find(
          (n) =>
            n.id === rawArgs.source ||
            n.id.endsWith(`/${rawArgs.source}`) ||
            n.id.includes(String(rawArgs.source)),
        ) || (document.nodes.length === 1 ? document.nodes[0] : undefined);
      if (sourceNode) {
        const def = publicDefinitions.get(sourceNode.definition);
        if (def) {
          const validOutputs = Object.entries(def.outputs)
            .filter(([_, port]) => port.kind === "value")
            .map(([k]) => k);
          if (rawArgs.output && !validOutputs.includes(rawArgs.output as string)) {
            const cleanOutput = String(rawArgs.output)
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const match = validOutputs.find((o) => {
              const oClean = o.toLowerCase().replace(/[^a-z0-9]/g, "");
              return (
                oClean === cleanOutput ||
                oClean.includes(cleanOutput) ||
                cleanOutput.includes(oClean)
              );
            });
            if (match) {
              fixes.push(
                `normalized_observation_output_${rawArgs.output}_to_${match}`,
              );
              rawArgs.output = match;
            } else if (validOutputs.length > 0) {
              rawArgs.output = validOutputs[0];
              fixes.push(`defaulted_observation_output_${validOutputs[0]}`);
            }
          } else if (!rawArgs.output && validOutputs.length > 0) {
            rawArgs.output = validOutputs[0];
            fixes.push(`defaulted_observation_output_${validOutputs[0]}`);
          }
          if (rawArgs.widget === "readout") {
            try {
              const runtime = new DocumentRuntime(document);
              const outputVal =
                runtime.getSnapshot().outputs[sourceNode.id]?.[
                  rawArgs.output as string
                ];
              if (
                typeof outputVal !== "number" &&
                rawArgs.output !== "board"
              ) {
                fixes.push(
                  "normalized_observation_widget_readout_to_inspector",
                );
                rawArgs.widget = "inspector";
              }
            } catch {
              if (sourceNode.definition === "models/BridgeResponse") {
                fixes.push(
                  "normalized_observation_widget_readout_to_inspector",
                );
                rawArgs.widget = "inspector";
              }
            }
          }
        }
      }
    }

    const validObsWidgets = [
      "readout",
      "inspector",
      "table",
      "graph",
      "histogram",
      "heatmap",
    ];
    const obsCandidate = (rawArgs.widget || rawArgs.type || rawArgs.observation_type) as string;
    if (
      typeof obsCandidate === "string" &&
      validObsWidgets.includes(obsCandidate.toLowerCase())
    ) {
      rawArgs.widget = obsCandidate.toLowerCase();
    } else if (
      !rawArgs.widget ||
      !validObsWidgets.includes(rawArgs.widget as string)
    ) {
      rawArgs.widget = "inspector";
      fixes.push("defaulted_observation_widget_inspector");
    }

    if (typeof rawArgs.label !== "string" || !rawArgs.label.trim()) {
      rawArgs.label = humanize(String(rawArgs.output || "Observation"));
      fixes.push("defaulted_observation_label");
    }

    for (const key of Object.keys(rawArgs)) {
      if (!["source", "output", "widget", "label"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_obs_arg_${key}`);
      }
    }
  } else if (req.tool === "connect") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (!rawArgs.from && rawArgs.source) {
      rawArgs.from = rawArgs.source;
      delete rawArgs.source;
      fixes.push("normalized_connect_source_to_from");
    }
    if (!rawArgs.to && rawArgs.target) {
      rawArgs.to = rawArgs.target;
      delete rawArgs.target;
      fixes.push("normalized_connect_target_to_to");
    }

    if (typeof rawArgs.from === "string") {
      const parts = (rawArgs.from as string).split(/[:.]/);
      rawArgs.from = { node: parts[0], port: parts[1] || "" };
      fixes.push("parsed_connect_from_string");
    }
    if (typeof rawArgs.to === "string") {
      const parts = (rawArgs.to as string).split(/[:.]/);
      rawArgs.to = { node: parts[0], port: parts[1] || "" };
      fixes.push("parsed_connect_to_string");
    }

    if (rawArgs.from && typeof rawArgs.from === "object") {
      const fromObj = rawArgs.from as Record<string, unknown>;
      if (typeof fromObj.node === "string")
        fromObj.node = resolveRef(fromObj.node);
    }
    if (rawArgs.to && typeof rawArgs.to === "object") {
      const toObj = rawArgs.to as Record<string, unknown>;
      if (typeof toObj.node === "string") toObj.node = resolveRef(toObj.node);
    }

    if (document) {
      const fromObj = rawArgs.from as Record<string, string> | undefined;
      const toObj = rawArgs.to as Record<string, string> | undefined;
      const fromNode = fromObj?.node
        ? document.nodes.find((n) => n.id === fromObj.node)
        : undefined;
      const toNode = toObj?.node
        ? document.nodes.find((n) => n.id === toObj.node)
        : undefined;
      const fromDef = fromNode
        ? publicDefinitions.get(fromNode.definition)
        : undefined;
      const toDef = toNode
        ? publicDefinitions.get(toNode.definition)
        : undefined;

      if (fromDef && toDef && fromObj && toObj) {
        const fromHasOutput =
          fromDef.outputs && fromObj.port in fromDef.outputs;
        const toHasOutput = toDef.outputs && toObj.port in toDef.outputs;
        const fromHasInput = fromDef.inputs && fromObj.port in fromDef.inputs;
        const toHasInput = toDef.inputs && toObj.port in toDef.inputs;

        if (!fromHasOutput && toHasOutput && fromHasInput && !toHasInput) {
          fixes.push("normalized_connect_swapped_from_and_to");
          const temp = rawArgs.from;
          rawArgs.from = rawArgs.to;
          rawArgs.to = temp;
        }
      }

      if (fromDef?.outputs && fromObj?.port) {
        const validOutputs = Object.keys(fromDef.outputs);
        if (!validOutputs.includes(fromObj.port)) {
          const match = validOutputs.find(
            (o) =>
              o.toLowerCase() ===
              fromObj.port.toLowerCase().replace(/_/g, ""),
          );
          if (match) {
            fixes.push(
              `normalized_connect_from_port_${fromObj.port}_to_${match}`,
            );
            fromObj.port = match;
          }
        }
      }
      if (toDef?.inputs && toObj?.port) {
        const validInputs = Object.keys(toDef.inputs);
        if (!validInputs.includes(toObj.port)) {
          const match = validInputs.find(
            (i) =>
              i.toLowerCase() ===
              toObj.port.toLowerCase().replace(/_/g, ""),
          );
          if (match) {
            fixes.push(
              `normalized_connect_to_port_${toObj.port}_to_${match}`,
            );
            toObj.port = match;
          }
        }
      }
    }

    for (const key of Object.keys(rawArgs)) {
      if (!["from", "to"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_connect_arg_${key}`);
      }
    }
  } else if (req.tool === "remove") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if ("target" in rawArgs && !("targets" in rawArgs)) {
      rawArgs.targets = [rawArgs.target];
      delete rawArgs.target;
      fixes.push("normalized_remove_target_to_targets");
    } else if (typeof rawArgs.targets === "string") {
      rawArgs.targets = [rawArgs.targets];
      fixes.push("normalized_remove_targets_string_to_array");
    } else if (!Array.isArray(rawArgs.targets)) {
      rawArgs.targets = [];
      fixes.push("defaulted_remove_targets_array");
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
    for (const key of Object.keys(rawArgs)) {
      if (!["targets"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_remove_arg_${key}`);
      }
    }
  } else if (req.tool === "arrange") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (rawArgs.preserveLocked !== true) {
      rawArgs.preserveLocked = true;
      fixes.push("normalized_preserve_locked_true");
    }
    const validTemplates = ["scene-with-sidebar", "comparison", "vertical"];
    if (
      typeof rawArgs.template !== "string" ||
      !validTemplates.includes(rawArgs.template as string)
    ) {
      rawArgs.template = "scene-with-sidebar";
      fixes.push("normalized_arrange_template");
    }
    for (const key of ["main", "controls", "results", "narrowOrder"] as const) {
      if (!Array.isArray(rawArgs[key])) {
        rawArgs[key] = [];
        fixes.push(`defaulted_arrange_${key}_array`);
      } else {
        rawArgs[key] = (rawArgs[key] as string[]).map(resolveRef);
      }
    }
    for (const key of Object.keys(rawArgs)) {
      if (
        ![
          "template",
          "main",
          "controls",
          "results",
          "narrowOrder",
          "preserveLocked",
        ].includes(key)
      ) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_arrange_arg_${key}`);
      }
    }
  } else if (req.tool === "set_lesson") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (!rawArgs.instruction && rawArgs.description) {
      rawArgs.instruction = rawArgs.description;
      delete rawArgs.description;
      fixes.push("normalized_description_to_instruction");
    }
    if (typeof rawArgs.title !== "string" || !rawArgs.title.trim()) {
      rawArgs.title = "Simulation Experiment";
      fixes.push("defaulted_lesson_title");
    }
    if (typeof rawArgs.instruction !== "string" || !rawArgs.instruction.trim()) {
      rawArgs.instruction = "Explore the experiment.";
      fixes.push("defaulted_lesson_instruction");
    }
    if (
      typeof rawArgs.explanation !== "string" ||
      !rawArgs.explanation.trim()
    ) {
      rawArgs.explanation = String(rawArgs.instruction || rawArgs.title);
      fixes.push("defaulted_lesson_explanation");
    }
    for (const key of Object.keys(rawArgs)) {
      if (!["title", "instruction", "explanation"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_lesson_arg_${key}`);
      }
    }
  } else if (req.tool === "regenerate_truss") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (typeof rawArgs.target === "string") {
      rawArgs.target = resolveRef(rawArgs.target);
    }
    if (rawArgs.spanScale !== 1 && rawArgs.spanScale !== 2) {
      rawArgs.spanScale = 1;
      fixes.push("defaulted_truss_spanScale_1");
    }
    if (typeof rawArgs.dense !== "boolean") {
      rawArgs.dense = false;
      fixes.push("defaulted_truss_dense_false");
    }
    for (const key of Object.keys(rawArgs)) {
      if (!["target", "spanScale", "dense"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_truss_arg_${key}`);
      }
    }
  } else if (req.tool === "insert_recipe") {
    if (!req.arguments || typeof req.arguments !== "object") {
      req.arguments = {} as never;
    }
    const rawArgs = req.arguments as Record<string, unknown>;
    if (typeof rawArgs.version !== "number") {
      rawArgs.version = 1;
      fixes.push("defaulted_recipe_version_1");
    }
    if (
      !rawArgs.overrides ||
      typeof rawArgs.overrides !== "object" ||
      Array.isArray(rawArgs.overrides)
    ) {
      rawArgs.overrides = {};
      fixes.push("defaulted_recipe_overrides");
    }
    for (const key of Object.keys(rawArgs)) {
      if (!["recipe", "version", "alias", "overrides"].includes(key)) {
        delete rawArgs[key];
        fixes.push(`stripped_extra_recipe_arg_${key}`);
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

  const { request: refRequest, fixes: refFixes } = normalizeReferences(
    normalized as ToolRequest,
    liveTargets,
    document,
  );
  allFixes.push(...refFixes);

  try {
    validateToolRequest(refRequest);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tool validation failed";
    issues.push(msg);
    onEvent?.("fixer.rejected", { error: msg, parsed: refRequest });
    return { request: null, action: "tool", fixes: allFixes, issues };
  }

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
