import { parse, parseFragment, serialize } from "parse5";
import { validateValue } from "../../../registry/contracts/parameterSchema";
import {
  ComponentError,
  componentLimits,
  type Diagnostic,
  diagnostic,
  jsonData,
  type Manifest,
  manifestFor,
} from "./contract";

export type Viewport = { width: number; height: number; pixelRatio: number };
export type InitialContext = {
  settings: Record<string, unknown>;
  inputs: Record<string, unknown>;
  viewport: Viewport;
};
export type RequestKind =
  | "initialize"
  | "updateInputs"
  | "resize"
  | "reset"
  | "action"
  | "step"
  | "dispose";
type Envelope = {
  apiVersion: 1;
  session: string;
  requestId: number;
  kind: string;
  payload: unknown;
};

// This function is serialized into the isolated document. Keep it entirely self-contained.
function bootstrap(session: string, optionalHandlers: string[]) {
  let implementation:
    | Record<string, (...args: unknown[]) => unknown>
    | undefined;
  let port: MessagePort | undefined;
  let requestId = 0;
  let readyTimer: ReturnType<typeof setInterval>;
  const startupErrors: string[] = [];
  const send = (kind: string, payload: unknown) =>
    port?.postMessage({ apiVersion: 1, session, requestId, kind, payload });
  const error = (e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    if (!port) startupErrors.push(message);
    else send("error", { code: "runtime.handler", message });
  };
  Object.defineProperty(window, "apertus", {
    value: Object.freeze({
      register(value: Record<string, (...args: unknown[]) => unknown>) {
        if (implementation)
          throw new Error("Register exactly one implementation");
        for (const name of [
          "initialize",
          "updateInputs",
          "resize",
          "reset",
          "dispose",
          ...optionalHandlers,
        ])
          if (typeof value[name] !== "function")
            throw new Error(`Missing handler ${name}`);
        implementation = value;
      },
      emit(name: string, value: unknown) {
        send("output", { name, value });
      },
      reportError(value: { code: string; message: string }) {
        send("error", value);
      },
    }),
    writable: false,
    configurable: false,
  });
  window.addEventListener(
    "load",
    () => {
      const ready = () =>
        parent.postMessage({ kind: "apertus-ready", session }, "*");
      ready();
      readyTimer = setInterval(ready, 250);
    },
    { once: true },
  );
  window.addEventListener("error", (e) => error(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => error(e.reason));
  window.addEventListener("message", function connect(e) {
    if (
      e.source !== parent ||
      e.data?.session !== session ||
      !e.ports[0] ||
      requestId > 0
    )
      return;
    port?.close();
    port = e.ports[0];
    clearInterval(readyTimer);
    port.onmessage = async ({ data }: MessageEvent<Envelope>) => {
      if (data.session !== session || data.apiVersion !== 1) return;
      requestId = data.requestId;
      try {
        if (!implementation)
          throw new Error("Call apertus.register before startup");
        const handler = implementation[data.kind];
        if (typeof handler !== "function")
          throw new Error(`Missing handler ${data.kind}`);
        if (data.kind === "action") {
          const p = data.payload as { name: string; arguments: unknown };
          await handler(p.name, p.arguments);
        } else await handler(data.payload);
        send("ack", null);
      } catch (e) {
        error(e);
      }
    };
    port.start();
    send("connected", null);
    for (const message of startupErrors)
      send("error", { code: "runtime.startup", message });
  });
}

export function runnerDocument(source: string, session: string): string {
  const tree = parse(source);
  function nonceScripts(node: import("parse5").DefaultTreeAdapterMap["node"]) {
    if ("tagName" in node) {
      if (node.tagName === "script") {
        node.attrs = node.attrs.filter((a) => a.name !== "nonce");
        node.attrs.push({ name: "nonce", value: session });
      }
      if ("content" in node) nonceScripts(node.content);
    }
    if ("childNodes" in node) node.childNodes.forEach(nonceScripts);
  }
  nonceScripts(tree);
  const html = tree.childNodes.find(
    (n) => "tagName" in n && n.tagName === "html",
  );
  const head =
    html && "childNodes" in html
      ? html.childNodes.find((n) => "tagName" in n && n.tagName === "head")
      : undefined;
  if (!head || !("childNodes" in head)) throw new Error("HTML head missing");
  const policy = `default-src 'none'; script-src 'nonce-${session}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  const manifest = manifestFor(source);
  const required = [
    ...(manifest.clock ? ["step"] : []),
    ...(Object.keys(manifest.actions).length ? ["action"] : []),
  ];
  const trusted = parseFragment(
    `<meta http-equiv="Content-Security-Policy" content="${policy}"><script nonce="${session}">(${bootstrap.toString()})(${JSON.stringify(session)}, ${JSON.stringify(required)});</script>`,
  );
  head.childNodes.unshift(...trusted.childNodes);
  return serialize(tree);
}

export class ComponentRunner {
  private frame: HTMLIFrameElement;
  private channel = new MessageChannel();
  private session = crypto.randomUUID();
  private sequence = 0;
  private pending?: {
    id: number;
    kind: RequestKind;
    payload: unknown;
    resolve: () => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  private queue: {
    kind: RequestKind;
    payload: unknown;
    resolve: () => void;
    reject: (e: Error) => void;
  }[] = [];
  private connected = false;
  private closed = false;
  private lastTransfer = -Infinity;
  private seen = new Set<string>();
  private windowStart = performance.now();
  private messageCount = 0;
  private startupTimer: ReturnType<typeof setTimeout>;
  outputs: Record<string, unknown> = {};
  private onReady = (event: MessageEvent) => {
    if (
      event.source !== this.frame.contentWindow ||
      event.data?.kind !== "apertus-ready" ||
      event.data?.session !== this.session ||
      this.closed ||
      this.connected
    )
      return;
    if (performance.now() - this.lastTransfer < 1000) return;
    this.lastTransfer = performance.now();
    this.channel.port1.close();
    this.channel.port2.close();
    this.channel = new MessageChannel();
    this.listen();
    this.frame.contentWindow?.postMessage({ session: this.session }, "*", [
      this.channel.port2,
    ]);
  };
  private onLoad = () => {
    if (this.connected)
      this.fail(
        new ComponentError(
          "runtime.navigation",
          "The component navigated away from its document.",
        ),
      );
  };
  constructor(
    host: HTMLElement,
    source: string,
    readonly manifest: Manifest,
    private onOutputs: (outputs: Record<string, unknown>) => void,
    private onDiagnostic: (diagnostic: Diagnostic) => void,
  ) {
    const frame = document.createElement("iframe");
    this.frame = frame;
    frame.title = host.dataset.frameTitle ?? manifest.name;
    frame.style.cssText = "width:100%;height:100%;border:0;display:block";
    host.replaceChildren(frame);
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.setAttribute(
      "allow",
      "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'",
    );
    this.listen();
    this.startupTimer = setTimeout(
      () =>
        this.fail(
          new ComponentError(
            "runtime.startup_timeout",
            "Component did not connect within 5 seconds.",
          ),
        ),
      componentLimits.startup,
    );
    window.addEventListener("message", this.onReady);
    frame.addEventListener("load", this.onLoad);
    frame.srcdoc = runnerDocument(source, this.session);
  }
  private listen() {
    this.channel.port1.onmessage = (e) => this.receive(e.data);
    this.channel.port1.onmessageerror = () =>
      this.fail(
        new ComponentError(
          "runtime.message",
          "Could not decode component message.",
        ),
      );
    this.channel.port1.start();
  }
  request(kind: RequestKind, payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.closed) {
        reject(new ComponentError("runtime.closed", "Component is stopped."));
        return;
      }
      try {
        jsonData(payload);
        if (
          new TextEncoder().encode(JSON.stringify(payload)).length >
          componentLimits.payload
        )
          throw new ComponentError(
            "runtime.payload",
            "Message exceeds 256 KiB.",
          );
      } catch (e) {
        reject(e);
        return;
      }
      if (this.queue.length >= componentLimits.queue) {
        const e = new ComponentError(
          "runtime.queue",
          "Component cannot keep up with host requests.",
        );
        reject(e);
        this.fail(e);
        return;
      }
      this.queue.push({ kind, payload, resolve, reject });
      this.pump();
    });
  }
  private pump() {
    if (!this.connected || this.closed || this.pending || !this.queue.length)
      return;
    const request = this.queue.shift();
    if (!request) return;
    const id = ++this.sequence;
    if (request.kind === "initialize" || request.kind === "reset") {
      this.seen.clear();
      this.outputs = {};
      this.onOutputs({});
    }
    this.pending = {
      id,
      kind: request.kind,
      payload: request.payload,
      resolve: request.resolve,
      reject: request.reject,
      timer: setTimeout(
        () =>
          this.fail(
            new ComponentError(
              "runtime.handler_timeout",
              `${request.kind} did not finish within the host time limit.`,
            ),
          ),
        componentLimits.handler,
      ),
    };
    this.channel.port1.postMessage({
      apiVersion: 1,
      session: this.session,
      requestId: id,
      kind: request.kind,
      payload: request.payload,
    });
  }
  private receive(data: unknown) {
    if (this.closed) return;
    try {
      const now = performance.now();
      if (now - this.windowStart >= 1000) {
        this.windowStart = now;
        this.messageCount = 0;
      }
      if (++this.messageCount > componentLimits.messages)
        throw new ComponentError(
          "runtime.rate",
          "Component exceeds 1,024 messages per second.",
        );
      jsonData(data);
      if (
        new TextEncoder().encode(JSON.stringify(data)).length >
        componentLimits.payload
      )
        throw new ComponentError("runtime.payload", "Message exceeds 256 KiB.");
      const e = data as Envelope;
      if (
        e.apiVersion !== 1 ||
        e.session !== this.session ||
        !Number.isInteger(e.requestId)
      )
        throw new ComponentError(
          "runtime.message",
          "Invalid component message envelope.",
        );
      if (e.kind === "connected") {
        if (this.connected || e.requestId !== 0)
          throw new ComponentError("runtime.message", "Unexpected handshake.");
        this.connected = true;
        clearTimeout(this.startupTimer);
        this.pump();
        return;
      }
      if (e.kind === "error") {
        const p = e.payload as { message?: string };
        throw new ComponentError(
          "runtime.handler",
          typeof p?.message === "string"
            ? p.message.slice(0, 1000)
            : "Component reported an error.",
        );
      }
      if (e.kind === "output") {
        const p = e.payload as { name: string; value: unknown };
        if (
          !p ||
          typeof p.name !== "string" ||
          !Object.hasOwn(this.manifest.outputs, p.name)
        )
          throw new ComponentError(
            "output.unknown",
            `Undeclared output: ${p?.name}`,
          );
        try {
          validateValue(
            this.manifest.outputs[p.name].schema,
            p.value,
            `outputs.${p.name}`,
          );
        } catch (error) {
          const d = diagnostic(
            new ComponentError(
              "output.invalid",
              error instanceof Error ? error.message : "Invalid output",
              `outputs.${p.name}`,
            ),
            "interface",
          );
          d.expected = JSON.stringify(this.manifest.outputs[p.name].schema);
          d.received = p.value as never;
          d.requestId = e.requestId;
          if (this.pending)
            d.reproduction = {
              kind: this.pending.kind,
              payload: this.pending.payload as never,
            };
          this.onDiagnostic(d);
          this.close();
          this.onOutputs({});
          return;
        }
        this.seen.add(p.name);
        this.outputs = { ...this.outputs, [p.name]: p.value };
        // Publish only complete snapshots; never leak partial initialization downstream.
        if (
          Object.keys(this.manifest.outputs).every((name) =>
            this.seen.has(name),
          )
        )
          this.onOutputs(structuredClone(this.outputs));
        return;
      }
      if (e.kind !== "ack" || !this.pending || e.requestId !== this.pending.id)
        throw new ComponentError(
          "runtime.message",
          "Unexpected acknowledgement.",
        );
      if (
        ["initialize", "reset"].includes(this.pending.kind) &&
        Object.keys(this.manifest.outputs).some((name) => !this.seen.has(name))
      )
        throw new ComponentError(
          "output.missing",
          "Initialize/reset must emit every declared output before returning.",
        );
      const pending = this.pending;
      this.pending = undefined;
      clearTimeout(pending.timer);
      pending.resolve();
      this.pump();
    } catch (e) {
      this.fail(
        e instanceof Error ? e : new Error("Invalid component message"),
      );
    }
  }
  private fail(error: Error) {
    if (this.closed) return;
    const d = diagnostic(error, "runtime");
    if (this.pending) {
      d.requestId = this.pending.id;
      d.path = this.pending.kind;
      d.reproduction = {
        kind: this.pending.kind,
        payload: this.pending.payload as never,
      };
    }
    this.onDiagnostic(d);
    this.close();
    this.onOutputs({});
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.startupTimer);
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(
        new ComponentError(
          "runtime.closed",
          "Component stopped; review diagnostics.",
        ),
      );
      this.pending = undefined;
    }
    for (const r of this.queue.splice(0))
      r.reject(new ComponentError("runtime.closed", "Component stopped."));
    this.channel.port1.close();
    this.channel.port2.close();
    this.frame.removeEventListener("load", this.onLoad);
    window.removeEventListener("message", this.onReady);
    this.frame.remove();
  }
  async dispose() {
    try {
      await this.request("dispose", null);
    } finally {
      this.close();
    }
  }
}
