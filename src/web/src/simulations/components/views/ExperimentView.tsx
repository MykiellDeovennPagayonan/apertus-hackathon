"use client";
import dynamic from "next/dynamic";
import { isElementaryDemo } from "../../runtime/elementarySession";
import { isMathDemo } from "../../runtime/mathModel";
import { getActiveDefinition } from "../../runtime/session";
import type { DemoType } from "../../runtime/types";
import { BridgeControls } from "../controls/BridgeControls";
import { ProjectileControls } from "../controls/ProjectileControls";
import { TownControls } from "../controls/TownControls";
import { BridgeScene } from "./BridgeScene";
import { DomainObservationViews } from "./DomainObservationViews";
import { ElementaryExperimentView } from "./ElementaryExperimentView";
import { MathExperimentView } from "./MathExperimentView";
import { ProjectileObservationViews } from "./ProjectileObservationViews";
import { ProjectileScene } from "./ProjectileScene";
import { XYGraphView } from "./XYGraphView";

const ThreeWorldView = dynamic(() => import("./ThreeWorldView"), {
  ssr: false,
  loading: () => <div aria-live="polite">Loading the town…</div>,
});
export function ExperimentView({ demo }: { demo: DemoType }) {
  if (isMathDemo(demo)) return <MathExperimentView demo={demo} />;
  if (isElementaryDemo(demo)) return <ElementaryExperimentView />;
  const views = getActiveDefinition()?.components.views ?? [];
  if (demo === "projectile")
    return (
      <div className="projectile-demo">
        <div className="projectile-demo__scene">
          {views.includes("SVGWorldView") && <ProjectileScene />}
        </div>
        <div className="projectile-demo__bottom">
          <ProjectileControls />
          {views.includes("XYGraphView") && <XYGraphView />}
        </div>
        <ProjectileObservationViews />
      </div>
    );
  if (demo === "bridge")
    return (
      <>
        {views.includes("SVGWorldView") && <BridgeScene />}
        <BridgeControls />
        <DomainObservationViews demo={demo} />
      </>
    );
  return (
    <div className="town-demo">
      <div className="town-demo__scene">
        {views.includes("ThreeWorldView") && <ThreeWorldView />}
      </div>
      <TownControls />
      <DomainObservationViews demo={demo} />
    </div>
  );
}
