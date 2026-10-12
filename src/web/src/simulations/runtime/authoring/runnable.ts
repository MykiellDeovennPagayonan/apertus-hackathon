import { IMPORTED_HTML } from "../imported/contract";
import { publicDefinition, publicDefinitions } from "../../components/catalog";
import { connectAuthored } from "./connections";
import { DocumentRuntime } from "./runtime";
import type { AuthoredDocument, Endpoint } from "./types";
import { validateAuthoredDocument, validateConnection } from "./validate";

export type CandidateConnection = {
  from: Endpoint;
  to: Endpoint;
  kind: "value" | "command" | "attachment";
  description: string;
};

/**
 * Finds valid potential connections between nodes in the document that are not yet connected.
 */
export function suggestConnections(
  document: AuthoredDocument,
): CandidateConnection[] {
  const candidates: CandidateConnection[] = [];
  const nodes = [...document.nodes, ...document.resources];
  const existingSet = new Set(
    document.connections.map(
      (c) => `${c.from.node}:${c.from.port}->${c.to.node}:${c.to.port}`,
    ),
  );

  // Map existing writers to check port cardinality
  const existingWriters = new Set<string>();
  for (const c of document.connections) {
    if (c.kind !== "command") {
      existingWriters.add(`${c.to.node}:${c.to.port}`);
    }
  }

  for (const source of nodes) {
    const srcDef = publicDefinition(source);
    if (!srcDef) continue;

    for (const [outPortName, outPort] of Object.entries(srcDef.outputs)) {
      for (const target of document.nodes) {
        if (target.id === source.id) continue;
        const tgtDef = publicDefinition(target);
        if (!tgtDef) continue;

        // 1. Check value and attachment connections
        for (const [inPortName, inPort] of Object.entries(tgtDef.inputs)) {
          const key = `${source.id}:${outPortName}->${target.id}:${inPortName}`;
          if (existingSet.has(key)) continue;

          // Check if target port already has a writer (unless cardinality is 'many')
          if (
            inPort.cardinality !== "many" &&
            existingWriters.has(`${target.id}:${inPortName}`)
          ) {
            continue;
          }

          // Kind match
          if (outPort.kind !== inPort.kind) continue;

          // Scope match (unless outPort has crossScope)
          if (source.scope !== target.scope && !outPort.crossScope) continue;

          // Unit compatibility
          if (
            inPort.unit !== "*" &&
            outPort.unit !== inPort.unit &&
            inPort.unit !== "" &&
            outPort.unit !== ""
          ) {
            continue;
          }

          // Test with validateConnection
          const connTest = {
            id: "probe-connection",
            from: { node: source.id, port: outPortName },
            to: { node: target.id, port: inPortName },
            kind: outPort.kind === "attachment" ? ("attachment" as const) : ("value" as const),
          };

          try {
            validateConnection(document, connTest);
            candidates.push({
              from: connTest.from,
              to: connTest.to,
              kind: connTest.kind,
              description: `${source.label || source.id}.${outPortName} → ${target.label || target.id}.${inPortName}`,
            });
          } catch {
            // Not a valid connection
          }
        }

        // 2. Check event -> command connections
        if (outPort.kind === "event") {
          for (const [cmdName, cmd] of Object.entries(tgtDef.commands)) {
            const key = `${source.id}:${outPortName}->${target.id}:${cmdName}`;
            if (existingSet.has(key)) continue;
            if (source.scope !== target.scope) continue;

            const connTest = {
              id: "probe-connection",
              from: { node: source.id, port: outPortName },
              to: { node: target.id, port: cmdName },
              kind: "command" as const,
            };

            try {
              validateConnection(document, connTest);
              candidates.push({
                from: connTest.from,
                to: connTest.to,
                kind: "command",
                description: `${source.label || source.id}.${outPortName} triggers ${target.label || target.id}.${cmdName}`,
              });
            } catch {
              // Not a valid command connection
            }
          }
        }
      }
    }
  }

  return candidates;
}

/**
 * Automatically wires unambiguous required inputs that have exactly one legal source in the document.
 */
export function autoConnectUnambiguous(document: AuthoredDocument): {
  document: AuthoredDocument;
  connected: CandidateConnection[];
} {
  let doc = structuredClone(document);
  const connected: CandidateConnection[] = [];
  let changed = true;
  let counter = 1;

  while (changed) {
    changed = false;
    const candidates = suggestConnections(doc);

    // Group candidates by target port
    const byTarget = new Map<string, CandidateConnection[]>();
    for (const c of candidates) {
      const key = `${c.to.node}:${c.to.port}`;
      const list = byTarget.get(key) || [];
      list.push(c);
      byTarget.set(key, list);
    }

    for (const [tgtKey, matches] of byTarget.entries()) {
      if (matches.length === 1) {
        const c = matches[0];
        const targetNode = doc.nodes.find((n) => n.id === c.to.node);
        if (!targetNode) continue;
        const tgtDef = publicDefinition(targetNode);
        const inPort = tgtDef?.inputs[c.to.port];

        // Connect if it's required (optional !== true) or attachment
        if (inPort && (inPort.optional !== true || inPort.kind === "attachment")) {
          const id = `auto_conn_${counter++}`;
          try {
            doc = connectAuthored(doc, c.from, c.to, id);
            connected.push(c);
            changed = true;
            break; // refresh candidate list after mutation
          } catch {
            // Skip if connection fails
          }
        }
      }
    }
  }

  return { document: doc, connected };
}

/**
 * Validates whether the document can be loaded and run as an interactive simulation.
 */
export function checkRunnable(document: AuthoredDocument): {
  runnable: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 1. Authoring document validation
  try {
    validateAuthoredDocument(document, true);
  } catch (err) {
    issues.push(err instanceof Error ? err.message : "Document validation failed");
  }

  // 2. Verify all non-optional inputs are connected
  const connectedInputs = new Set(
    document.connections.map((c) => `${c.to.node}:${c.to.port}`),
  );
  for (const node of document.nodes) {
    const def = publicDefinition(node);
    if (!def) {
      issues.push(`Node '${node.id}' uses unknown definition '${node.definition}'`);
      continue;
    }
    for (const [portName, port] of Object.entries(def.inputs)) {
      if (port.optional !== true && !connectedInputs.has(`${node.id}:${portName}`)) {
        issues.push(
          `Node '${node.label || node.id}' is missing required input '${portName}'`,
        );
      }
    }
  }

  // 3. At least one model node exists
  const hasModel = document.nodes.some((n) => {
    const def = publicDefinition(n);
    return def?.category === "models" || n.definition === IMPORTED_HTML;
  });
  if (!hasModel) {
    issues.push("Simulation contains no simulation model nodes");
  }

  // 4. Test headless runtime construction
  if (issues.length === 0) {
    try {
      const runtime = new DocumentRuntime(document);
      const snapshot = runtime.getSnapshot();
      if (!snapshot || !snapshot.state) {
        issues.push("Runtime snapshot failed to initialize");
      }
    } catch (err) {
      issues.push(
        `Runtime instantiation error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    runnable: issues.length === 0,
    issues,
  };
}
