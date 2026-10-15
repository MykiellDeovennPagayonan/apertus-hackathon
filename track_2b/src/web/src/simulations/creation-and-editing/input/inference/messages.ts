import { AUTHORING_INSTRUCTIONS } from "./prompts";
import type { Message } from "./transport";
import type { TeachingIntent } from "../../intent-interpreter/contracts";

/** Decode strictly; structural inspection only explains a rejection for the fresh repair. */
export function parseStageJson(
  content: string,
  root: "object" | "array" = "object",
): unknown {
  if (!content.trimStart().startsWith(root === "array" ? "[" : "{"))
    throw new Error(
      `Expected one JSON ${root}. Begin with ${root === "array" ? "[ and end with ]. The batch contains exactly one argument object" : "{ and end with }"}. Return only the stage schema.`,
    );
  try {
    return JSON.parse(content);
  } catch (error) {
    const stack: string[] = [];
    let quoted = false;
    let escaped = false;
    for (let index = 0; index < content.length; index++) {
      const character = content[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') quoted = false;
        continue;
      }
      if (character === '"') quoted = true;
      else if (character === "{" || character === "[") stack.push(character);
      else if (character === "}" || character === "]") {
        const expected = stack.at(-1) === "{" ? "}" : "]";
        if (character !== expected)
          throw new Error(
            `Invalid JSON nesting at character ${index}: close ${expected} before ${character}. Close every nested object before its containing array or object.`,
          );
        stack.pop();
        if (!stack.length && content.slice(index + 1).trim())
          throw new Error(
            `Unexpected trailing ${JSON.stringify(
              content
                .slice(index + 1)
                .trim()
                .slice(0, 80),
            )} after the complete JSON ${root}. Stop immediately after the root ${root === "array" ? "]" : "}"}; do not append extra brackets.`,
          );
      }
    }
    throw error;
  }
}

/** A stage is fresh context, never a transcript, complete document, or topology dump. */
export function stageMessages(
  stage: string,
  prompt: string,
  contract: unknown,
  intent?: TeachingIntent,
  relevant?: unknown,
): Message[] {
  const data = {
    task: stage,
    originalRequest: prompt,
    ...(intent ? { acceptedIntent: intent } : {}),
    contract,
    ...(relevant ? { relevant } : {}),
  };
  const user = JSON.stringify(data);
  if (user.length > 24000)
    throw new Error("Stage context exceeds its bounded input size");
  return [
    { role: "system", content: AUTHORING_INSTRUCTIONS },
    { role: "user", content: user },
  ];
}
