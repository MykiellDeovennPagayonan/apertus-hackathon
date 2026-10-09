import { publicDefinition } from "../../components/catalog";
import { schemaDefault } from "../../components/composites/catalog";
import { acceptedCommandArguments } from "../../components/controls/commandPresentation";
import {
  scalarControls,
  validateScalarValue,
  writeParameter,
} from "../../components/controls/controlContract";
import { fractionValue } from "../../components/systems/ComposedFractionSystem";
import { compare } from "../../components/systems/fractionMath";
import { lineIntersection } from "../../components/systems/LineIntersectionSystem";
import type {
  FractionObject,
  LineObject,
} from "../../components/traits/SceneObjects";
import { AgentEffects } from "../agents/client";
import type { ActionResult } from "../commands";
import { validateValue } from "../parameterSchema";
import { runtimeProvider } from "./providers";
import type { AuthoredDocument } from "./types";
import { validateAuthoredDocument } from "./validate";
export type Snapshot = {
  state: Record<string, Record<string, unknown>>;
  outputs: Record<string, Record<string, unknown>>;
};
export type ScopedCommand = {
  node: string;
  command: string;
  arguments: Record<string, unknown>;
};
/** Owns one document's state. Renderers never initialize or step model instances. */
export class DocumentRuntime {
  document: AuthoredDocument;
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private interactionListeners = new Set<() => void>();
  private effects = new AgentEffects(
    () => this.snapshot,
    () => this.document,
    (node, generation, patch) => {
      if (this.snapshot.state[node]?.generation !== generation) return;
      const staged = structuredClone(this.snapshot);
      Object.assign(staged.state[node], patch);
      this.commit(staged);
      for (const listener of this.interactionListeners) listener();
    },
  );
  dispose() {
    this.effects.dispose();
    this.listeners.clear();
    this.interactionListeners.clear();
  }
  activateEffects() {
    this.effects.activate();
  }
  subscribeInteractions = (listener: () => void) => {
    this.interactionListeners.add(listener);
    return () => {
      this.interactionListeners.delete(listener);
    };
  };
  constructor(
    document: AuthoredDocument,
    private delegate?: (commands: ScopedCommand[]) => ActionResult,
  ) {
    validateAuthoredDocument(document);
    this.document = structuredClone(document);
    this.snapshot = { state: {}, outputs: {} };
    for (const n of [...document.nodes, ...document.resources]) {
      const provider = runtimeProvider(n);
      if (provider) this.snapshot.state[n.id] = provider.initialize(n);
    }
    this.observe(this.snapshot);
  }
  adoptSnapshot(snapshot: Snapshot) {
    this.snapshot = structuredClone(snapshot);
    for (const listener of this.listeners) listener();
  }
  updateDocument(document: AuthoredDocument) {
    validateAuthoredDocument(document);
    const staged: Snapshot = { state: {}, outputs: {} };
    for (const n of [...document.nodes, ...document.resources]) {
      const p = runtimeProvider(n);
      if (!p) continue;
      const previous = [
        ...this.document.nodes,
        ...this.document.resources,
      ].find((old) => old.id === n.id);
      const def = publicDefinition(n.definition);
      const authored = (config: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(config).filter(
            ([key]) => !def.lifecycle.presentation.includes(key),
          ),
        );
      const same =
        previous?.definition === n.definition &&
        previous.scope === n.scope &&
        JSON.stringify(authored(previous.configuration)) ===
          JSON.stringify(authored(n.configuration));
      staged.state[n.id] = same
        ? structuredClone(this.snapshot.state[n.id])
        : p.initialize(n);
      if (same && def.lifecycle.presentation.length)
        for (const key of def.lifecycle.presentation)
          if (Object.hasOwn(n.configuration, key))
            staged.state[n.id][key] = structuredClone(n.configuration[key]);
    }
    const previousDocument = this.document;
    this.document = structuredClone(document);
    try {
      this.commit(staged);
      this.effects.reconcile();
    } catch (error) {
      this.document = previousDocument;
      throw error;
    }
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private observe(staged: Snapshot) {
    const finite = (value: unknown): unknown => {
      if (typeof value === "number" && !Number.isFinite(value))
        return {
          status: "unavailable",
          reason: "Undefined for this model configuration",
        };
      if (Array.isArray(value)) return value.map(finite);
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value).map(([key, v]) => [key, finite(v)]),
        );
      return value;
    };
    const visited = new Set<string>();
    const evaluate = (n: import("./types").ComponentInstance) => {
      if (visited.has(n.id)) return;
      const inputs: Record<string, unknown[]> = {};
      for (const c of this.document.connections.filter(
        (c) => c.kind === "value" && c.to.node === n.id,
      )) {
        const source = [
          ...this.document.nodes,
          ...this.document.resources,
        ].find((node) => node.id === c.from.node);
        if (source) evaluate(source);
        const def = publicDefinition(n.definition),
          input = def.inputs[c.to.port],
          provider = runtimeProvider(n);
        const value = staged.outputs[c.from.node]?.[c.from.port];
        inputs[c.to.port] ??= [];
        inputs[c.to.port].push(value);
        if (provider && !provider.synchronize && def.category === "models") {
          if (input.schema) validateValue(input.schema, value, `${c.id}.value`);
          staged.state[n.id] = provider.apply(
            staged.state[n.id],
            `set:${c.to.port}`,
            { value },
            n,
          );
        }
      }
      const provider = runtimeProvider(n);
      if (provider?.synchronize)
        staged.state[n.id] = provider.synchronize(
          staged.state[n.id],
          inputs,
          n,
        );
      if (provider)
        staged.outputs[n.id] = finite(
          provider.measure(staged.state[n.id], n),
        ) as Record<string, unknown>;
      visited.add(n.id);
    };
    for (const n of [...this.document.nodes, ...this.document.resources])
      evaluate(n);
    for (const clock of this.document.nodes.filter(
      (n) => n.definition === "models/ScheduledTrip",
    )) {
      for (const person of (staged.outputs[clock.id]?.people ??
        []) as import("../../components/systems/ScheduledTripSystem").PersonSnapshot[]) {
        if (
          this.document.connections.some(
            (c) =>
              c.to.node === clock.id &&
              c.to.port === "objects" &&
              c.from.node === person.id,
          )
        )
          staged.outputs[person.id] = {
            ...staged.outputs[person.id],
            status: person.status,
            position: person.position,
          };
      }
    }
    for (const n of this.document.nodes.filter((n) =>
      n.definition.startsWith("operations/"),
    )) {
      const input = (port: string) => {
        const c = this.document.connections.find(
          (c) => c.to.node === n.id && c.to.port === port,
        );
        return c ? staged.state[c.from.node] : undefined;
      };
      const first = input("first"),
        second = input("second");
      if (!first || !second) {
        staged.outputs[n.id] = { result: "Connect two models" };
        continue;
      }
      staged.outputs[n.id] = {
        result:
          n.definition === "operations/LineIntersection"
            ? lineIntersection(
                first as unknown as LineObject,
                second as unknown as LineObject,
              )
            : {
                left: fractionValue(first as unknown as FractionObject),
                right: fractionValue(second as unknown as FractionObject),
                relation: compare(
                  fractionValue(first as unknown as FractionObject),
                  fractionValue(second as unknown as FractionObject),
                ),
              },
      };
    }
  }
  private commit(staged: Snapshot) {
    this.observe(staged);
    this.snapshot = staged;
    for (const listener of this.listeners) listener();
  }
  dispatch = (commands: ScopedCommand[]): ActionResult => {
    try {
      if (this.delegate) return this.delegate(commands);
      const staged = structuredClone(this.snapshot);
      for (const c of commands) {
        const n = this.document.nodes.find((n) => n.id === c.node);
        if (!n) throw new Error(`${c.node}: missing command target`);
        const d = publicDefinition(n.definition),
          provider = runtimeProvider(n);
        if (!provider) throw new Error(`${n.label}: not a model`);
        const contract = d.commands[c.command];
        if (!contract) throw new Error(`${c.command}: unsupported command`);
        validateValue(contract.arguments, c.arguments, `${n.id}.${c.command}`);
        const state = ["RESET", "reset"].includes(c.command)
          ? provider.initialize(n)
          : provider.apply(staged.state[n.id], c.command, c.arguments, n);
        if (provider.capture)
          validateValue(
            d.configuration,
            provider.capture(state),
            `${n.id}.acceptedConfiguration`,
          );
        staged.state[n.id] = state;
      }
      this.commit(staged);
      for (const listener of this.interactionListeners) listener();
      this.effects.reconcile();
      return { accepted: true };
    } catch (e) {
      return {
        accepted: false,
        error: e instanceof Error ? e.message : "Command rejected",
      };
    }
  };
  submit = (node: string, args: Record<string, unknown>): ActionResult => {
    try {
      const control = this.document.nodes.find((n) => n.id === node);
      const commands = this.document.connections
        .filter((c) => c.kind === "command" && c.from.node === node)
        .map((c) => {
          let submitted = args;
          if (control && !c.arguments) {
            const target = this.document.nodes.find((n) => n.id === c.to.node);
            if (!target) throw new Error("Missing control target");
            const schema = publicDefinition(target.definition).commands[
              c.to.port
            ].arguments;
            if (scalarControls.has(control.definition)) {
              const binding = validateScalarValue(control, schema, args.value);
              let initial: Record<string, unknown>;
              try {
                initial = JSON.parse(String(control.configuration.initial));
                validateValue(schema, initial);
              } catch {
                initial = schemaDefault(schema) as Record<string, unknown>;
              }
              // Read siblings at submission time so dragging or another control cannot be overwritten.
              const current =
                acceptedCommandArguments(
                  c.to.port,
                  this.snapshot.state[target.id],
                  initial,
                ) ?? initial;
              submitted = writeParameter(current, binding.path, args.value);
            } else if (
              control.definition === "controls/Button" &&
              !Object.keys(args).length
            ) {
              try {
                submitted = JSON.parse(String(control.configuration.initial));
              } catch {
                throw new Error(
                  "Configure this action's arguments before running it.",
                );
              }
            }
          }
          const arguments_ = structuredClone(c.arguments ?? submitted);
          for (const [key, binding] of Object.entries(
            c.argumentBindings ?? {},
          )) {
            let value: unknown =
              this.snapshot.outputs[binding.from.node]?.[binding.from.port];
            for (const field of binding.path ?? [])
              value =
                value &&
                typeof value === "object" &&
                Object.hasOwn(value, field)
                  ? (value as Record<string, unknown>)[field]
                  : undefined;
            if (binding.transform === "not") value = !value;
            if (binding.transform === "multiply")
              value = Number(value) * (binding.operand ?? 1);
            if (binding.transform === "atLeast")
              value = Math.max(Number(value), binding.operand ?? 0);
            arguments_[key] = value;
          }
          return { node: c.to.node, command: c.to.port, arguments: arguments_ };
        });
      if (!commands.length)
        return { accepted: false, error: "Connect this control to a command." };
      return this.dispatch(commands);
    } catch (error) {
      return {
        accepted: false,
        error: error instanceof Error ? error.message : "Invalid control value",
      };
    }
  };
  step(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0 || delta > 1) return;
    const staged = structuredClone(this.snapshot);
    for (const n of [...this.document.nodes, ...this.document.resources]) {
      const p = runtimeProvider(n);
      if (p?.step) staged.state[n.id] = p.step(staged.state[n.id], delta);
    }
    this.commit(staged);
  }
  reset(scope?: string) {
    return this.dispatch(
      [...this.document.nodes, ...this.document.resources]
        .filter(
          (n) =>
            (!scope || n.scope === scope) &&
            runtimeProvider(n) &&
            (publicDefinition(n.definition).commands.RESET ||
              publicDefinition(n.definition).commands.reset),
        )
        .map((n) => ({
          node: n.id,
          command: Object.hasOwn(
            publicDefinition(n.definition).commands,
            "RESET",
          )
            ? "RESET"
            : "reset",
          arguments: {},
        })),
    );
  }
  value(node: string) {
    const c = this.document.connections.find(
      (c) => c.kind === "value" && c.to.node === node,
    );
    return c ? this.snapshot.outputs[c.from.node]?.[c.from.port] : undefined;
  }
  attached(node: string) {
    const c = this.document.connections.find(
      (c) => c.kind === "attachment" && c.to.node === node,
    );
    return c
      ? this.document.nodes.find((n) => n.id === c.from.node)
      : undefined;
  }
  capture() {
    const next = structuredClone(this.document);
    for (const n of [...next.nodes, ...next.resources]) {
      const p = runtimeProvider(n);
      if (p?.capture)
        n.configuration = p.capture(structuredClone(this.snapshot.state[n.id]));
    }
    validateAuthoredDocument(next);
    return next;
  }
}
