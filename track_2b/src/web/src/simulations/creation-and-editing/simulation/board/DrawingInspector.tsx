import { useRef } from "react";
import type { DrawingItem } from "../../authoring-engine/drawings";
import { DrawingIcon } from "./DrawingIcon";

const colors = [
  "#30362e",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#ffffff",
];
export function DrawingInspector({
  item,
  onChange,
  onAction,
  onLayer,
  onLock,
}: {
  item: DrawingItem;
  onChange: (change: Partial<DrawingItem>, group?: string) => void;
  onAction: (action: "copy" | "duplicate" | "delete") => void;
  onLayer: (action: "back" | "backward" | "forward" | "front") => void;
  onLock: () => void;
}) {
  const session = useRef("");
  const changeStyle = (
    key: keyof DrawingItem["style"],
    value: string | number,
    group?: string,
  ) => onChange({ style: { ...item.style, [key]: value } }, group);
  const palette = (
    label: string,
    value: string,
    onPick: (color: string) => void,
    transparent = false,
  ) => (
    <fieldset className="drawing-palette">
      <legend>{label}</legend>
      <div>
        {(transparent ? ["transparent", ...colors] : colors).map((color) => (
          <button
            type="button"
            key={color}
            aria-label={`${label} ${color}`}
            aria-pressed={value === color}
            title={color === "transparent" ? "None" : color}
            className={color === "transparent" ? "is-transparent" : ""}
            style={{ backgroundColor: color }}
            data-color-swatch
            data-selected={value === color}
            onClick={() => onPick(color)}
          >
            {value === color && (
              <span className="drawing-swatch-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
      <label className="drawing-custom-color">
        <input
          aria-label={`${label} custom color`}
          type="color"
          data-custom-selected={
            value !== "transparent" && !colors.includes(value)
          }
          value={value === "transparent" ? "#30362e" : value}
          onChange={(event) => onPick(event.target.value)}
        />
        <span>{value === "transparent" ? "None" : value.toUpperCase()}</span>
      </label>
    </fieldset>
  );
  const number = (
    label: string,
    value: number,
    min: number,
    max: number,
    onValue: (value: number) => void,
  ) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          if (event.target.value !== "")
            onValue(Math.max(min, Math.min(max, Number(event.target.value))));
        }}
      />
    </label>
  );
  return (
    <aside
      className="drawing-inspector"
      aria-label={`${item.kind === "text" ? "Text" : "Box"} settings`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="drawing-inspector-title">
        {item.kind === "text" ? "Text" : "Box"}
      </div>
      <fieldset disabled={item.locked} className="drawing-appearance-fields">
        {item.kind === "text" ? (
          <>
            <label>
              Text sizing
              <select
                aria-label="Text sizing"
                value={item.sizing}
                onChange={(event) =>
                  onChange({
                    sizing: event.target.value as DrawingItem["sizing"],
                  })
                }
              >
                <option value="auto">Auto size</option>
                <option value="wrap">Fixed width</option>
              </select>
            </label>
            {item.sizing === "wrap" &&
              number("Text width", item.rect.width, 24, 10000, (width) =>
                onChange({ rect: { ...item.rect, width } }),
              )}
            <p className="drawing-sizing-help">
              {item.sizing === "auto"
                ? "Text grows as you type. Enter adds a new line."
                : "Text wraps at this width; height fits the content."}
            </p>
            {palette("Text color", item.color, (color) => onChange({ color }))}
            <label>
              Font family
              <select
                aria-label="Font family"
                value={item.fontFamily}
                onChange={(event) =>
                  onChange({
                    fontFamily: event.target.value as DrawingItem["fontFamily"],
                  })
                }
              >
                <option value="system">System</option>
                <option value="serif">Serif</option>
                <option value="mono">Monospace</option>
              </select>
            </label>
            <fieldset>
              <legend>Font size</legend>
              <div className="drawing-choice-row">
                {[
                  ["S", 16],
                  ["M", 24],
                  ["L", 32],
                  ["XL", 48],
                ].map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={`Font size ${label}`}
                    aria-pressed={item.fontSize === value}
                    onClick={() => onChange({ fontSize: Number(value) })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {number("Font size", item.fontSize, 8, 160, (fontSize) =>
              onChange({ fontSize }),
            )}
            <fieldset>
              <legend>Text align</legend>
              <div className="drawing-choice-row">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    aria-label={`Align ${align}`}
                    aria-pressed={item.align === align}
                    onClick={() => onChange({ align })}
                  >
                    <DrawingIcon name={align} />
                    <span className="board-sr">{align}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <details>
              <summary>Border and background</summary>
              {palette(
                "Border",
                item.style.stroke,
                (color) => changeStyle("stroke", color),
                true,
              )}
              {palette(
                "Background",
                item.style.fill,
                (color) => changeStyle("fill", color),
                true,
              )}
              {number("Border width", item.style.strokeWidth, 0, 20, (value) =>
                changeStyle("strokeWidth", value),
              )}
              {number("Corner radius", item.style.radius, 0, 200, (value) =>
                changeStyle("radius", value),
              )}
            </details>
          </>
        ) : (
          <>
            {palette(
              "Border",
              item.style.stroke,
              (color) => changeStyle("stroke", color),
              true,
            )}
            {palette(
              "Background",
              item.style.fill,
              (color) => changeStyle("fill", color),
              true,
            )}
            {number("Border width", item.style.strokeWidth, 0, 20, (value) =>
              changeStyle("strokeWidth", value),
            )}
            <label>
              Border style
              <select
                aria-label="Border style"
                value={item.style.strokeStyle}
                onChange={(event) =>
                  changeStyle("strokeStyle", event.target.value)
                }
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
              </select>
            </label>
            {number("Corner radius", item.style.radius, 0, 200, (value) =>
              changeStyle("radius", value),
            )}
          </>
        )}
        <label>
          Opacity <span>{Math.round(item.style.opacity * 100)}%</span>
          <input
            aria-label="Opacity"
            type="range"
            min={0}
            max={100}
            value={Math.round(item.style.opacity * 100)}
            onPointerDown={() => {
              session.current = `opacity/${item.id}/${crypto.randomUUID()}`;
            }}
            onKeyDown={() => {
              if (!session.current)
                session.current = `opacity/${item.id}/${crypto.randomUUID()}`;
            }}
            onBlur={() => {
              session.current = "";
            }}
            onChange={(event) =>
              changeStyle(
                "opacity",
                Number(event.target.value) / 100,
                session.current || undefined,
              )
            }
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Layers</legend>
        <div className="drawing-choice-row">
          {(
            [
              ["back", "Send to back", "⇊"],
              ["backward", "Send backward", "↓"],
              ["forward", "Bring forward", "↑"],
              ["front", "Bring to front", "⇈"],
            ] as const
          ).map(([action, label, _icon]) => (
            <button
              key={action}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => onLayer(action)}
            >
              <DrawingIcon name={action} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Actions</legend>
        <div className="drawing-choice-row">
          {(["copy", "duplicate", "delete"] as const).map((action) => (
            <button
              key={action}
              type="button"
              aria-label={`${action} drawing`}
              title={action}
              onClick={() => onAction(action)}
            >
              <DrawingIcon name={action} />
            </button>
          ))}
          <button
            type="button"
            aria-label={item.locked ? "Unlock drawing" : "Lock drawing"}
            title={item.locked ? "Unlock" : "Lock"}
            aria-pressed={item.locked}
            onClick={onLock}
          >
            <DrawingIcon name={item.locked ? "lock" : "unlock"} />
          </button>
        </div>
      </fieldset>
    </aside>
  );
}
