import { parseStageJson } from "./context";

/** Remove only a stray parenthesis after a closed string value, never inside it.
 * This is a syntax-only repair; truncated JSON and unexpected values still fail.
 */
export function parseArgumentJson(content: string) {
  let quoted = false;
  let escaped = false;
  let cleaned = "";
  let removed = 0;
  for (let i = 0; i < content.length; i++) {
    const character = content[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (
      character === ")" &&
      cleaned.trimEnd().endsWith('"') &&
      /^\s*[},]/.test(content.slice(i + 1))
    ) {
      removed++;
      if (removed > 2) throw new Error("Excessive JSON syntax repairs");
      continue;
    }
    cleaned += character;
  }
  return { value: parseStageJson(cleaned), removed };
}
