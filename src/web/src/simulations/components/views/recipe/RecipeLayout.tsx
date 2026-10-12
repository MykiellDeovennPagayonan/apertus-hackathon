"use client";

import { memo, useContext, useId, useState } from "react";
import type { DocumentRuntime } from "../../../runtime/authoring/runtime";
import type { Layout } from "../../../runtime/authoring/types";
import { publicDefinition } from "../../catalog";
import { scalarControls } from "../../controls/controlContract";
import { PropertyInspector } from "../EntityInspectorView";

import { AuthorContext, SnapshotContext } from "./contexts";
import { display } from "./formatObservation";
import { NodeView } from "./NodeView";

function TabsLayout({
  layout,
  runtime,
}: {
  layout: Layout;
  runtime: DocumentRuntime;
}) {
  const [active, setActive] = useState(layout.children[0]?.id ?? "");
  const tabId = useId();
  const chosen =
    layout.children.find((l) => l.id === active) ?? layout.children[0];
  return (
    <section className="recipe-layout">
      <div role="tablist" aria-label={layout.label || "Sections"}>
        {layout.children.map((l, index) => (
          <button
            type="button"
            role="tab"
            aria-selected={chosen?.id === l.id}
            tabIndex={chosen?.id === l.id ? 0 : -1}
            id={`${tabId}-tab-${index}`}
            aria-controls={`${tabId}-panel-${index}`}
            key={l.id}
            onClick={() => setActive(l.id)}
            onKeyDown={(event) => {
              const direction =
                event.key === "ArrowRight"
                  ? 1
                  : event.key === "ArrowLeft"
                    ? -1
                    : 0;
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? layout.children.length - 1
                    : direction
                      ? (index + direction + layout.children.length) %
                        layout.children.length
                      : undefined;
              if (next === undefined) return;
              event.preventDefault();
              setActive(layout.children[next].id);
              const buttons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              buttons?.[next]?.focus();
            }}
          >
            {l.label || l.kind}
          </button>
        ))}
      </div>
      {layout.children.map((child, index) => (
        <div
          key={child.id}
          role="tabpanel"
          id={`${tabId}-panel-${index}`}
          aria-labelledby={`${tabId}-tab-${index}`}
          hidden={chosen?.id !== child.id}
        >
          <LayoutView layout={child} runtime={runtime} />
        </div>
      ))}
    </section>
  );
}
function LayoutView({
  layout,
  runtime,
  item,
  boardHosted,
}: {
  layout: Layout;
  runtime: DocumentRuntime;
  item?: Record<string, unknown>;
  boardHosted?: boolean;
}) {
  const snapshot = useContext(SnapshotContext);
  const author = useContext(AuthorContext);
  const boundValue = (
    endpoint?: import("../../../runtime/authoring/types").Endpoint,
  ) =>
    endpoint ? snapshot.outputs[endpoint.node]?.[endpoint.port] : undefined;
  if (layout.visibleWhen && boundValue(layout.visibleWhen) !== true)
    return null;
  const node = runtime.document.nodes.find((n) => n.id === layout.node);
  if (
    node?.definition === "displays/StatusMessage" ||
    node?.definition === "displays/Readout"
  ) {
    const binding = runtime.document.connections.find(
      (connection) =>
        connection.kind === "value" && connection.to.node === node.id,
    );
    const value = binding ? boundValue(binding.from) : undefined;
    if (
      binding?.from.port === "feedback" &&
      (value === "" || value == null) &&
      author.selected !== node.id
    )
      return null;
  }
  if (node?.definition === "layout/Repeater") {
    const binding = runtime.document.connections.find(
      (c) => c.kind === "value" && c.to.node === node.id,
    );
    const value = binding
        ? snapshot.outputs[binding.from.node]?.[binding.from.port]
        : undefined,
      rows = Array.isArray(value) ? value : [],
      field = String(node.configuration.itemKey);
    const keys = rows.map((row) =>
      row && typeof row === "object" ? String(row[field] ?? "") : "",
    );
    if (keys.some((k) => !k) || new Set(keys).size !== keys.length)
      return (
        <output className="recipe-disconnected" aria-live="polite">
          {author.authoring
            ? `Choose a unique, nonempty item key (${field}) in repeater settings.`
            : "These items are temporarily unavailable."}
        </output>
      );
    if (!rows.length)
      return (
        <p className="recipe-disconnected">
          {author.authoring && !binding
            ? "Connect a collection to show repeated items."
            : "No items to show yet."}
        </p>
      );
    // Repeater is a presentation projection; it never creates additional model instances or clocks.
    return (
      <section className="recipe-layout">
        {rows.map((row, i) => (
          <section key={keys[i]} aria-label={`Item ${keys[i]}`}>
            {layout.children.length ? (
              layout.children.map((child) => (
                <LayoutView
                  key={child.id}
                  layout={child}
                  runtime={runtime}
                  item={row}
                />
              ))
            ) : (
              <PropertyInspector label={`Item ${i + 1}`} value={row} />
            )}
          </section>
        ))}
      </section>
    );
  }
  const kind = node?.definition.startsWith("layout/")
    ? node.definition.split("/")[1].toLowerCase()
    : layout.kind;
  const nodeContent =
    node &&
    (item && node.definition === "displays/Text" ? (
      <p>
        {String(node.configuration.text).replace(
          /\{\{([a-zA-Z0-9_]+)\}\}/g,
          (_match, key) => display(item[key]),
        )}
      </p>
    ) : (
      <NodeView node={node} runtime={runtime} />
    ));
  const disconnected = node
    ? publicDefinition(node).category === "controls"
      ? !runtime.document.connections.some(
          (connection) =>
            connection.kind === "command" && connection.from.node === node.id,
        )
      : publicDefinition(node).category === "displays" &&
          ![
            "displays/Text",
            "displays/ImportedHTML",
            "displays/Box",
            "displays/Formula",
            "displays/Legend",
            "displays/DataTable",
            "displays/Chart",
            "displays/Histogram",
            "displays/Heatmap",
          ].includes(node.definition)
        ? !runtime.document.connections.some(
            (connection) =>
              connection.kind === "value" && connection.to.node === node.id,
          )
        : false
    : false;
  const content = (
    <>
      {node ? (
        <section
          className={
            author.authoring
              ? `recipe-component-item recipe-author-item${node.definition === "displays/Text" ? " recipe-text-card" : ""}${author.selected === node.id ? " is-selected" : ""}`
              : `recipe-component-item${node.definition === "displays/Text" ? " recipe-text-card" : ""}`
          }
          style={
            node.definition === "displays/Text" ||
            node.definition === "displays/Box"
              ? {
                  border: node.configuration.border
                    ? `${Number(node.configuration.borderWidth ?? 1)}px solid ${String(node.configuration.borderColor ?? "#d5cdbb")}`
                    : "none",
                  borderRadius: Number(node.configuration.borderRadius ?? 0),
                  background: String(
                    node.configuration.backgroundColor ?? "transparent",
                  ),
                  opacity: Number(node.configuration.opacity ?? 1),
                  boxShadow: "none",
                }
              : undefined
          }
          data-component-definition={node.definition}
          data-decoration={
            node.definition === "displays/Box" ? "box" : undefined
          }
          aria-label={
            author.authoring ? `${node.label} authoring controls` : undefined
          }
        >
          {author.authoring && !boardHosted && (
            <div className="recipe-author-label">
              <span>{node.label}</span>
              <button
                type="button"
                aria-label={`Edit ${node.label}`}
                title={`Edit ${node.label}`}
                onClick={() => author.onSelect?.(node.id)}
              >
                <span aria-hidden="true">✎</span>
              </button>
            </div>
          )}
          {author.authoring &&
          disconnected &&
          !scalarControls.has(node.definition) ? (
            <div className="recipe-disconnected">
              <strong>{node.label} needs a connection</strong>
              <p>Connect it in component settings to show learner content.</p>
              <button type="button" onClick={() => author.onSelect?.(node.id)}>
                Open settings
              </button>
            </div>
          ) : (
            nodeContent
          )}
        </section>
      ) : (
        nodeContent
      )}
      {layout.children.map((l) => (
        <LayoutView
          key={l.id}
          layout={l}
          runtime={runtime}
          item={item}
          boardHosted={boardHosted}
        />
      ))}
      {author.authoring && !node && !layout.children.length && (
        <div className="recipe-empty-layout">
          <strong>{layout.label || "Empty layout area"}</strong>
          <p>Add or move a component here to include it in the lesson.</p>
        </div>
      )}
    </>
  );
  const theme = boundValue(layout.theme),
    themeTokens =
      theme && typeof theme === "object"
        ? (theme as Record<string, unknown>)
        : undefined,
    font = layout.font ?? String(themeTokens?.font ?? "inherit"),
    style = {
      gap: Number(
        node?.definition.startsWith("layout/")
          ? node.configuration.gap
          : layout.gap,
      ),
      "--desktop-columns": node?.definition.startsWith("layout/")
        ? node.configuration.columns
        : layout.columns,
      alignItems: layout.alignment ?? "stretch",
      fontFamily:
        font === "serif"
          ? "Georgia, serif"
          : font === "mono"
            ? "ui-monospace, monospace"
            : font === "system"
              ? "system-ui, sans-serif"
              : undefined,
      fontSize:
        layout.fontSize || themeTokens?.fontSize
          ? `${layout.fontSize ?? Number(themeTokens?.fontSize)}px`
          : undefined,
      "--recipe-font-size":
        layout.fontSize || themeTokens?.fontSize
          ? `${layout.fontSize ?? Number(themeTokens?.fontSize)}px`
          : undefined,
      "--mobile-columns": layout.mobileColumns ?? 1,
      ...(themeTokens
        ? {
            color: String(themeTokens.foreground),
            backgroundColor: String(themeTokens.background),
            "--recipe-accent": String(themeTokens.accent),
          }
        : {}),
    } as React.CSSProperties;
  const disabled =
    Boolean(layout.disabledWhen) && boundValue(layout.disabledWhen) === true;
  if (kind === "tabs")
    return (
      <section
        className="recipe-layout recipe-tabs"
        style={style}
        aria-disabled={disabled || undefined}
        inert={disabled || undefined}
      >
        <TabsLayout layout={layout} runtime={runtime} />
      </section>
    );
  if (kind === "disclosure")
    return (
      <details
        className="recipe-layout"
        style={style}
        aria-disabled={disabled || undefined}
        inert={disabled || undefined}
      >
        <summary>
          {layout.label || String(node?.configuration.label ?? "Details")}
        </summary>
        {content}
      </details>
    );
  return (
    <section
      className={`recipe-layout recipe-${kind}`}
      style={style}
      aria-disabled={disabled || undefined}
      inert={disabled || undefined}
    >
      {layout.label && (!boardHosted || !author.authoring) && (
        <h3>{layout.label}</h3>
      )}
      {content}
    </section>
  );
}
export const PresentationLayout = memo(LayoutView);
