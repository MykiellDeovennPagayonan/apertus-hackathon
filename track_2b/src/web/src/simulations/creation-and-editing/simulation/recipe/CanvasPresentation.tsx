"use client";

import { useContext, useState } from "react";
import type { DocumentRuntime } from "../../runtime-engine/DocumentRuntime";
import type { ComponentInstance } from "../../authoring-engine/document";
import type { CompositionScene } from "../../runtime-engine/composition/types";
import type { SceneObject } from "../../../legacy/components/traits/SceneObjects";
import { CompositionCanvas } from "../../../legacy/components/views/CompositionCanvas";

import { AuthorContext, SnapshotContext } from "./contexts";

/** The host owns authored commits; dragging is a local preview until completion. */
export function CanvasPresentation({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const author = useContext(AuthorContext);
  const snapshot = useContext(SnapshotContext);
  const [draft, setDraft] = useState<{
    source: string;
    object: SceneObject;
  } | null>(null);
  const kind = node.definition.split("/")[1] as CompositionScene["kind"];
  const accepted = runtime.document.connections
    .filter(
      (connection) =>
        connection.kind === "attachment" &&
        connection.to.node === node.id &&
        connection.to.port === "objects",
    )
    .map(
      (connection) =>
        snapshot.state[connection.from.node] as unknown as SceneObject,
    );
  const source = JSON.stringify(accepted);
  const preview = draft?.source === source ? draft.object : null;
  const objects = accepted.map((object) =>
    object.id === preview?.id ? preview : object,
  );
  const scene: CompositionScene = {
    version: 2,
    kind,
    canvas: author.authoring
      ? {
          ...(node.configuration as unknown as CompositionScene["canvas"]),
          backgroundColor:
            (node.configuration.backgroundColor as string | undefined) ??
            "#fffdf7",
          borderColor:
            (node.configuration.borderColor as string | undefined) ?? "#d5cdbb",
          showNavigation: true,
          showAbout: true,
        }
      : (node.configuration as unknown as CompositionScene["canvas"]),
    objects,
    controls: [],
    measurements: [],
  };
  return (
    <>
      <CompositionCanvas
        scene={scene}
        people={
          (snapshot.state[
            runtime.document.connections.find(
              (connection) =>
                connection.to.node === node.id &&
                connection.to.port === "timeline",
            )?.from.node ?? ""
          ]?.people ??
            []) as import("../../../legacy/components/systems/ScheduledTripSystem").PersonSnapshot[]
        }
        selected={author.selected ?? ""}
        authoring={author.authoring ?? false}
        active
        resetToken={node.id}
        onSelect={author.onSelect ?? (() => {})}
        onChange={(object) => {
          if (author.authoring) setDraft({ source, object });
        }}
        onCommit={(object) => {
          setDraft(null);
          if (author.authoring) author.onAuthorChange?.(object);
        }}
        onCanvasCommit={(viewport) => {
          if (author.authoring) author.onCanvasChange?.(node.id, viewport);
        }}
        onPiece={(id, index) =>
          runtime.dispatch([
            { node: id, command: "togglePiece", arguments: { index } },
          ])
        }
      />
      {preview &&
        JSON.stringify(preview) !==
          JSON.stringify(
            accepted.find((object) => object.id === preview.id),
          ) && (
          <output className="catalog-help" aria-live="polite">
            Previewing geometry. Release to apply; Escape cancels.
          </output>
        )}
    </>
  );
}
