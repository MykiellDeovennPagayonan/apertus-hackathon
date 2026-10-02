import { useTownStore } from "../../runtime/townSession";
import { BuildingVisual3D } from "./BuildingVisual3D";
import { MarketVisual3D } from "./MarketVisual3D";
import { RoadVisual3D } from "./RoadVisual3D";
import { TownSceneryVisual3D } from "./TownSceneryVisual3D";
export default function TownEnvironment() {
  const buildings = useTownStore((s) => s.buildings),
    market = useTownStore((s) => s.market);
  const night = useTownStore((s) => s.time < 6 || s.time >= 19),
    busy = useTownStore((s) => s.marketBusy),
    closed = useTownStore((s) => s.roadClosed);
  return (
    <>
      <TownSceneryVisual3D night={night} />
      <RoadVisual3D closed={closed} />
      {buildings.map(({ building: b }, i) =>
        b.kind === "square" ? null : (
          <BuildingVisual3D key={b.id} building={b} index={i} night={night} />
        ),
      )}
      <MarketVisual3D market={market.building} busy={busy} />
    </>
  );
}
