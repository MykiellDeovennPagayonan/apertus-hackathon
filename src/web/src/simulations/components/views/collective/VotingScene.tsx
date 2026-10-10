"use client";
import { useState } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import type { VotingState } from "../../systems/collective/voting";
import "./collective.css";
const colors = ["#c5794f", "#2f7b70", "#796db0", "#547eab", "#ae647d"],
  names = ["A", "B", "C", "D", "E"];
export function VotingScene({ instance }: { instance: ModelInstance }) {
  const s = instance.state as unknown as VotingState,
    r = s.rounds.at(-1);
  const [selected, setSelected] = useState(-1),
    [focus, setFocus] = useState(0);
  const voter = s.voters.find((v) => v.id === selected);
  return (
    <section
      className="collective-scene voting-scene"
      data-collective="voting"
      data-responsive-height="content"
      aria-label="Individual voters and their ballots"
    >
      <div className="collective-heading">
        <div>
          <span className="collective-eyebrow">
            Same voters, different rules
          </span>
          <h2>Who wins when the rule changes?</h2>
        </div>
        <span className="collective-stamp">
          {r ? `Round ${r.number}` : `${s.voters.length} voters`}
        </span>
      </div>
      <div className="vote-legend" data-candidates={s.candidateCount}>
        {names.slice(0, s.candidateCount).map((name, i) => (
          <div key={name} className={r?.winner === i ? "vote-winner" : ""}>
            <span style={{ background: colors[i] }}>{name}</span>
            <strong>Candidate {name}</strong>
            {r && (
              <b>
                {r.totals[i]} {s.rule === 2 ? "approvals" : "votes"}
              </b>
            )}
            {r?.winner === i && <em>Elected</em>}
            {s.rounds.some((x) => x.eliminated === i) && <em>Eliminated</em>}
          </div>
        ))}
      </div>
      <fieldset
        className="voter-grid"
        aria-label="Voters. Use arrow keys to inspect ballots."
      >
        {s.voters.map((v, i) => {
          const allocation =
            s.rule === 2 ? -1 : (r?.allocations[i] ?? v.ranking[0] ?? -1);
          return (
            <button
              type="button"
              key={v.id}
              className={`voter-dot ${r?.transfers.includes(i) ? "vote-transfer" : ""} ${selected === v.id ? "dot-selected" : ""}`}
              tabIndex={focus === i ? 0 : -1}
              aria-label={`Voter ${i + 1}. ${s.rule === 2 ? `Approves ${v.approvals.map((c) => names[c]).join(" and ") || "no candidates"}` : `Vote counts for ${allocation < 0 ? "no remaining candidate" : names[allocation]}`}`}
              onClick={() => setSelected(selected === v.id ? -1 : v.id)}
              onFocus={() => setFocus(i)}
              onKeyDown={(e) => {
                const columns = getComputedStyle(
                  e.currentTarget.parentElement ?? e.currentTarget,
                ).gridTemplateColumns.split(" ").length;
                const offset =
                  e.key === "ArrowRight"
                    ? 1
                    : e.key === "ArrowLeft"
                      ? -1
                      : e.key === "ArrowDown"
                        ? columns
                        : e.key === "ArrowUp"
                          ? -columns
                          : 0;
                if (offset) {
                  e.preventDefault();
                  const next = (i + offset + s.voters.length) % s.voters.length;
                  setFocus(next);
                  (
                    e.currentTarget.parentElement?.children[next] as HTMLElement
                  )?.focus();
                }
              }}
              style={{
                background:
                  s.rule === 2 && v.approvals.length
                    ? `conic-gradient(${v.approvals.map((c, j) => `${colors[c]} ${(j / v.approvals.length) * 100}% ${((j + 1) / v.approvals.length) * 100}%`).join(",")})`
                    : allocation < 0
                      ? "#b7b6b0"
                      : colors[allocation],
              }}
            >
              <span>
                {s.rule === 2
                  ? v.approvals.map((c) => names[c]).join("") || "—"
                  : allocation < 0
                    ? "—"
                    : names[allocation]}
              </span>
            </button>
          );
        })}
      </fieldset>
      <div className="vote-detail">
        {voter ? (
          <>
            <strong>Voter {voter.id + 1}</strong>
            <span>
              Preference: {voter.ranking.map((c) => names[c]).join(" → ")} ·
              Approves {voter.approvals.map((c) => names[c]).join(" and ")}
            </span>
          </>
        ) : (
          <span>One dot is one person. Select a dot to see its ballot.</span>
        )}
        {r && r.exhausted > 0 && (
          <span>{r.exhausted} ballots have no remaining choice.</span>
        )}
      </div>
    </section>
  );
}
