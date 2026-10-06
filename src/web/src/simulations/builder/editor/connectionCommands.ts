import {
  connectAuthored,
  disconnectAuthored,
} from "../../runtime/authoring/connections";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { Endpoint } from "../../runtime/authoring/types";
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
  doc.authored = connectAuthored(
    doc.authored,
    resolveGraphEndpoint(doc, source),
    resolveGraphEndpoint(doc, target),
    `connection-${crypto.randomUUID()}`,
    true,
  );
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
  doc.authored = disconnectAuthored(doc.authored, from, to);
}
