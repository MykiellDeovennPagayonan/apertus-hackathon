import { useProjectileStore } from "../../runtime/projectileSession";
import { dispatchCommand } from "../../runtime/session";
import { GravityPresets } from "../resources/GravityPresets";
import { MetricsView } from "../views/MetricsView";
import { ActionButton } from "./ActionButton";
import { OptionSelect } from "./OptionSelect";
import { ParameterSlider } from "./ParameterSlider";
import { PlaybackControls } from "./PlaybackControls";
import "../views/projectile.css";
export function ProjectileControls() {
  const s = useProjectileStore(),
    m = s.primary.metrics;
  return (
    <div className="proj-controls">
      <div className="proj-controls__row">
        <ParameterSlider
          label="Angle"
          display={`${s.angle}°`}
          value={s.angle}
          min={0}
          max={90}
          onChange={(value) =>
            dispatchCommand("projectile", { type: "SET_ANGLE", value })
          }
        />
        <ParameterSlider
          label="Throw speed"
          display={`${s.velocity} m/s`}
          value={s.velocity}
          min={5}
          max={40}
          onChange={(value) =>
            dispatchCommand("projectile", { type: "SET_VELOCITY", value })
          }
        />
        <details>
          <summary>Explore more</summary>
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
        </details>
      </div>
      <div className="proj-controls__row">
        <ActionButton
          onCommand={() => dispatchCommand("projectile", { type: "LAUNCH" })}
        >
          Throw again
        </ActionButton>
        <PlaybackControls
          playing={s.playing}
          slowMo={s.slowMo}
          onPlaying={(value) =>
            dispatchCommand("projectile", { type: "SET_PLAYING", value })
          }
          onSlowMo={(value) =>
            dispatchCommand("projectile", { type: "SET_SLOW_MO", value })
          }
        />
        <ActionButton
          onCommand={() => dispatchCommand("projectile", { type: "RESET" })}
        >
          Reset
        </ActionButton>
      </div>
      <MetricsView
        className="proj-controls__metrics"
        values={[
          { label: "Distance", value: `${m.range.toFixed(2)} m` },
          { label: "Maximum height", value: `${m.maxHeight.toFixed(2)} m` },
          { label: "flight time", value: `${m.duration.toFixed(2)} s` },
          { label: `${s.gravityName} gravity`, value: `${s.gravity} m/s²` },
        ]}
      />
    </div>
  );
}
export default ProjectileControls;
