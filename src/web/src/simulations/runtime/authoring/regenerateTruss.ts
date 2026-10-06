import { trussNodes } from "../../components/composites/spatial";
import { removeNodes } from "./recipes";
import { requireValue } from "./requireValue";
import { DocumentRuntime } from "./runtime";
import type { AuthoredDocument } from "./types";
import { validateAuthoredDocument } from "./validate";
/** Prepare a complete replacement before committing it as one history operation. */
export function regenerateTruss(
  document: AuthoredDocument,
  id: string,
  spanScale: number,
  dense: boolean,
  allocate: (id: string) => string,
) {
  const response = document.nodes.find(
    (n) => n.id === id && n.definition === "models/BridgeResponse",
  );
  if (!response) throw new Error("Select a bridge response to regenerate");
  const old = new Set(
    document.connections
      .filter(
        (c) => c.to.node === id && ["joints", "members"].includes(c.to.port),
      )
      .map((c) => c.from.node),
  );
  if (
    document.connections.some(
      (c) => (old.has(c.from.node) || old.has(c.to.node)) && c.to.node !== id,
    )
  )
    throw new Error(
      "Disconnect external truss bindings before replacing this topology",
    );
  if (
    document.nodes.some(
      (n) =>
        !old.has(n.id) &&
        Object.values(n.configuration).some(
          (v) => typeof v === "string" && old.has(v),
        ),
    )
  )
    throw new Error(
      "A component outside this truss still references its topology",
    );
  const next = removeNodes(document, [...old]),
    model = requireValue(next.nodes.find((n) => n.id === id));
  model.configuration = { spanScale, dense };
  const nodes = trussNodes(model, allocate);
  next.nodes.push(...nodes);
  for (const n of nodes)
    next.connections.push({
      id: allocate(`link/${n.id}`),
      kind: "value",
      from: { node: n.id, port: "data" },
      to: {
        node: id,
        port: n.definition === "models/TrussJoint" ? "joints" : "members",
      },
    });
  for (const group of next.groups)
    if (group.members.includes(id))
      group.members.push(...nodes.map((n) => n.id));
  validateAuthoredDocument(next);
  new DocumentRuntime(next);
  return { document: next, removed: old.size, added: nodes.length };
}
