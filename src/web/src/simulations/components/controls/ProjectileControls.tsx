import { useState } from "react";
import { useProjectileStore } from "../../runtime/projectileSession";
import { dispatchCommand } from "../../runtime/session";
import { GravityPresets } from "../resources/GravityPresets";
import { ControlsOverlay } from "../views/ControlsOverlay";
import { ActionButton } from "./ActionButton";
import { OptionSelect } from "./OptionSelect";
import { ParameterSlider } from "./ParameterSlider";
import "../views/projectile.css";

export function ProjectileControls() {
  const s = useProjectileStore();
  const [selected, setSelected] = useState(s.primary.id);
  const ball = s.instances.find((i) => i.id === selected) ?? s.primary;
  return (
    <>
      <section className="experiment-interaction" aria-label="Launch controls">
        <div className="experiment-fields">
          {s.instances.length > 1 && (
            <label>
              Adjust
              <select
                aria-label="Selected ball"
                value={ball.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {s.instances.map((i, n) => (
                  <option key={i.id} value={i.id}>
                    Ball {n + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ParameterSlider
            label="Angle"
            display={`${ball.launch.angle}°`}
            value={ball.launch.angle}
            min={0}
            max={90}
            onChange={(value) =>
              dispatchCommand("projectile", {
                type: "SET_ANGLE",
                target: ball.id,
                value,
              })
            }
          />
          <ParameterSlider
            label="Throw speed"
            display={`${ball.launch.velocity} m/s`}
            value={ball.launch.velocity}
            min={5}
            max={40}
            onChange={(value) =>
              dispatchCommand("projectile", {
                type: "SET_VELOCITY",
                target: ball.id,
                value,
              })
            }
          />
        </div>
        <div className="experiment-fields experiment-actions">
          <ActionButton
            onCommand={() => dispatchCommand("projectile", { type: "LAUNCH" })}
          >
            Throw again
          </ActionButton>
          <ActionButton
            onCommand={() =>
              dispatchCommand("projectile", {
                type: "SET_PLAYING",
                value: !s.playing,
              })
            }
          >
            {s.playing ? "Pause" : "Play"}
          </ActionButton>
          <ActionButton
            className="experiment-reset"
            onCommand={() => dispatchCommand("projectile", { type: "RESET" })}
          >
            Reset
          </ActionButton>
          <span className="experiment-note">
            {s.gravityName} gravity · {s.gravity} m/s²
          </span>
        </div>
      </section>
      <ControlsOverlay>
        <OptionSelect
          label="Gravity"
          value={s.gravityName.toLowerCase()}
          options={GravityPresets.map((p) => ({ id: p.id, label: p.label }))}
          onChange={(value) =>
            dispatchCommand("projectile", { type: "SET_GRAVITY", value })
          }
        />
        <label>
          <input
            type="checkbox"
            checked={s.showVectors}
            onChange={(e) =>
              dispatchCommand("projectile", {
                type: e.target.checked ? "SHOW_VECTORS" : "HIDE_VECTORS",
              })
            }
          />{" "}
          Show velocity vectors
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.slowMo}
            onChange={(e) =>
              dispatchCommand("projectile", {
                type: "SET_SLOW_MO",
                value: e.target.checked,
              })
            }
          />{" "}
          Slow motion
        </label>
      </ControlsOverlay>
    </>
  );
}
export default ProjectileControls;
