import { useState } from "react";
import { publicDefinition } from "../../components/catalog";
import { createPublicNode } from "../../components/composites/catalog";
import { componentDefinitions } from "../../components/registry";
import { CompositionCanvas } from "../../components/views/CompositionCanvas";
import { removeNodes } from "../../runtime/authoring/recipes";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { ComponentInstance } from "../../runtime/authoring/types";
import type {
  CompositionScene,
  SceneObject,
} from "../../runtime/composition/index";
import { CanvasSettings } from "./CanvasSettings";
import { ObjectSettings } from "./ObjectSettings";
import type { ComponentCatalog } from "./useComponentCatalog";

export function manualDefinition(node?: ComponentInstance) {
  return (
    node &&
    Object.values(componentDefinitions).find((d) => d.id === node.definition)
  );
}
/** Read-only projection for the established geometry controls; authored nodes own every edit. */
export function ManualComponentSettings({
  catalog,
  node,
}: {
  catalog: ComponentCatalog;
  node: ComponentInstance;
}) {
  const [preview, setPreview] = useState<{
    source: string;
    object: SceneObject;
  }>();
  const source = JSON.stringify(node.configuration);
  const definition = requireValue(manualDefinition(node));
  const d = catalog.document;
  const attached = d.connections.find(
    (c) =>
      c.from.node === node.id &&
      c.from.port === "appearance" &&
      c.to.port === "objects",
  );
  const canvas = d.nodes.find((n) => n.id === attached?.to.node);
  const object = {
    ...node.configuration,
    id: node.id,
  } as unknown as SceneObject;
  const scene: CompositionScene = {
    version: 2,
    kind: definition.space,
    canvas: (canvas?.configuration ??
      createPublicNode(`canvases/${definition.space}`, "preview", node.scope)
        .configuration) as unknown as CompositionScene["canvas"],
    objects: d.nodes
      .filter((n) => manualDefinition(n) && n.scope === node.scope)
      .map((n) => ({ ...n.configuration, id: n.id }) as unknown as SceneObject),
    controls: [],
    measurements: [],
  };
  const previewScene =
    preview?.source === source
      ? {
          ...scene,
          objects: scene.objects.map((item) =>
            item.id === node.id ? preview.object : item,
          ),
        }
      : scene;
  const commit = (next: SceneObject) =>
    catalog.change("Edit starting geometry", (doc) => {
      const target = requireValue(doc.nodes.find((n) => n.id === next.id));
      const { id: _, ...configuration } = next;
      target.configuration = configuration;
      target.label = next.label;
    });
  return (
    <div
      className={`composition-component-settings ${canvas ? "has-visual" : ""}`}
    >
      <div className="composition-settings-fields">
        <label>
          Display on canvas
          <select
            value={canvas?.id ?? ""}
            onChange={(e) =>
              catalog.change("Place component", (doc) => {
                doc.connections = doc.connections.filter(
                  (c) =>
                    !(
                      c.from.node === node.id &&
                      c.from.port === "appearance" &&
                      c.to.port === "objects"
                    ),
                );
                if (e.target.value) {
                  const target = requireValue(
                    doc.nodes.find((n) => n.id === e.target.value),
                  );
                  requireValue(doc.nodes.find((n) => n.id === node.id)).scope =
                    target.scope;
                  doc.connections.push({
                    id: `placement/${node.id}`,
                    kind: "attachment",
                    from: { node: node.id, port: "appearance" },
                    to: { node: target.id, port: "objects" },
                  });
                }
              })
            }
          >
            <option value="">Not connected</option>
            {d.nodes
              .filter(
                (n) =>
                  publicDefinition(n).category === "canvases" &&
                  publicDefinition(n).inputs.objects?.unit ===
                    definition.space,
              )
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
          </select>
        </label>
        <ObjectSettings
          object={object}
          scene={scene}
          onChange={commit}
          onDelete={() =>
            catalog.change("Delete component", (doc) =>
              removeNodes(doc, [node.id]),
            )
          }
          onDuplicate={() =>
            catalog.change("Duplicate object", (doc) => {
              const copy = structuredClone(node);
              copy.id = crypto.randomUUID();
              copy.label = `${node.label} copy`;
              doc.nodes.push(copy);
            })
          }
        />
      </div>
      {canvas && (
        <div className="composition-settings-visual">
          <h3>{canvas.label}</h3>
          <CompositionCanvas
            people={[]}
            scene={previewScene}
            selected={node.id}
            authoring
            active
            resetToken={node.id}
            onSelect={() => {}}
            onChange={(next) => setPreview({ source, object: next })}
            onCommit={(next) => {
              setPreview(undefined);
              commit(next);
            }}
            onPiece={(id, index) => {
              const target = scene.objects.find((n) => n.id === id);
              if (target?.kind === "fraction-bar") {
                const copy = structuredClone(target);
                copy.shaded[index] = !copy.shaded[index];
                commit(copy);
              }
              return { accepted: true };
            }}
          />
          <p>Drag the selected object to edit its starting geometry.</p>
        </div>
      )}
    </div>
  );
}

export function ManualCanvasSettings({
  catalog,
  node,
}: {
  catalog: ComponentCatalog;
  node: ComponentInstance;
}) {
  const kind = node.definition.split("/")[1] as CompositionScene["kind"];
  const canvas = {
    id: node.id,
    label: node.label,
    kind,
    settings: node.configuration as unknown as CompositionScene["canvas"],
  };
  return (
    <CanvasSettings
      canvas={canvas}
      update={(mutate) =>
        catalog.change("Edit canvas", (doc) => {
          const copy = structuredClone(canvas);
          mutate(copy);
          const target = requireValue(doc.nodes.find((n) => n.id === node.id));
          target.label = copy.label;
          target.configuration = copy.settings as unknown as Record<
            string,
            unknown
          >;
        })
      }
      onDelete={() =>
        catalog.change("Delete canvas", (doc) => removeNodes(doc, [node.id]))
      }
      onDuplicate={() => catalog.add(node.definition)}
    />
  );
}
