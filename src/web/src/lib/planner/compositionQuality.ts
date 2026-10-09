import { publicDefinition } from "../../simulations/components/catalog";
import { compositionRequirements } from "../../simulations/components/catalog/explorationTeaching";
import type { AuthoredDocument } from "../../simulations/runtime/authoring/types";
export function compositionIssues(document: AuthoredDocument): string[] {
  const issues: string[] = [];
  const definitions = new Set(document.nodes.map((n) => n.definition));
  for (const node of document.nodes) {
    const requirements = compositionRequirements[node.definition];
    if (!requirements) continue;
    for (const command of requirements.commands)
      if (
        !document.connections.some(
          (c) =>
            c.kind === "command" &&
            c.to.node === node.id &&
            c.to.port === command,
        )
      )
        issues.push(`${node.id}: add a control for ${command}`);
    for (const output of requirements.observations)
      if (
        !document.connections.some(
          (c) =>
            c.kind === "value" &&
            c.from.node === node.id &&
            c.from.port === output &&
            publicDefinition(
              document.nodes.find((n) => n.id === c.to.node)?.definition ?? "",
            ).category === "displays",
        )
      )
        issues.push(`${node.id}: observe ${output}`);
    if (
      requirements.appearance &&
      !document.connections.some(
        (c) =>
          c.kind === "attachment" &&
          c.from.node === node.id &&
          c.to.port === "model" &&
          document.nodes.find((n) => n.id === c.to.node)?.definition ===
            requirements.appearance,
      )
    )
      issues.push(`${node.id}: attach ${requirements.appearance}`);
    for (const dependency of requirements.dependencies ?? [])
      if (!definitions.has(dependency))
        issues.push(`${node.id}: insert dependency ${dependency}`);
    if (
      requirements.minimumInstances &&
      document.nodes.filter((n) => n.definition === node.definition).length <
        requirements.minimumInstances
    )
      issues.push(
        `${node.id}: insert ${requirements.minimumInstances} independent instances`,
      );
  }
  for (const node of document.nodes.filter(
    (n) => n.definition === "data/SignalSuperposition",
  )) {
    const links = document.connections.filter(
      (c) => c.to.node === node.id && ["first", "second"].includes(c.to.port),
    );
    if (links.length !== 2 || new Set(links.map((c) => c.from.node)).size !== 2)
      issues.push(
        `${node.id}: connect TWO independent signals to first and second`,
      );
  }
  return [...new Set(issues)];
}
