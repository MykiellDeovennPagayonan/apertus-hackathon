"use client";
import "./imported-component.css";
import { useEffect, useRef, useState } from "react";
import type { DocumentRuntime } from "../../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../../runtime/authoring/types";
import { diagnostic, manifestFor } from "../../../runtime/imported/contract";
import { ComponentRunner } from "../../../runtime/imported/runner";

export function ImportedHTMLView({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const source = String(node.configuration.source);
  const settings = JSON.stringify(node.configuration.settings);
  useEffect(() => {
    const host = frame.current;
    if (!host) return;
    let active = true;
    let runner: ComponentRunner | undefined;
    let generation = "",
      lastInputs = "",
      lastTime = 0;
    const sentActions = new Set<string>();
    const viewport = () => ({
      width: frame.current?.clientWidth ?? 640,
      height: frame.current?.clientHeight ?? 360,
      pixelRatio: window.devicePixelRatio,
    });
    const sync = () => {
      if (!active) return;
      const state = runtime.getSnapshot().state[node.id];
      if (!state) return;
      if (state.missing) {
        setError(String(state.missing));
        runner?.close();
        runner = undefined;
        generation = "";
        return;
      }
      if (state.error) {
        setError(String(state.error));
        return;
      }
      const manifest = manifestFor(source);
      const request = (
        kind: Parameters<ComponentRunner["request"]>[0],
        payload: unknown,
      ) => runner?.request(kind, payload).catch(() => {});
      if (!runner || state.generation !== generation) {
        runner?.close();
        generation = String(state.generation);
        lastTime = 0;
        sentActions.clear();
        setError("");
        const currentGeneration = generation;
        let failed = false;
        runner = new ComponentRunner(
          host,
          source,
          manifest,
          (outputs) => {
            if (active && !failed)
              runtime.acceptImported(node.id, currentGeneration, outputs);
          },
          (d) => {
            if (active) {
              failed = true;
              setError(d.message);
              runtime.acceptImported(node.id, currentGeneration, {}, d.message);
            }
          },
        );
        lastInputs = JSON.stringify(state.inputs);
        request("initialize", {
          settings: JSON.parse(settings),
          inputs: state.inputs,
          viewport: viewport(),
        });
      } else if (JSON.stringify(state.inputs) !== lastInputs) {
        lastInputs = JSON.stringify(state.inputs);
        request("updateInputs", state.inputs);
      }
      if (manifest.clock && Number(state.time) > lastTime) {
        const time = Number(state.time),
          delta = time - lastTime;
        lastTime = time;
        request("step", { time, delta });
      }
      for (const command of state.commands as {
        id: string;
        name: string;
        arguments: unknown;
      }[]) {
        if (sentActions.has(command.id)) continue;
        sentActions.add(command.id);
        const currentGeneration = generation;
        const currentRunner = runner;
        currentRunner
          .request("action", {
            name: command.name,
            arguments: command.arguments,
          })
          .then(() => {
            if (active)
              runtime.acceptImported(
                node.id,
                currentGeneration,
                currentRunner.outputs,
                "",
                command.id,
              );
          })
          .catch(() => {});
      }
    };
    const unsubscribe = runtime.subscribe(sync);
    const observer = new ResizeObserver(() => {
      runner?.request("resize", viewport()).catch(() => {});
    });
    observer.observe(host);
    try {
      sync();
    } catch (e) {
      setError(diagnostic(e).message);
    }
    return () => {
      active = false;
      unsubscribe();
      observer.disconnect();
      runner?.dispose().catch(() => {});
    };
  }, [node.id, source, settings, runtime]);
  return (
    <div className="imported-component-view">
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() =>
              runtime.dispatch([
                { node: node.id, command: "reset", arguments: {} },
              ])
            }
          >
            Restart component
          </button>
        </p>
      )}
      <div
        ref={frame}
        data-frame-title={node.label}
        className="imported-component-frame"
        style={{ width: "100%", height: 360, border: 0 }}
      />
    </div>
  );
}
