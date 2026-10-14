import { TownSceneryVisual3D } from "./TownSceneryVisual3D";
/** Compatibility visual alias. Instance visuals and lighting are explicit World recipe attachments. */
export default function TownEnvironment({
  night = false,
}: {
  night?: boolean;
}) {
  return <TownSceneryVisual3D night={night} />;
}
