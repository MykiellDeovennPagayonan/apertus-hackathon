import { motion } from "framer-motion";
import { BridgeStyles } from "../resources/BridgeStyles";
import type { Joint, Member } from "../traits/MemberEndpoints";
import type { MemberResponse } from "../traits/MemberResponse";
import { bridgeDrop } from "./bridgeDeformation";

interface Props {
  member: Member;
  joints: Joint[];
  toXY: (j: Joint) => { x: number; y: number };
  loadPos: number;
  response: MemberResponse;
  sag: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function BeamVisual({
  member,
  joints,
  toXY,
  loadPos,
  response,
  sag,
  selected,
  onSelect,
}: Props) {
  const ja = joints.find((j) => j.id === member.a);
  const jb = joints.find((j) => j.id === member.b);
  if (!ja || !jb) throw new Error("Truss member references a missing joint");
  const pa = toXY(ja);
  const pb = toXY(jb);
  const stress = response.score;
  const dropA = bridgeDrop(ja.x, loadPos, sag),
    dropB = bridgeDrop(jb.x, loadPos, sag);

  const hue =
    stress > BridgeStyles.high
      ? BridgeStyles.highColor
      : stress > BridgeStyles.medium
        ? BridgeStyles.mediumColor
        : BridgeStyles.lowColor;

  return (
    <motion.line
      x1={pa.x}
      y1={pa.y + dropA}
      x2={pb.x}
      y2={pb.y + dropB}
      stroke={selected ? BridgeStyles.selectedColor : hue}
      strokeWidth={
        selected
          ? BridgeStyles.selectedWidth
          : member.kind === "deck"
            ? BridgeStyles.deckWidth
            : BridgeStyles.memberWidth
      }
      strokeLinecap="round"
      strokeDasharray={
        response.classification === "tension"
          ? BridgeStyles.tensionDash
          : undefined
      }
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x1: pa.x,
        x2: pb.x,
        y1: pa.y + dropA,
        y2: pb.y + dropB,
      }}
      transition={{ duration: 0.3 }}
      style={{ cursor: "pointer" }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect member ${member.id}`}
      onKeyDown={(event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          onSelect(member.id);
        }
      }}
      onClick={() => onSelect(member.id)}
      data-force={response.classification}
    />
  );
}

export default BeamVisual;
