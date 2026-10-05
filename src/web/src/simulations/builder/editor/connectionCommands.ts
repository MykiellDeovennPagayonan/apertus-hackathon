import { publicDefinition } from "../../components/catalog";
import { schemaDefault } from "../../components/composites/catalog";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { Connection, Endpoint } from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";
import type { ExperimentDocument } from "../document";
import { resolveGraphEndpoint } from "../graph/authoredGraph";
import {
  connectionError,
  connectPorts,
  disconnectWire,
} from "../graph/deriveGraph";
import type { GraphWire } from "../graph/types";

export function connectDocument(
  doc: ExperimentDocument,
  source: Endpoint,
  target: Endpoint,
) {
  if (!doc.authored) {
    connectPorts(requireValue(doc.scene), source, target);
    return;
  }
  const from = resolveGraphEndpoint(doc, source),
    to = resolveGraphEndpoint(doc, target),
    d = doc.authored;
  const node = [...d.nodes, ...d.resources].find((n) => n.id === from.node);
  if (!node) throw new Error("Choose an existing component");
  const output = publicDefinition(node.definition).outputs[from.port];
  const kind: Connection["kind"] =
    output?.kind === "event"
      ? "command"
      : output?.kind === "attachment"
        ? "attachment"
        : "value";
  if (
    d.connections.some(
      (c) =>
        c.from.node === from.node &&
        c.from.port === from.port &&
        c.to.node === to.node &&
        c.to.port === to.port,
    )
  )
    return;
  if (
    kind === "command" &&
    publicDefinition(node.definition).category === "controls" &&
    node.configuration.initial === "{}"
  ) {
    const targetNode = d.nodes.find((n) => n.id === to.node);
    const command =
      targetNode && publicDefinition(targetNode.definition).commands[to.port];
    if (command)
      node.configuration.initial = JSON.stringify(
        schemaDefault(command.arguments),
      );
  }
  d.connections.push({
    id: `connection-${crypto.randomUUID()}`,
    from,
    to,
    kind,
  });
  validateAuthoredDocument(d);
}
export function documentConnectionError(
  doc: ExperimentDocument,
  from: Endpoint,
  to: Endpoint,
) {
  if (!doc.authored) return connectionError(requireValue(doc.scene), from, to);
  try {
    connectDocument(structuredClone(doc), from, to);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "These ports cannot connect";
  }
}
export function disconnectDocument(doc: ExperimentDocument, wire: GraphWire) {
  if (!doc.authored) {
    disconnectWire(requireValue(doc.scene), wire);
    return;
  }
  const from = resolveGraphEndpoint(doc, {
      node: wire.from,
      port: wire.fromPort,
    }),
    to = resolveGraphEndpoint(doc, { node: wire.to, port: wire.toPort });
  doc.authored.connections = doc.authored.connections.filter(
    (c) =>
      !(
        c.from.node === from.node &&
        c.from.port === from.port &&
        c.to.node === to.node &&
        c.to.port === to.port
      ),
  );
}
