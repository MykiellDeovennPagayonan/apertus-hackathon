import { publicDefinition } from "../../components/catalog";
import { schemaDefault } from "../../components/composites/catalog";
import { acceptedCommandArguments } from "../../components/controls/commandPresentation";
import { reconcileBoard } from "./board";
import { DocumentRuntime } from "./runtime";
import type { AuthoredDocument, Connection, Endpoint } from "./types";
import { validateAuthoredDocument } from "./validate";

/** Canonical endpoints only; graph projection belongs to the calling UI. */
export function connectAuthored(
  document: AuthoredDocument,
  from: Endpoint,
  to: Endpoint,
  id: string,
  joinCanvasScope = false,
) {
  const next = structuredClone(document);
  const source =
    next.nodes.find((node) => node.id === from.node) ??
    next.resources.find((node) => node.id === from.node);
  const target = next.nodes.find((node) => node.id === to.node);
  if (!source || !target)
    throw new Error("Choose existing connection endpoints");
  const output = publicDefinition(source.definition).outputs[from.port];
  const kind: Connection["kind"] =
    output?.kind === "event"
      ? "command"
      : output?.kind === "attachment"
        ? "attachment"
        : "value";
  if (
    next.connections.some(
      (c) =>
        c.from.node === from.node &&
        c.from.port === from.port &&
        c.to.node === to.node &&
        c.to.port === to.port,
    )
  )
    return next;
  if (
    kind === "command" &&
    publicDefinition(source.definition).category === "controls" &&
    source.configuration.initial === "{}"
  ) {
    const contract = publicDefinition(target.definition).commands[to.port];
    if (contract) {
      const snapshot = new DocumentRuntime(document).getSnapshot();
      source.configuration.initial = JSON.stringify(
        acceptedCommandArguments(to.port, snapshot.state[target.id]) ??
          schemaDefault(contract.arguments),
      );
    }
  }
  if (
    joinCanvasScope &&
    kind === "attachment" &&
    to.port === "objects" &&
    publicDefinition(target.definition).category === "canvases" &&
    publicDefinition(target.definition).inputs.objects?.unit === output?.unit &&
    source.scope !== target.scope
  ) {
    const old = source.scope;
    for (const node of [...next.nodes, ...next.resources])
      if (node.scope === old) node.scope = target.scope;
    next.scopes = next.scopes.filter((scope) => scope.id !== old);
  }
  next.connections.push({
    id,
    from: structuredClone(from),
    to: structuredClone(to),
    kind,
  });
  reconcileBoard(next);
  validateAuthoredDocument(next);
  return next;
}

export function disconnectAuthored(
  document: AuthoredDocument,
  from: Endpoint,
  to: Endpoint,
) {
  const next = structuredClone(document);
  next.connections = next.connections.filter(
    (c) =>
      !(
        c.from.node === from.node &&
        c.from.port === from.port &&
        c.to.node === to.node &&
        c.to.port === to.port
      ),
  );
  validateAuthoredDocument(next);
  return next;
}
