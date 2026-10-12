import { publicDefinition } from "../../components/catalog";
import type { ComponentInstance } from "../../runtime/authoring/types";
import type { ComponentCatalog } from "./useComponentCatalog";

export function DecorationSettings({
  node,
  catalog,
}: {
  node: ComponentInstance;
  catalog: ComponentCatalog;
}) {
  const config = {
    ...publicDefinition(node).defaults,
    ...node.configuration,
  };
  const patch = (key: string, value: unknown) =>
    catalog.change("Edit appearance", (document) => {
      const current = document.nodes.find((item) => item.id === node.id);
      if (current) current.configuration = { ...config, [key]: value };
    });
  const color = (label: string, key: string, fallback: string) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="color"
        value={String(config[key] === "transparent" ? fallback : config[key])}
        onChange={(event) => patch(key, event.target.value)}
      />
    </label>
  );
  const number = (label: string, key: string, max: number, step = 1) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min={0}
        max={max}
        step={step}
        value={Number(config[key])}
        onChange={(event) => {
          if (event.target.value !== "")
            patch(key, Math.max(0, Math.min(max, Number(event.target.value))));
        }}
      />
    </label>
  );
  return (
    <>
      {node.definition === "displays/Text" && (
        <>
          <label>
            Text
            <textarea
              aria-label="Text"
              value={String(config.text)}
              onChange={(event) => patch("text", event.target.value)}
            />
          </label>
          <label>
            Text style
            <select
              aria-label="Text style"
              value={String(config.variant)}
              onChange={(event) => patch("variant", event.target.value)}
            >
              <option value="body">Body</option>
              <option value="heading">Heading</option>
              <option value="callout">Callout</option>
            </select>
          </label>
        </>
      )}
      <label className="composition-toggle">
        <input
          type="checkbox"
          checked={Boolean(config.border)}
          onChange={(event) => patch("border", event.target.checked)}
        />
        Border
      </label>
      {Boolean(config.border) && (
        <>
          {color("Border color", "borderColor", "#d5cdbb")}
          {number("Border thickness", "borderWidth", 20)}
        </>
      )}
      {number("Corner radius", "borderRadius", 200)}
      <label className="composition-toggle">
        <input
          type="checkbox"
          checked={config.backgroundColor !== "transparent"}
          onChange={(event) =>
            patch(
              "backgroundColor",
              event.target.checked ? "#edf2e8" : "transparent",
            )
          }
        />
        Background fill
      </label>
      {config.backgroundColor !== "transparent" &&
        color("Fill color", "backgroundColor", "#edf2e8")}
      {number("Opacity", "opacity", 1, 0.05)}
      {node.definition === "displays/Box" && (
        <p>
          Drag and resize this box in Build. Select it and use More to move it
          in front of or behind other content.
        </p>
      )}
    </>
  );
}
