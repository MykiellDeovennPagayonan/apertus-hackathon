import { dispatchCommand } from "../../runtime/session";
import type { DemoType } from "../../runtime/types";
export function EntityInspectorView({
  demo,
  id,
  parameters,
  outputs,
  assumptions,
}: {
  demo: DemoType;
  id: string;
  parameters: Record<string, unknown>;
  outputs: Record<string, unknown>;
  assumptions: readonly string[];
}) {
  return (
    <details>
      <summary>Inspect {id}</summary>
      <dl>
        {Object.entries({ ...parameters, ...outputs }).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>
              {typeof value === "object"
                ? JSON.stringify(value)
                : String(value)}
            </dd>
          </div>
        ))}
      </dl>
      {demo === "projectile" && (
        <label>
          Launch speed (m/s){" "}
          <input
            aria-label={`${id} speed`}
            type="range"
            min="5"
            max="40"
            step="1"
            value={Number(parameters.speed)}
            onChange={(e) =>
              dispatchCommand(demo, {
                type: "SET_VELOCITY",
                target: id,
                value: Number(e.target.value),
              })
            }
          />
        </label>
      )}
      <ul>
        {assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </details>
  );
}
