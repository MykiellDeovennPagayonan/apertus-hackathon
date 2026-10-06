import { publicDefinition } from "../../components/catalog";
import { hasControlSettings } from "../../components/controls/controlContract";
import { SchemaForm } from "../../components/controls/SchemaForm";
import { requireValue } from "../../runtime/authoring/requireValue";
import { emptyLayout, type Layout } from "../../runtime/authoring/types";
import { interchangeableControls } from "../editor/controlTypeCommands";
import { ControlSettings } from "./ControlSettings";
import { ControlTypeSettings } from "./ControlTypeSettings";
import { DataDisplaySettings } from "./DataDisplaySettings";
import { DecorationSettings } from "./DecorationSettings";
import { ManualCanvasSettings } from "./ManualComponentSettings";
import type { ComponentCatalog } from "./useComponentCatalog";
export function ComponentSettings({
  catalog,
  id,
}: {
  catalog: ComponentCatalog;
  id: string;
}) {
  const { components, document, change, layoutTargets } = catalog;
  const current = components.find((n) => n.id === id);
  return (
    <div className="composition-settings-fields">
      {current ? (
        <>
          {interchangeableControls.includes(current.definition) && (
            <ControlTypeSettings
              key={`${current.id}/${current.definition}`}
              node={current}
              catalog={catalog}
            />
          )}
          {!hasControlSettings(current.definition) && (
            <label>
              Label
              <input
                value={current.label}
                onChange={(e) =>
                  change("Rename component", (d) => {
                    requireValue(
                      [...d.nodes, ...d.resources].find(
                        (n) => n.id === current.id,
                      ),
                    ).label = e.target.value;
                  })
                }
              />
            </label>
          )}
          {hasControlSettings(current.definition) ? (
            <ControlSettings
              key={`${current.id}/${JSON.stringify(current.configuration)}/${JSON.stringify(document.connections.filter((c) => c.from.node === current.id))}`}
              node={current}
              catalog={catalog}
            />
          ) : ["displays/Text", "displays/Box"].includes(current.definition) ? (
            <DecorationSettings node={current} catalog={catalog} />
          ) : /^canvases\/(cartesian|physical|diagram|town)$/.test(
              current.definition,
            ) ? (
            <ManualCanvasSettings catalog={catalog} node={current} />
          ) : [
              "displays/DataTable",
              "displays/Chart",
              "displays/Histogram",
              "displays/Heatmap",
            ].includes(current.definition) ? (
            <DataDisplaySettings
              key={`${current.id}/${JSON.stringify(current.configuration)}`}
              node={current}
              document={document}
              onApply={(configuration) => {
                const accepted = change("Edit display settings", (d) => {
                  requireValue(
                    [...d.nodes, ...d.resources].find(
                      (n) => n.id === current.id,
                    ),
                  ).configuration = configuration;
                });
                return accepted
                  ? { accepted: true }
                  : {
                      accepted: false,
                      error: "Display settings were rejected.",
                    };
              }}
            />
          ) : (
            <SchemaForm
              key={`${current.id}/${JSON.stringify(current.configuration)}`}
              schema={publicDefinition(current.definition).configuration}
              initial={current.configuration}
              label="Starting configuration"
              onSubmit={(configuration) => {
                const accepted = change("Edit component configuration", (d) => {
                  requireValue(
                    [...d.nodes, ...d.resources].find(
                      (n) => n.id === current.id,
                    ),
                  ).configuration = configuration;
                });
                return accepted
                  ? { accepted: true }
                  : {
                      accepted: false,
                      error: "Configuration was rejected.",
                    };
              }}
            />
          )}
          <details>
            <summary>Advanced placement</summary>
            <label>
              Canvas group
              <select
                value={current.scope}
                onChange={(e) =>
                  change("Change runtime scope", (d) => {
                    requireValue(
                      [...d.nodes, ...d.resources].find(
                        (n) => n.id === current.id,
                      ),
                    ).scope = e.target.value;
                  })
                }
              >
                {document.scopes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Place in layout
              <select
                value=""
                onChange={(e) =>
                  change("Move layout component", (d) => {
                    let detached: Layout | undefined;
                    function remove(l: Layout) {
                      const index = l.children.findIndex(
                        (c) => c.node === current?.id,
                      );
                      if (index >= 0) [detached] = l.children.splice(index, 1);
                      l.children.forEach(remove);
                    }
                    remove(d.layout);
                    const contains = (l: Layout): boolean =>
                      l.id === e.target.value || l.children.some(contains);
                    if (detached && contains(detached))
                      throw new Error(
                        "Choose a layout outside this component's children.",
                      );
                    function place(l: Layout) {
                      if (l.id === e.target.value)
                        l.children.push(
                          detached ?? {
                            ...emptyLayout(`layout/${current?.id}`),
                            node: current?.id,
                          },
                        );
                      else l.children.forEach(place);
                    }
                    place(d.layout);
                  })
                }
              >
                <option value="">Choose layout parent</option>
                {layoutTargets
                  .filter(
                    (l) =>
                      !l.node ||
                      document.nodes.some(
                        (n) =>
                          n.id === l.node &&
                          publicDefinition(n.definition).category === "layout",
                      ),
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label || l.kind}
                    </option>
                  ))}
              </select>
            </label>
          </details>
        </>
      ) : (
        <p>Set the lesson instructions and arrange its content.</p>
      )}
      <details>
        <summary>Layout and appearance</summary>
        {layoutTargets
          .filter(
            (l) =>
              !l.node ||
              document.nodes.some(
                (n) =>
                  n.id === l.node &&
                  publicDefinition(n.definition).category === "layout",
              ),
          )
          .map((l) => (
            <fieldset key={l.id}>
              <legend>{l.label || l.kind}</legend>
              <label>
                Section label
                <input
                  value={l.label}
                  onChange={(e) =>
                    change("Rename layout section", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id) p.label = e.target.value;
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                />
              </label>
              <label>
                Layout
                <select
                  value={l.kind}
                  onChange={(e) =>
                    change("Change layout", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id)
                          p.kind = e.target.value as Layout["kind"];
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                >
                  {[
                    "stack",
                    "row",
                    "grid",
                    "panel",
                    "disclosure",
                    "tabs",
                    "split",
                    "repeater",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Spacing
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={l.gap}
                  onChange={(e) =>
                    change("Change spacing", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id) p.gap = Number(e.target.value);
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                />
              </label>
              <label>
                Columns
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={l.columns}
                  onChange={(e) =>
                    change("Change layout columns", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id) p.columns = Number(e.target.value);
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                />
              </label>
              <label>
                Mobile columns
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={l.mobileColumns ?? 1}
                  onChange={(e) =>
                    change("Change responsive columns", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id)
                          p.mobileColumns = Number(e.target.value);
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                />
              </label>
              <label>
                Alignment
                <select
                  value={l.alignment ?? "stretch"}
                  onChange={(e) =>
                    change("Change layout alignment", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id)
                          p.alignment = e.target.value as Layout["alignment"];
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                >
                  {["stretch", "start", "center", "end"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Font
                <select
                  value={l.font ?? "inherit"}
                  onChange={(e) =>
                    change("Change layout typography", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id)
                          p.font = e.target.value as Layout["font"];
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                >
                  {["inherit", "system", "serif", "mono"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Font size
                <input
                  type="number"
                  min={12}
                  max={32}
                  value={l.fontSize ?? 16}
                  onChange={(e) =>
                    change("Change layout font size", (d) => {
                      function update(p: Layout) {
                        if (p.id === l.id) p.fontSize = Number(e.target.value);
                        p.children.forEach(update);
                      }
                      update(d.layout);
                    })
                  }
                />
              </label>
              {(["visibleWhen", "disabledWhen", "theme"] as const).map(
                (binding) => (
                  <label key={binding}>
                    {binding === "visibleWhen"
                      ? "Visible when"
                      : binding === "disabledWhen"
                        ? "Disabled when"
                        : "Theme"}
                    <select
                      value={l[binding] ? JSON.stringify(l[binding]) : ""}
                      onChange={(e) =>
                        change(`Change layout ${binding}`, (d) => {
                          function update(p: Layout) {
                            if (p.id === l.id) {
                              if (e.target.value)
                                p[binding] = JSON.parse(e.target.value);
                              else delete p[binding];
                            }
                            p.children.forEach(update);
                          }
                          update(d.layout);
                        })
                      }
                    >
                      <option value="">No binding</option>
                      {components.flatMap((node) =>
                        Object.entries(
                          publicDefinition(node.definition).outputs,
                        )
                          .filter(([, port]) =>
                            binding === "theme"
                              ? port.unit === "theme"
                              : port.schema?.type === "boolean" ||
                                port.unit === "boolean",
                          )
                          .map(([port]) => (
                            <option
                              key={`${node.id}:${port}`}
                              value={JSON.stringify({
                                node: node.id,
                                port,
                              })}
                            >
                              {node.label} · {port}
                            </option>
                          )),
                      )}
                    </select>
                  </label>
                ),
              )}
            </fieldset>
          ))}
      </details>
      {!current && (
        <>
          <label>
            Lesson title
            <input
              value={document.lesson.title}
              onChange={(e) =>
                change("Edit lesson title", (d) => {
                  d.lesson.title = e.target.value;
                })
              }
            />
          </label>
          <label>
            Instruction
            <textarea
              value={document.lesson.instruction}
              onChange={(e) =>
                change("Edit instruction", (d) => {
                  d.lesson.instruction = e.target.value;
                })
              }
            />
          </label>
        </>
      )}
    </div>
  );
}
