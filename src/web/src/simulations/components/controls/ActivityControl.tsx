import { useEffect, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import type { FractionValue, MathBoard } from "../traits/MathBoards";
import { ActionButton } from "./ActionButton";
import { FractionEntry } from "./FractionEntry";
import { NumberField } from "./NumberField";

export function ActivityControl({
  kind,
  state,
  onSubmit,
}: {
  kind:
    | "GroupingActivity"
    | "FractionComparisonActivity"
    | "NumberLineActivity";
  state: Record<string, unknown>;
  onSubmit: (args: Record<string, unknown>) => ActionResult;
}) {
  const [feedback, setFeedback] = useState("");
  const board = state as unknown as MathBoard;
  const submit = (value: unknown) => {
    const result = onSubmit({ value });
    setFeedback(result.accepted ? "" : result.error);
    return result;
  };
  if (kind === "GroupingActivity" && board.demo === "equal-groups")
    return (
      <div className="activity-control">
        <NumberField
          presentation="slider"
          label="Number of circles"
          value={board.total}
          min={0}
          max={60}
          onChange={(total) =>
            submit({ mode: "share", total, groups: board.groups, perGroup: 0 })
          }
        />
        <NumberField
          presentation="slider"
          label="Number of baskets"
          value={board.groups}
          min={1}
          max={6}
          onChange={(groups) =>
            submit({ mode: "share", total: board.total, groups, perGroup: 0 })
          }
        />
      </div>
    );
  if (
    kind === "FractionComparisonActivity" &&
    board.demo === "fraction-builder"
  )
    return (
      <div className="activity-control">
        {board.bars.map((bar, i) => (
          <div className="exploration-fraction" key={bar.id}>
            <NumberField
              presentation="slider"
              label={`Bar ${i === 0 ? "A" : "B"} equal parts`}
              value={bar.value.d}
              min={1}
              max={12}
              onChange={(d) =>
                submit({
                  a: i === 0 ? { n: 0, d } : board.bars[0].value,
                  b: i === 1 ? { n: 0, d } : board.bars[1].value,
                })
              }
            />
          </div>
        ))}
      </div>
    );
  if (kind === "NumberLineActivity" && board.demo === "fraction-number-line") {
    const task = (a: FractionValue, b: FractionValue, mode = board.mode) =>
      submit({ a, b, mode });
    return (
      <div className="activity-control">
        <fieldset className="task-operation" aria-label="Number line activity">
          {(["place", "add", "subtract"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={board.mode === mode}
              onClick={() => task(board.a, board.b, mode)}
            >
              {mode === "place"
                ? "Place"
                : mode === "add"
                  ? "+ Add"
                  : "− Subtract"}
            </button>
          ))}
        </fieldset>
        {[board.a, ...(board.mode === "place" ? [] : [board.b])].map((f, i) => {
          const label =
            board.mode === "place"
              ? "Target"
              : i === 0
                ? "First fraction"
                : "Second fraction";
          const edit = (next: FractionValue) =>
            task(i === 0 ? next : board.a, i === 1 ? next : board.b);
          return (
            <FractionEntry
              key={label}
              label={label}
              value={f}
              onChange={edit}
            />
          );
        })}
        {feedback && (
          <p role="alert" className="catalog-feedback--error">
            {feedback}
          </p>
        )}
      </div>
    );
  }
  return (
    <p role="alert">Connect these activity controls to their matching model.</p>
  );
}
export function TrialControl({
  state,
  onSubmit,
}: {
  state: Record<string, unknown>;
  onSubmit: (args: Record<string, unknown>) => ActionResult;
}) {
  const [valid, setValid] = useState(true);
  const [preset, setPreset] = useState(String(state.preset));
  const [trials, setTrials] = useState(Number(state.trials));
  useEffect(() => {
    setPreset(String(state.preset));
    setTrials(Number(state.trials));
  }, [state]);
  return (
    <div className="activity-control">
      <fieldset className="task-operation" aria-label="Random experiment">
        {["coin", "die"].map((p) => (
          <button
            type="button"
            key={p}
            aria-pressed={preset === p}
            onClick={() => setPreset(p)}
          >
            {p === "coin" ? "Coin" : "Six-sided die"}
          </button>
        ))}
      </fieldset>
      <NumberField
        presentation="quantity"
        onValidityChange={setValid}
        label="Number of trials"
        value={trials}
        min={1}
        max={10000}
        onChange={(n) => {
          setTrials(n);
          return { accepted: true };
        }}
      />
      <ActionButton
        disabled={!valid}
        intent="primary"
        onCommand={() => {
          const result = onSubmit({
            value: { preset, trials, seed: (Number(state.seed) + 1) >>> 0 },
          });
          return result;
        }}
      >
        Run {trials.toLocaleString()} trials
      </ActionButton>
      <p aria-live="polite">Each run draws a new sample.</p>
    </div>
  );
}
