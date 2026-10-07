function formatFieldLabel(rawPath: string): string {
  const p = rawPath.trim();
  if (p === "coverage.covered") return "Covered topics";
  if (p === "coverage.omitted") return "Omitted topics";
  if (p === "coverage.explanation") return "Explanation";
  if (p === "identity") return "Identifier";

  const segments = p.split(/[.[\]]/).filter(Boolean);
  if (segments.length === 0) return "";
  const last = segments[segments.length - 1];
  if (/^\d+$/.test(last) && segments.length > 1) {
    const prev = segments[segments.length - 2];
    return `${humanizeCamel(prev)} (item ${Number(last) + 1})`;
  }
  return humanizeCamel(last);
}

function humanizeCamel(str: string): string {
  const spaced = str
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return str;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatSingleDetail(line: string): string {
  let cleaned = line.trim();

  // 1. Strip internal debug wrappers and technical prefixes
  cleaned = cleaned
    .replace(/^Apertus returned invalid stage arguments:\s*/i, "")
    .replace(
      /^Apertus returned no response body\.?\s*/i,
      "The AI generator did not return a response. ",
    )
    .replace(
      /^No valid Apertus result\.?\s*/i,
      "The AI generator did not return a valid response. ",
    )
    .replace(/^Apertus request cancelled\.?\s*/i, "The request was cancelled. ")
    .replace(/^Apertus timed out\.?\s*/i, "The request timed out. ")
    .replace(/^Unable to construct a valid lesson:\s*/i, "")
    .replace(/^Unable to process the prompt:\s*/i, "")
    .replace(/^(?:Error|PlannerError):\s*/i, "")
    .trim();

  // 2. Authoring / simulation binding errors translated to sensible layman language
  if (
    /^A numeric readout cannot display a structured or unavailable output$/i.test(
      cleaned,
    )
  ) {
    return "This measurement contains multiple data points and cannot be shown on a single number readout.";
  }
  if (/^Widget does not accept this command field$/i.test(cleaned)) {
    return "This control type cannot be used for that simulation setting.";
  }
  if (/^(?:Unknown|Missing) control target$/i.test(cleaned)) {
    return "The target simulation component could not be found.";
  }
  if (/^Unsupported command$/i.test(cleaned)) {
    return "That action is not supported by this simulation component.";
  }
  if (/^This decision already has a learner control$/i.test(cleaned)) {
    return "A control for this setting is already present in the simulation.";
  }
  if (/^An action with arguments needs a bound field control$/i.test(cleaned)) {
    return "This action requires an adjustable control to set its values.";
  }
  if (/^Unknown observation source$/i.test(cleaned)) {
    return "The measurement source component could not be found.";
  }
  if (/^Observation requires a declared value output$/i.test(cleaned)) {
    return "This component does not provide that measurement output.";
  }
  if (
    /^Document exceeds storage budget$/i.test(cleaned) ||
    /^Inference response exceeds bounds$/i.test(cleaned) ||
    /^Output was truncated/i.test(cleaned)
  ) {
    return "The requested lesson is too large for this workspace.";
  }
  if (/^The request exceeded its inference budget$/i.test(cleaned)) {
    return "The planner took too many steps to generate this lesson. Try asking for one change at a time.";
  }
  if (/^Cannot reach local Ollama/i.test(cleaned)) {
    return "Cannot connect to Ollama. Make sure the local Ollama service is running.";
  }
  if (/^Cannot reach (?:local|hosted) Apertus/i.test(cleaned)) {
    return "Cannot connect to the AI service. Please verify the inference endpoint.";
  }
  if (
    /^(?:Apertus|Planner) timed out\.?\s*(?:Please try again\.?)?$/i.test(
      cleaned,
    )
  ) {
    return "The request timed out. Please try again.";
  }
  if (
    /^(?:Apertus|Planner) is busy\.?\s*(?:Please try again shortly\.?)?$/i.test(
      cleaned,
    )
  ) {
    return "The AI planner is busy. Please try again in a few moments.";
  }
  if (
    /^Inference context exceeds stage bounds/i.test(cleaned) ||
    /^Inference input plus output reserve exceeds/i.test(cleaned)
  ) {
    return "The lesson has too much information to process at once. Try a simpler prompt.";
  }
  if (/^Inconsistent coverage$/i.test(cleaned)) {
    return "The simulation coverage could not be verified.";
  }
  if (
    /^Constraint source text must occur in the original request$/i.test(cleaned)
  ) {
    return "All requested constraints must refer to phrases from your prompt.";
  }
  if (/^No supported teaching model in result$/i.test(cleaned)) {
    return "Couldn't find a matching teaching model for this experiment.";
  }
  if (/^Teaching model has no visible effect$/i.test(cleaned)) {
    return "The simulation model has no interactive effect connected.";
  }
  if (/^Selected capability was not constructed$/i.test(cleaned)) {
    return "The requested experiment could not be built with available components.";
  }

  // 3. Schema validation path-based errors
  let path = "";
  let message = cleaned;
  const colonIdx = cleaned.indexOf(":");
  if (colonIdx > 0 && !cleaned.slice(0, colonIdx).includes(" ")) {
    path = cleaned.slice(0, colonIdx).trim();
    message = cleaned.slice(colonIdx + 1).trim();
  }

  const label = path ? formatFieldLabel(path) : "";

  // Array range: expected 0–12 items, expected 1-5 items
  const arrayMatch = message.match(
    /^expected\s+(\d+)\s*(?:[–—]|\s+to\s+|-)\s*(\d+)\s+items$/i,
  );
  if (arrayMatch) {
    const min = Number(arrayMatch[1]);
    const max = Number(arrayMatch[2]);
    const phrase =
      min === 0
        ? `can't be too high or can't be too low (can't have more than ${max} items)`
        : `can't be too high or can't be too low (must have between ${min} and ${max} items)`;
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  // Number/Integer range: expected number/integer min–max [unit]
  const numMatch = message.match(
    /^expected\s+(number|integer)\s+(-?\d+(?:\.\d+)?)\s*(?:[–—]|\s+to\s+|-)\s*(-?\d+(?:\.\d+)?)(?:\s+(.*))?$/i,
  );
  if (numMatch) {
    const isInt = numMatch[1].toLowerCase() === "integer";
    const min = numMatch[2];
    const max = numMatch[3];
    const unit = numMatch[4]?.trim();
    const unitStr = unit ? ` ${unit}` : "";
    const intStr = isInt ? "a whole number " : "";
    const phrase = `can't be too high or can't be too low (must be ${intStr}between ${min} and ${max}${unitStr})`;
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  // Finite value range: expected a finite value from min to max
  const finiteMatch = message.match(
    /^expected\s+a\s+finite\s+value\s+from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)$/i,
  );
  if (finiteMatch) {
    const min = finiteMatch[1];
    const max = finiteMatch[2];
    const phrase = `can't be too high or can't be too low (must be between ${min} and ${max})`;
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  // Boolean: expected boolean, expected true or false
  if (/^expected\s+(?:boolean|true or false)$/i.test(message)) {
    const phrase = "must be either on or off (yes or no)";
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  // Enum: expected one of foo, bar, baz
  const enumMatch = message.match(/^expected\s+one\s+of\s+(.+)$/i);
  if (enumMatch) {
    const phrase = `must be one of: ${enumMatch[1]}`;
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  // Unknown field: unknown field foo
  const unknownFieldMatch = message.match(/^unknown\s+field\s+(.+)$/i);
  if (unknownFieldMatch) {
    const phrase = `unrecognized setting '${unknownFieldMatch[1]}'`;
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  // String: unknown or invalid string
  if (/^unknown\s+or\s+invalid\s+string$/i.test(message)) {
    const phrase = "must be a valid text entry";
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  // Expected object / finite JSON data
  if (/^expected\s+(?:an?\s+)?(?:object|finite JSON data)$/i.test(message)) {
    const phrase = "must be a valid configuration group";
    return label ? `${label}: ${phrase}.` : `${capitalize(phrase)}.`;
  }

  if (label) return `${label}: ${message}`;
  return cleaned;
}

export function formatLaymanStatus(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();

  // Preserve test fixtures & standard user-friendly responses
  if (
    trimmed === "Fixture timeout" ||
    trimmed.startsWith("Stopped —") ||
    trimmed.startsWith("Ready") ||
    trimmed.startsWith("Starting lesson") ||
    trimmed.startsWith("Action applied") ||
    trimmed.startsWith("Premade experiment") ||
    trimmed.startsWith("Working out") ||
    trimmed.startsWith("Building your") ||
    trimmed.startsWith("Checking your") ||
    trimmed.startsWith("That change is outside") ||
    trimmed === "Please try again."
  ) {
    return trimmed;
  }

  // Minimize technical / debug errors into concise sensible status messages
  if (/readout|inspector|observation/i.test(trimmed)) {
    return "Couldn't add that measurement display.";
  }
  if (/control|slider|widget|button|toggle|parameter/i.test(trimmed)) {
    return "Couldn't add that simulation control.";
  }
  if (/timeout|timed out/i.test(trimmed)) {
    return "Request timed out. Please try again.";
  }
  if (/busy/i.test(trimmed)) {
    return "System busy. Please try again shortly.";
  }
  if (/cannot reach|ollama|endpoint/i.test(trimmed)) {
    return "AI service is offline.";
  }
  if (/storage|quota|exceeds bounds|too large/i.test(trimmed)) {
    return "Workspace storage limit reached.";
  }
  if (/cancelled|abort/i.test(trimmed)) {
    return "Request was cancelled.";
  }
  if (
    /Apertus returned|invalid stage arguments|inference budget|schema mismatch|JSON response|syntax error/i.test(
      trimmed,
    )
  ) {
    return "Couldn't complete that simulation change.";
  }

  // If the error message is long or contains syntax/debug characters
  if (trimmed.length > 60 || /[{}()[\]_:]/.test(trimmed)) {
    return "Couldn't complete that simulation change.";
  }

  return trimmed;
}

export function formatLaymanDetails(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  return lines.map(formatSingleDetail).join("\n");
}
