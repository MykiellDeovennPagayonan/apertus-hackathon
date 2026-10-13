import { publicDefinition } from "../../../registry/index";
import {
  automaticGraphPositions,
  graphRole,
} from "../../authoring-engine/presentation/graphLayout";
import type { AuthoredDocument } from "../../authoring-engine/document";
import { emptyLayout } from "../../authoring-engine/document";
import { validateAuthoredDocument } from "../../validator/document";
import {
  CONSTRUCTION_EVENT_LIMIT,
  type ConstructionPhase,
  type ConstructionSink,
  constructionPhases,
} from "./contracts";

/** A projection of accepted transaction state. It never mutates the transaction. */
export class ConstructionPublisher {
  private sequence = 0;
  private previous: AuthoredDocument;
  private wiring = false;
  private revision = 0;
  get latestRevision() {
    return this.revision;
  }
  constructor(
    private readonly requestId: string,
    initial: AuthoredDocument,
    private readonly sink: ConstructionSink,
    private readonly signal: AbortSignal,
  ) {
    this.previous = structuredClone(initial);
  }

  async publish(
    document: AuthoredDocument,
    revision: number,
    phase?: ConstructionPhase,
  ) {
    this.signal.throwIfAborted();
    validateAuthoredDocument(document);
    if (revision < this.revision)
      throw new Error("Construction revision regressed");
    this.revision = revision;
    const priorNodes = new Map(
      [...this.previous.nodes, ...this.previous.resources].map((n) => [
        n.id,
        n,
      ]),
    );
    const additions = [...document.resources, ...document.nodes].filter(
      (n) => !priorNodes.has(n.id),
    );
    if (additions.length) {
      // Expand an atomic recipe into valid partial presentation states while inference is active.
      const visible = new Set(priorNodes.keys());
      for (const node of additions) {
        visible.add(node.id);
        const partial = this.project(document, visible);
        await this.send(partial, revision, "components", [node.id]);
      }
    }
    if (phase === "arrangement" || phase === "checking") this.wiring = true;
    const next = this.project(document);
    if (this.wiring) {
      const connections = document.connections.filter(
        (c) => !this.previous.connections.some((p) => p.id === c.id),
      );
      const visibleConnections = new Set(
        this.previous.connections.map((c) => c.id),
      );
      for (const connection of connections) {
        visibleConnections.add(connection.id);
        await this.send(
          {
            ...next,
            connections: document.connections.filter((c) =>
              visibleConnections.has(c.id),
            ),
          },
          revision,
          "connections",
          [],
          [connection.id],
        );
      }
    }
    const changed = [...document.nodes, ...document.resources]
      .filter(
        (n) =>
          priorNodes.has(n.id) &&
          JSON.stringify(priorNodes.get(n.id)) !== JSON.stringify(n),
      )
      .map((n) => n.id);
    if (phase === "arrangement" || phase === "checking") {
      const positioned = this.arrange(document);
      await this.send(positioned, revision, phase, changed);
    } else if (
      changed.length ||
      JSON.stringify(next) !== JSON.stringify(this.previous)
    ) {
      await this.send(
        next,
        revision,
        this.wiring ? "connections" : "components",
        changed,
      );
    }
  }

  private project(
    document: AuthoredDocument,
    visible?: Set<string>,
  ): AuthoredDocument {
    const next = structuredClone(document);
    if (visible) {
      next.nodes = next.nodes.filter((n) => visible.has(n.id));
      next.resources = next.resources.filter((n) => visible.has(n.id));
    }
    const ids = new Set([...next.nodes, ...next.resources].map((n) => n.id));
    const oldConnections = new Set(this.previous.connections.map((c) => c.id));
    next.connections = next.connections.filter(
      (c) =>
        ids.has(c.from.node) &&
        ids.has(c.to.node) &&
        (this.wiring || oldConnections.has(c.id)),
    );
    // Incomplete lesson layout/groups can reference nodes not inserted yet. Show safe placeholders.
    next.layout = emptyLayout();
    next.groups = [];
    next.presentation = { mode: "flow" };
    next.editor.positions = {};
    for (const node of [...next.nodes, ...next.resources]) {
      const previous = this.previous.editor.positions[node.id];
      const authored = document.editor.positions[node.id];
      next.editor.positions[node.id] = previous ??
        authored ?? {
          x: 48 + (Object.keys(next.editor.positions).length % 3) * 350,
          y:
            80 +
            Math.floor(Object.keys(next.editor.positions).length / 3) * 500,
        };
    }
    return next;
  }

  private arrange(document: AuthoredDocument): AuthoredDocument {
    const next = structuredClone(document);
    const blocks = [...next.nodes, ...next.resources].map((node) => {
      const definition = publicDefinition(node.definition);
      return {
        id: node.id,
        kind: graphRole[definition.category],
        inputs: [
          ...Object.keys(definition.inputs),
          ...Object.keys(definition.commands),
        ],
        outputs: Object.keys(definition.outputs),
      };
    });
    const positions = automaticGraphPositions(blocks);
    for (const [id, position] of Object.entries(positions))
      next.editor.positions[id] ??= position;
    for (const group of next.groups) {
      const member = group.members.find((id) => next.editor.positions[id]);
      if (member)
        next.editor.positions[group.id] ??= next.editor.positions[member];
    }
    return next;
  }

  private async send(
    document: AuthoredDocument,
    draftRevision: number,
    phase: ConstructionPhase,
    nodes: string[] = [],
    connections: string[] = [],
  ) {
    this.signal.throwIfAborted();
    if (++this.sequence > CONSTRUCTION_EVENT_LIMIT)
      throw new Error("Construction event budget exceeded");
    validateAuthoredDocument(document);
    const node =
      nodes.length === 1 &&
      [...document.nodes, ...document.resources].find((n) => n.id === nodes[0]);
    const activity =
      node && phase === "components"
        ? `Adding ${publicDefinition(node.definition).title.slice(0, 120)}…`
        : constructionPhases[phase];
    await this.sink(
      {
        type: "construction",
        requestId: this.requestId,
        sequence: this.sequence,
        draftRevision,
        phase,
        document,
        affected: { nodes, connections },
        activity,
      },
      this.signal,
    );
    this.previous = structuredClone(document);
  }

  /** Final graph positions must also be present in the authoritative committed document. */
  finalize(document: AuthoredDocument) {
    return this.arrange(document);
  }
}
