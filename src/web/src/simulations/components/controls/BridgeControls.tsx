import { useBridgeStore } from "../../runtime/bridgeSession";
import { dispatchCommand } from "../../runtime/session";
import { ActionButton } from "./ActionButton";
import { ParameterSlider } from "./ParameterSlider";
export function BridgeControls() {
  const s = useBridgeStore();
  return (
    <div className="bridge-controls">
      <ParameterSlider
        label="Load position"
        value={s.loadPos}
        min={0.05}
        max={0.95}
        step={0.01}
        onChange={(value) =>
          dispatchCommand("bridge", { type: "MOVE_LOAD", value })
        }
      />
      <ParameterSlider
        label="Load"
        display={`${s.loadTons} t`}
        value={s.loadTons}
        min={2}
        max={30}
        onChange={(value) =>
          dispatchCommand("bridge", { type: "SET_LOAD", value })
        }
      />
      <ActionButton
        onCommand={() => dispatchCommand("bridge", { type: "REBUILD" })}
      >
        Rebuild
      </ActionButton>
      <span className="bridge-controls__note">
        Conceptual structural visualization — not an engineering design tool.
      </span>
    </div>
  );
}
export default BridgeControls;
