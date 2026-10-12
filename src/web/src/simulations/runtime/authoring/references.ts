import { publicDefinition } from "../../components/catalog";
import type { ComponentInstance } from "./types";
/** Schema-declared paths support array items without guessing which strings are identities. */
export function visitConfigurationReferences(
  node: ComponentInstance,
  visit: (
    record: Record<string, unknown>,
    key: string,
    definition: string,
  ) => void,
) {
  for (const [path, definition] of Object.entries(
    publicDefinition(node).configurationReferences ?? {},
  )) {
    const walk = (value: unknown, parts: string[]) => {
      if (!value || typeof value !== "object") return;
      const [part, ...rest] = parts;
      if (part === "*") {
        if (Array.isArray(value)) for (const item of value) walk(item, rest);
        return;
      }
      const record = value as Record<string, unknown>;
      if (rest.length) walk(record[part], rest);
      else visit(record, part, definition);
    };
    walk(node.configuration, path.split("."));
  }
}
