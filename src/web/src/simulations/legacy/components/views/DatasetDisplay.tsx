"use client";

import { useEffect, useId, useState } from "react";
import {
  type DataPresentation,
  dataCell,
  formatDataNumber,
  type PresentedData,
  presentData,
} from "../../../registry/contracts/dataPresentation";
import "./data-display.css";

type Props = {
  value: unknown;
  kind: string;
  label: string;
  precision?: number;
  presentation?: DataPresentation;
  authoring?: boolean;
};
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
function DataState({
  state,
  authoring = false,
}: {
  state: string;
  authoring?: boolean;
}) {
  return (
    <p className="data-state" data-state={state}>
      <strong>
        {state === "empty"
          ? "No observations yet"
          : state === "unavailable"
            ? "Waiting for observations"
            : "These observations cannot be displayed"}
      </strong>
      <span>
        {state === "empty"
          ? "Observations will appear here when data is collected."
          : state === "unavailable"
            ? authoring
              ? "Connect a data source to this display’s value input."
              : "This display will update when observations are available."
            : authoring
              ? "Check the source data and display settings. Use a bounded set of records or a rectangular numeric grid."
              : "The source has not provided usable data. Other parts of the experiment are still available."}
      </span>
    </p>
  );
}
function ObservationTable({
  data,
  label,
  precision,
}: {
  data: PresentedData;
  label: string;
  precision: number;
}) {
  const note = useId();
  return (
    <>
      <p className="data-table-note" id={note}>
        {data.rows.length.toLocaleString()}{" "}
        {data.rows.length === 1 ? "observation" : "observations"} · Missing and
        invalid values are labeled.
      </p>
      <section
        className="data-table-scroll"
        aria-label={`${label} observations`}
        aria-describedby={note}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the bounded observation region.
        tabIndex={0}
      >
        <table className="data-table">
          <caption className="data-sr-only">{label}</caption>
          <thead>
            <tr>
              {data.columns.map((c) => (
                <th
                  scope="col"
                  key={c.key}
                  className={c.type === "number" ? "data-number" : undefined}
                >
                  {c.label}
                  {c.unit && <small> ({c.unit})</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Source-order rows have no interaction state.
              <tr key={index}>
                {data.columns.map((c) => {
                  const cell = dataCell(row[c.key], c, precision);
                  return (
                    <td
                      key={c.key}
                      className={`${c.type === "number" ? "data-number" : ""} ${cell.state !== "valid" ? "data-cell-state" : ""}`}
                    >
                      {cell.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
function DataEquivalent({
  data,
  label,
  precision,
}: {
  data: PresentedData;
  label: string;
  precision: number;
}) {
  return (
    <details className="data-equivalent">
      <summary>View observations</summary>
      <ObservationTable data={data} label={label} precision={precision} />
    </details>
  );
}
const patterns = ["", "8 4", "2 4", "10 3 2 3", "12 6", "4 3"];
function Chart({
  data,
  label,
  precision,
  presentation,
  histogram,
}: {
  data: PresentedData;
  label: string;
  precision: number;
  presentation: DataPresentation;
  histogram: boolean;
}) {
  const titleId = useId(),
    descriptionId = useId();
  const [plotElement, setPlotElement] = useState<HTMLElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(560);
  useEffect(() => {
    if (!plotElement) return;
    const measure = () => {
      if (plotElement.clientWidth > 0)
        setAvailableWidth(plotElement.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(plotElement);
    return () => observer.disconnect();
  }, [plotElement]);
  const xKey =
    presentation.xKey ||
    (data.columns.some((c) => c.key === "time")
      ? "time"
      : data.columns.some((c) => c.key === "x")
        ? "x"
        : undefined);
  const series = histogram
    ? ["observed", "expected"]
    : (presentation.series ??
      data.columns
        .filter((c) => c.type === "number" && c.key !== xKey && c.key !== "id")
        .map((c) => c.key));
  const columns = series.map((key) => data.columns.find((c) => c.key === key));
  const mixedUnits = new Set(columns.map((c) => c?.unit || "")).size > 1;
  if (
    !series.length ||
    series.length > 6 ||
    new Set(series).size !== series.length ||
    columns.some((c) => !c || (c.type && c.type !== "number")) ||
    mixedUnits ||
    (histogram &&
      (data.rows.length > 50 ||
        data.rows.some(
          (r) =>
            typeof r.outcome !== "string" ||
            !finite(r.observed) ||
            !finite(r.expected) ||
            r.observed < 0 ||
            r.expected < 0,
        )))
  )
    return (
      <>
        <p className="data-state">
          <strong>A plot is unavailable for these observations</strong>
          <span>
            {mixedUnits
              ? "Choose series with the same unit to compare them on one scale."
              : "The plot needs numeric series and compatible display settings."}{" "}
            The observations remain available below.
          </span>
        </p>
        <ObservationTable data={data} label={label} precision={precision} />
      </>
    );
  const valid = (row: Record<string, unknown>, index: number, key: string) => {
    if (!row) return false;
    const x = xKey ? row[xKey] : index + 1;
    return finite(x) && finite(row[key]);
  };
  const xs = data.rows.map((r, i) => (xKey ? r[xKey] : i + 1)).filter(finite);
  const ys = data.rows
    .flatMap((r, i) => series.filter((k) => valid(r, i, k)).map((k) => r[k]))
    .filter(finite);
  if (!ys.length || (!histogram && !xs.length))
    return (
      <>
        <DataState state="invalid" />
        <ObservationTable data={data} label={label} precision={precision} />
      </>
    );
  let xmin = Math.min(...xs),
    xmax = Math.max(...xs),
    ymin = Math.min(0, ...ys),
    ymax = Math.max(0, ...ys);
  if (xmin === xmax) {
    const padding = Math.max(0.5, Math.abs(xmin) * 0.01);
    xmin -= padding;
    xmax += padding;
  }
  if (ymin === ymax) ymax = ymin + 1;
  const rawStep = (ymax - ymin) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const factor = [1, 2, 2.5, 5, 10].find((n) => n >= rawStep / magnitude) ?? 10;
  const tickStep = magnitude * factor;
  if (Number.isFinite(tickStep) && tickStep > 0) {
    ymin = Math.floor(ymin / tickStep) * tickStep;
    ymax = Math.ceil(ymax / tickStep) * tickStep;
  }
  // Reject overflowing extents as well as nonfinite samples before constructing SVG geometry.
  if (![xmax - xmin, ymax - ymin].every(Number.isFinite))
    return (
      <>
        <DataState state="invalid" />
        <ObservationTable data={data} label={label} precision={precision} />
      </>
    );
  const compactWidth = Math.max(360, Math.min(760, availableWidth));
  const width = histogram
    ? Math.max(compactWidth, data.rows.length * 70 + 110)
    : compactWidth;
  const left = 80,
    right = width - 24,
    top = 24,
    bottom = 240;
  const xp = (x: number) =>
    left + ((x - xmin) / (xmax - xmin)) * (right - left);
  const yp = (y: number) =>
    bottom - ((y - ymin) / (ymax - ymin)) * (bottom - top);
  const xColumn = data.columns.find((c) => c.key === xKey);
  const xLabel =
    presentation.xLabel ||
    (histogram ? "Outcome" : xColumn?.label || "Observation");
  const xUnit = presentation.xUnit ?? xColumn?.unit;
  const yLabel =
    presentation.yLabel ||
    (histogram
      ? "Frequency"
      : series.length === 1
        ? columns[0]?.label
        : "Value");
  const yUnit = presentation.yUnit ?? columns[0]?.unit;
  const gaps =
    !histogram && data.rows.some((r, i) => series.some((k) => !valid(r, i, k)));
  return (
    <>
      <div className="data-axis-label">
        {yLabel}
        {yUnit && yUnit.toLowerCase() !== yLabel?.toLowerCase()
          ? ` (${yUnit})`
          : ""}
      </div>
      {availableWidth < width && (
        <p className="data-scroll-hint">
          Scroll the plot to inspect its full scale, or open the observations
          below.
        </p>
      )}
      <section
        ref={setPlotElement}
        className="data-plot-scroll"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the bounded observation region.
        tabIndex={0}
        aria-label={`${label} plot`}
      >
        <svg
          className="data-plot"
          style={{ minWidth: width }}
          viewBox={`0 0 ${width} 310`}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <title id={titleId}>{label}</title>
          <desc id={descriptionId}>
            {histogram
              ? "Solid bars show observed frequencies; outlined bars show expected frequencies."
              : `${yLabel} plotted against ${xLabel}. Series use distinct line patterns and markers.`}{" "}
            Exact values are available in View observations.
            {gaps ? " Missing or invalid values leave gaps in the plot." : ""}
          </desc>
          {Array.from(
            {
              length:
                Number.isFinite(tickStep) && tickStep > 0
                  ? Math.min(8, Math.round((ymax - ymin) / tickStep) + 1)
                  : 5,
            },
            (_, i) =>
              ymin +
              i *
                (Number.isFinite(tickStep) && tickStep > 0
                  ? tickStep
                  : (ymax - ymin) / 4),
          ).map((y) => {
            return (
              <g key={y}>
                <path
                  d={`M${left} ${yp(y)}H${right}`}
                  className="data-grid-line"
                />
                <text x={left - 10} y={yp(y) + 4} textAnchor="end">
                  {formatDataNumber(y, precision)}
                </text>
              </g>
            );
          })}
          <path
            d={`M${left} ${top}V${bottom}H${right}`}
            className="data-axis"
          />
          {histogram ? (
            data.rows.map((r, i) => {
              const slot = (right - left) / data.rows.length,
                x = left + i * slot + slot * 0.15,
                barWidth = slot * 0.3;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: Source-order bars have no interaction state.
                <g key={i}>
                  <rect
                    x={x}
                    y={yp(Number(r.observed))}
                    width={barWidth}
                    height={bottom - yp(Number(r.observed))}
                    className="data-bar-observed"
                  />
                  <rect
                    x={x + barWidth + 3}
                    y={yp(Number(r.expected))}
                    width={barWidth}
                    height={bottom - yp(Number(r.expected))}
                    className="data-bar-expected"
                  />
                  <text
                    x={left + (i + 0.5) * slot}
                    y={bottom + 24}
                    textAnchor="middle"
                  >
                    {String(r.outcome).length > 14
                      ? `${String(r.outcome).slice(0, 13)}…`
                      : String(r.outcome)}
                  </text>
                </g>
              );
            })
          ) : (
            <>
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const x = xmin + fraction * (xmax - xmin);
                return (
                  <text
                    key={fraction}
                    x={xp(x)}
                    y={bottom + 24}
                    textAnchor="middle"
                  >
                    {formatDataNumber(x, precision)}
                  </text>
                );
              })}
              {series.map((key, index) => {
                let connected = false;
                const d = data.rows
                  .map((row, i) => {
                    if (!valid(row, i, key)) {
                      connected = false;
                      return "";
                    }
                    const command = connected ? "L" : "M";
                    connected = true;
                    return `${command}${xp(Number(xKey ? row[xKey] : i + 1))} ${yp(Number(row[key]))}`;
                  })
                  .join(" ");
                return (
                  <g key={key} className={`data-series data-series--${index}`}>
                    <path
                      d={d}
                      fill="none"
                      strokeDasharray={patterns[index]}
                      strokeWidth={2.5}
                    />
                    {data.rows.map((r, i) =>
                      valid(r, i, key) &&
                      (data.rows.length <= 60 ||
                        (!valid(data.rows[i - 1], i - 1, key) &&
                          !valid(data.rows[i + 1], i + 1, key))) ? (
                        <circle
                          // biome-ignore lint/suspicious/noArrayIndexKey: Source-order markers have no interaction state.
                          key={i}
                          cx={xp(Number(xKey ? r[xKey] : i + 1))}
                          cy={yp(Number(r[key]))}
                          r={index % 2 ? 3.5 : 2.5}
                          fill={
                            index % 2 ? "var(--panel, #fffbef)" : "currentColor"
                          }
                        />
                      ) : null,
                    )}
                  </g>
                );
              })}
            </>
          )}
          <text x={(left + right) / 2} y={298} textAnchor="middle">
            {xLabel}
            {xUnit ? ` (${xUnit})` : ""}
          </text>
        </svg>
      </section>
      <ul className="data-series-legend" aria-label="Plot series">
        {series.map((key, i) => (
          <li key={key}>
            <svg
              width="36"
              height="18"
              aria-hidden="true"
              className={`data-series data-series--${i}`}
            >
              {histogram ? (
                <rect
                  x="3"
                  y="3"
                  width="28"
                  height="12"
                  className={i ? "data-bar-expected" : "data-bar-observed"}
                />
              ) : (
                <path
                  d="M2 9H34"
                  strokeWidth="2.5"
                  strokeDasharray={patterns[i]}
                />
              )}
            </svg>
            <span>
              {columns[i]?.label}
              {histogram
                ? i
                  ? " · outlined"
                  : " · solid"
                : ` · ${["solid", "dashed", "dotted", "dash-dot", "long dash", "short dash"][i]}`}
            </span>
          </li>
        ))}
      </ul>
      {gaps && (
        <p className="data-table-note">
          Missing or invalid observations leave gaps; they are not plotted as
          zero.
        </p>
      )}
      <DataEquivalent data={data} label={label} precision={precision} />
    </>
  );
}
function Heatmap({
  value,
  label,
  presentation,
  precision,
  authoring,
}: Omit<Props, "kind"> & {
  presentation: DataPresentation;
  precision: number;
}) {
  const id = useId();
  if (value == null)
    return <DataState state="unavailable" authoring={authoring} />;
  if (Array.isArray(value) && !value.length) return <DataState state="empty" />;
  if (
    !Array.isArray(value) ||
    !value.every(Array.isArray) ||
    !value[0]?.length ||
    value.length * value[0].length > 4096 ||
    value.some((r) => r.length !== value[0].length || !r.every(finite))
  )
    return <DataState state="invalid" authoring={authoring} />;
  const grid = value as number[][],
    values = grid.flat(),
    min = Math.min(...values),
    max = Math.max(...values);
  if (!Number.isFinite(max - min))
    return <DataState state="invalid" authoring={authoring} />;
  const color = (v: number) => {
    const t = max === min ? 0.5 : (v - min) / (max - min);
    return `rgb(${Math.round(239 - t * 199)},${Math.round(233 - t * 139)},${Math.round(220 - t * 134)})`;
  };
  const width = Math.max(400, grid[0].length * 24 + 90),
    height = Math.max(280, grid.length * 24 + 80),
    cellW = (width - 90) / grid[0].length,
    cellH = (height - 80) / grid.length;
  const data: PresentedData = {
    state: "ready",
    columns: [
      {
        key: "row",
        label: presentation.rowLabel || "Row",
        type: "number",
        precision: 0,
      },
      {
        key: "column",
        label: presentation.columnLabel || "Column",
        type: "number",
        precision: 0,
      },
      {
        key: "value",
        label: presentation.valueLabel || "Value",
        unit: presentation.valueUnit,
        type: "number",
      },
    ],
    rows: grid.flatMap((r, y) =>
      r.map((v, x) => ({ row: y + 1, column: x + 1, value: v })),
    ),
  };
  return (
    <>
      <div className="data-axis-label">
        {presentation.rowLabel || "Row"} ·{" "}
        {presentation.valueLabel || "Cell value"}
        {presentation.valueUnit ? ` (${presentation.valueUnit})` : ""}
      </div>
      <p className="data-scroll-hint">
        Scroll the grid to inspect every cell, or open the observations below.
      </p>
      <section
        className="data-plot-scroll data-heatmap-scroll"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the bounded observation region.
        tabIndex={0}
        aria-label={`${label} grid`}
      >
        <svg
          className="data-plot"
          style={{ minWidth: width }}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={id}
        >
          <title
            id={id}
          >{`${label}. ${grid.length} rows and ${grid[0].length} columns. Values from ${formatDataNumber(min, precision)} to ${formatDataNumber(max, precision)}. Exact cell values are available in View observations.`}</title>
          {grid.flatMap((r, y) =>
            r.map((v, x) => (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: Fixed grid coordinates are identities.
                key={`${x}/${y}`}
                x={65 + x * cellW}
                y={20 + y * cellH}
                width={cellW}
                height={cellH}
                fill={color(v)}
                stroke="var(--panel, #fffbef)"
                strokeWidth="0.5"
              />
            )),
          )}
          {grid.map((_, y) =>
            y === 0 || y === grid.length - 1 || grid.length <= 15 ? (
              <text
                // biome-ignore lint/suspicious/noArrayIndexKey: Fixed row coordinates are identities.
                key={y}
                x={52}
                y={20 + (y + 0.5) * cellH + 4}
                textAnchor="end"
              >
                {y + 1}
              </text>
            ) : null,
          )}
          {grid[0].map((_, x) =>
            x === 0 || x === grid[0].length - 1 || grid[0].length <= 15 ? (
              <text
                // biome-ignore lint/suspicious/noArrayIndexKey: Fixed column coordinates are identities.
                key={x}
                x={65 + (x + 0.5) * cellW}
                y={height - 38}
                textAnchor="middle"
              >
                {x + 1}
              </text>
            ) : null,
          )}
          <text x={width / 2} y={height - 10} textAnchor="middle">
            {presentation.columnLabel || "Column"}
          </text>
        </svg>
      </section>
      <div className="data-scale">
        <span>{formatDataNumber(min, precision)}</span>
        <span
          className="data-scale-gradient"
          aria-hidden="true"
          style={min === max ? { background: color(min) } : undefined}
        />
        <span>{formatDataNumber(max, precision)}</span>
      </div>
      <p className="data-table-note">
        {min === max
          ? "Every cell has the same value."
          : "Darker cells have higher values."}{" "}
        Row and column numbers start at 1.
      </p>
      <DataEquivalent data={data} label={label} precision={precision} />
    </>
  );
}
export function DatasetDisplay({
  value,
  kind,
  label,
  precision = 3,
  presentation = {},
  authoring = false,
}: Props) {
  const data =
    kind === "Heatmap" ? undefined : presentData(value, presentation);
  return (
    <figure className="data-display" aria-label={label}>
      <figcaption className="data-display-title">{label}</figcaption>
      {kind === "Heatmap" ? (
        <Heatmap
          value={value}
          label={label}
          precision={precision}
          presentation={presentation}
          authoring={authoring}
        />
      ) : (
        data &&
        (data.state !== "ready" ? (
          <DataState state={data.state} authoring={authoring} />
        ) : kind === "DataTable" ? (
          <ObservationTable data={data} label={label} precision={precision} />
        ) : (
          <Chart
            data={data}
            label={label}
            precision={precision}
            presentation={presentation}
            histogram={kind === "Histogram"}
          />
        ))
      )}
      {data?.assumption && <p className="data-assumption">{data.assumption}</p>}
    </figure>
  );
}
