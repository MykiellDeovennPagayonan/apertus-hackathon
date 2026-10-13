import { IMPORTED_HTML } from "../../creation-and-editing/runtime-engine/imported/contract";
import { useMemo, useState } from "react";
import { publicDefinition, publicDefinitions } from "../../registry/index";
import { ImportedValueForm } from "../../legacy/components/controls/ImportedValueForm";
import { requireValue } from "../../creation-and-editing/authoring-engine/requireValue";
import { DocumentRuntime } from "../../creation-and-editing/runtime-engine/DocumentRuntime";
import type { Endpoint } from "../../creation-and-editing/authoring-engine/document";
import { BuilderIcon } from "../BuilderIcon";
import { ComponentDialog } from "../ComponentDialog";
import type { ExperimentDocument } from "../document";
import { addCatalogComponent } from "../editor/compositeCommands";
import {
  connectDocument,
  documentConnectionError,
} from "../editor/connectionCommands";
import { portLabel, resolveGraphEndpoint } from "../graph/authoredGraph";

type Edit = (
  change: (d: ExperimentDocument) => void,
  group?: string | null,
  action?: string,
) => boolean;
export function InputEditor({
  doc,
  target,
  edit,
  onClose,
}: {
  doc: ExperimentDocument;
  target: Endpoint;
  edit: Edit;
  onClose: () => void;
}) {
  const endpoint = useMemo(
    () => resolveGraphEndpoint(doc, target),
    [doc, target],
  );
  const component = requireValue(
    [...(doc.authored?.nodes ?? []), ...(doc.authored?.resources ?? [])].find(
      (n) => n.id === endpoint.node,
    ),
  );
  const definition = publicDefinition(component);
  const field = endpoint.port.replace(/^set:/, "");
  const imported = component.definition === IMPORTED_HTML;
  const configurationSchema = imported ? definition.inputs[field]?.schema :
    definition.configuration.type === "object"
      ? definition.configuration.properties[field]
      : undefined;
  const setter = definition.commands[`set:${field}`];
  const setterSchema =
    setter?.arguments.type === "object"
      ? setter.arguments.properties.value
      : undefined;
  const schema = configurationSchema ?? setterSchema;
  const initial = useMemo(
    () =>
      configurationSchema
        ? imported ? (component.configuration.inputs as Record<string, unknown>)[field] : component.configuration[field]
        : new DocumentRuntime(requireValue(doc.authored)).getSnapshot().outputs[
            component.id
          ]?.[field],
    [configurationSchema, component, field, doc],
  );
  const [mode, setMode] = useState<"manual" | "existing" | "add">(
    schema ? "manual" : "add",
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const incoming = requireValue(doc.authored).connections.filter(
    (c) => c.to.node === endpoint.node && c.to.port === endpoint.port,
  );
  const prepare = (d: ExperimentDocument) => {
    if (definition.inputs[endpoint.port]?.cardinality !== "many")
      requireValue(d.authored).connections = requireValue(
        d.authored,
      ).connections.filter(
        (c) => c.to.node !== endpoint.node || c.to.port !== endpoint.port,
      );
  };
  const choices = useMemo(() => {
    const base = structuredClone(doc);
    if (definition.inputs[endpoint.port]?.cardinality !== "many")
      requireValue(base.authored).connections = requireValue(
        base.authored,
      ).connections.filter(
        (c) => c.to.node !== endpoint.node || c.to.port !== endpoint.port,
      );
    const existing = [
      ...requireValue(base.authored).nodes,
      ...requireValue(base.authored).resources,
    ].flatMap((n) =>
      Object.keys(publicDefinition(n).outputs).flatMap((port) => {
        const from = { node: n.id, port };
        return n.id !== endpoint.node &&
          !documentConnectionError(base, from, endpoint)
          ? [{ from, label: `${n.label} · ${portLabel(port)}` }]
          : [];
      }),
    );
    const additions = [...publicDefinitions.values()]
      .filter((d) => !d.application)
      .flatMap((d) =>
        Object.keys(d.outputs).flatMap((port) => {
          try {
            const draft = structuredClone(base);
            const id = `input-choice/${d.id}`;
            addCatalogComponent(
              requireValue(draft.authored),
              d.id,
              id,
              definition.category === "canvases" ? component.id : "",
              [component.id],
            );
            if (documentConnectionError(draft, { node: id, port }, endpoint))
              return [];
            return [
              {
                definition: d.id,
                port,
                label: `${d.title} · ${portLabel(port)}`,
              },
            ];
          } catch {
            return [];
          }
        }),
      );
    return { existing, additions };
  }, [doc, endpoint, definition, component.id]);
  const apply = (label: string, change: (d: ExperimentDocument) => void) => {
    const accepted = edit(
      (d) => {
        change(d);
        new DocumentRuntime(requireValue(d.authored));
      },
      null,
      label,
    );
    if (accepted) onClose();
    else
      setError(
        "This change could not be applied. Check the value or choose another component.",
      );
    return accepted;
  };
  const matches = (label: string) =>
    label.toLowerCase().includes(query.toLowerCase());
  return (
    <ComponentDialog
      open
      title={`${component.label} · ${portLabel(endpoint.port)}`}
      onClose={onClose}
      footerLabel="Cancel"
      footerPrimary={false}
      className="input-editor-dialog"
    >
      <fieldset className="input-editor-modes" aria-label="Input source">
        {schema && (
          <button
            type="button"
            aria-pressed={mode === "manual"}
            onClick={() => setMode("manual")}
          >
            Set value
          </button>
        )}
        <button
          type="button"
          aria-pressed={mode === "existing"}
          onClick={() => setMode("existing")}
        >
          Use existing
        </button>
        <button
          type="button"
          aria-pressed={mode === "add"}
          onClick={() => setMode("add")}
        >
          Add component
        </button>
      </fieldset>
      <p className="input-editor-hint">
        {mode === "manual"
          ? "Choose the starting value for this input."
          : mode === "existing"
            ? "Connect an output from a component in your experiment."
            : "Choose a compatible component to add and connect."}
      </p>
      {error && <p role="alert">{error}</p>}
      {schema && (
        <section className="input-editor-section" hidden={mode !== "manual"}>
          {incoming.length > 0 && (
            <p>Applying a value will replace this input’s connection.</p>
          )}
          <ImportedValueForm
            submitLabel="Apply value"
            schema={schema}
            initial={initial}
            label={portLabel(field)}
            onSubmit={(value) =>
              apply(`Set ${portLabel(field)}`, (d) => {
                requireValue(d.authored).connections = requireValue(
                  d.authored,
                ).connections.filter(
                  (c) =>
                    c.to.node !== endpoint.node ||
                    ![endpoint.port, field, `set:${field}`].includes(c.to.port),
                );
                const n = requireValue(
                  [
                    ...requireValue(d.authored).nodes,
                    ...requireValue(d.authored).resources,
                  ].find((n) => n.id === endpoint.node),
                );
                if (configurationSchema) {
                  if (imported) (n.configuration.inputs as Record<string, unknown>)[field] = value;
                  else n.configuration[field] = value;
                }
                else {
                  const runtime = new DocumentRuntime(requireValue(d.authored));
                  const result = runtime.dispatch([
                    {
                      node: n.id,
                      command: `set:${field}`,
                      arguments: { value },
                    },
                  ]);
                  if (!result.accepted) throw new Error(result.error);
                  n.configuration = requireValue(
                    runtime.capture().nodes.find((node) => node.id === n.id),
                  ).configuration;
                }
              })
                ? { accepted: true }
                : { accepted: false, error: "Value could not be applied." }
            }
          />
        </section>
      )}
      {incoming.length > 0 && mode !== "manual" && (
        <section className="input-editor-section">
          <h3>Connected components</h3>
          {incoming.map((c, index) => {
            const source = [
              ...requireValue(doc.authored).nodes,
              ...requireValue(doc.authored).resources,
            ].find((node) => node.id === c.from.node);
            const scope = requireValue(doc.authored).scopes.find(
              (item) => item.id === source?.scope,
            );
            return (
              <div className="input-editor-connection" key={c.id}>
                <span>
                  {
                    [
                      ...requireValue(doc.authored).nodes,
                      ...requireValue(doc.authored).resources,
                    ].find((n) => n.id === c.from.node)?.label
                  }{" "}
                  · {portLabel(c.from.port)}
                  <small>
                    {scope?.label ?? "Connected component"} · Source {index + 1}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    apply("Disconnect input", (d) => {
                      requireValue(d.authored).connections = requireValue(
                        d.authored,
                      ).connections.filter((v) => v.id !== c.id);
                    })
                  }
                >
                  Disconnect
                </button>
              </div>
            );
          })}
        </section>
      )}
      {mode !== "manual" && (
        <label className="input-editor-search">
          Find a component
          <span className="input-editor-search-field">
            <BuilderIcon name="search" />
            <input
              type="search"
              placeholder="Search compatible components…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </span>
        </label>
      )}
      <div className="input-editor-options">
        {mode === "existing" && (
          <section className="input-editor-section">
            <h3>
              Available outputs{" "}
              <small>
                {choices.existing.filter((c) => matches(c.label)).length}
              </small>
            </h3>
            {choices.existing
              .filter((c) => matches(c.label))
              .map((c) => (
                <button
                  className="input-editor-choice"
                  type="button"
                  key={`${c.from.node}/${c.from.port}`}
                  onClick={() =>
                    apply("Connect input", (d) => {
                      prepare(d);
                      connectDocument(d, c.from, endpoint);
                    })
                  }
                >
                  <span>{c.label}</span>
                  <small>Connect</small>
                </button>
              ))}
            {!choices.existing.filter((c) => matches(c.label)).length && (
              <p>No compatible components in this experiment.</p>
            )}
          </section>
        )}
        {mode === "add" && (
          <section className="input-editor-section">
            <h3>
              Compatible components{" "}
              <small>
                {choices.additions.filter((c) => matches(c.label)).length}
              </small>
            </h3>
            {choices.additions
              .filter((c) => matches(c.label))
              .map((c) => (
                <button
                  className="input-editor-choice"
                  type="button"
                  key={`${c.definition}/${c.port}`}
                  onClick={() =>
                    apply(
                      `Add ${publicDefinition(c.definition).title} and connect`,
                      (d) => {
                        prepare(d);
                        const id = crypto.randomUUID();
                        addCatalogComponent(
                          requireValue(d.authored),
                          c.definition,
                          id,
                          definition.category === "canvases"
                            ? component.id
                            : "",
                          [component.id],
                        );
                        connectDocument(
                          d,
                          { node: id, port: c.port },
                          endpoint,
                        );
                        const position = d.editor.positions[target.node] ?? {
                          x: 420,
                          y: 100,
                        };
                        d.editor.positions[id] = {
                          x: Math.max(24, position.x - 340),
                          y: position.y + 80,
                        };
                      },
                    )
                  }
                >
                  <span>{c.label}</span>
                  <small>+ Add</small>
                </button>
              ))}
            {!choices.additions.filter((c) => matches(c.label)).length && (
              <p>No matching components. Try another search.</p>
            )}
          </section>
        )}
      </div>
    </ComponentDialog>
  );
}
