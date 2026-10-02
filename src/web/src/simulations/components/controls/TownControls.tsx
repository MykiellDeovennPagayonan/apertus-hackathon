import { dispatchCommand } from "../../runtime/session";
import { useTownStore } from "../../runtime/townSession";
import { CITIZEN_COUNT } from "../resources/TownLayout";
import { MetricsView } from "../views/MetricsView";
import { ActionButton } from "./ActionButton";
import { ParameterSlider } from "./ParameterSlider";
import { PlaybackControls } from "./PlaybackControls";
import "../views/town.css";
function fmt(t: number) {
  const h = Math.floor(t) % 24,
    m = Math.floor((t % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export function TownControls() {
  const s = useTownStore();
  return (
    <div className="town-controls">
      <ParameterSlider
        label={fmt(s.time)}
        className="town-controls__time"
        value={s.time}
        min={0}
        max={24}
        step={0.1}
        onChange={(value) =>
          dispatchCommand("town", { type: "SET_TIME", value })
        }
      />
      <PlaybackControls
        playing={s.playing}
        speed={s.speed}
        speeds={[1, 2, 4]}
        onPlaying={(value) =>
          dispatchCommand("town", { type: "SET_PLAYING", value })
        }
        onSpeed={(value) =>
          dispatchCommand("town", { type: "SET_SPEED", value })
        }
      />
      <MetricsView
        className="town-controls__count"
        values={[{ label: "citizens", value: `${CITIZEN_COUNT} ` }]}
      />
      <ActionButton
        onCommand={() => dispatchCommand("town", { type: "RESET" })}
      >
        Reset town
      </ActionButton>
      {s.roadClosed && (
        <span className="town-controls__badge">Main road closed</span>
      )}
      {s.marketBusy && (
        <span className="town-controls__badge">Market busy</span>
      )}
    </div>
  );
}
export default TownControls;
