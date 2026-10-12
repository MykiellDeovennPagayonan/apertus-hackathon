import type { CompositionRequirements } from "./explorationTeaching";

const scene =
  "Scene first: the attached scene already labels the quantities, so add no generic readouts, playback or dashboard. At most two independent objects may compare settings; preserve unrelated settings on follow-ups.";

/** Plan 028 MATH-01–10 composition requirements (A1). */
export const mathGeometryRequirements: Record<string, CompositionRequirements> =
  {
    "prefabs/math-geometry/PlaceValue": {
      topic:
        "Decimal place value with base-ten blocks: multiplying and dividing by ten, and exchanging blocks without changing the number",
      selectionKey: "decimal-place-value",
      selectionGroup: "math-geometry",
      guidance: `Build an independent attached place-value scene and three buttons: PLACE_TIMES_TEN labelled "× 10", PLACE_DIVIDE_TEN labelled "÷ 10", and PLACE_BREAK_TENTH labelled "Break 1 tenth into 10 hundredths". Default start=12.34. A different starting number sets start (0–999.99, at most two decimal places) and keeps the buttons. Multiplying moves every block one column left; exchanging keeps the value. Negative numbers, more than two starting decimal places and numbers of 1000 or more are unsupported. ${scene}`,
      commands: ["PLACE_TIMES_TEN", "PLACE_DIVIDE_TEN", "PLACE_BREAK_TENTH"],
      observations: [],
      appearance: "appearance/math-place-value",
    },
    "prefabs/math-geometry/Pythagorean": {
      topic:
        "Pythagorean theorem: ladder length from ground distance and wall contact height in a right triangle",
      selectionKey: "pythagorean",
      selectionGroup: "math-geometry",
      guidance:
        "Show a ladder against a perpendicular wall with a worked Pythagorean calculation. Use an independent attached scene, foot-distance slider and wall-contact-height slider. The scene shows ladder length, the Pythagorean theorem and its square-root calculation; omit a duplicate ladderLength readout. Omitted conditions keep defaults distance=3 m and height=4 m. Preserve height when only the foot moves. At most two independently configured ladders may compare distances. No playback, inverse-leg solver, dissection animation or extra dashboard.",
      commands: ["set:distance", "set:height"],
      observations: [],
      appearance: "appearance/math-pythagorean",
    },
    "prefabs/math-geometry/TreeHeight": {
      topic:
        "Trigonometry: measuring a tree's height from a horizontal distance and a sight angle (tangent)",
      selectionKey: "tree-height",
      selectionGroup: "math-geometry",
      guidance: `Build an attached tree scene, an observer-distance slider (set:observerDistance, metres) and a sight-angle slider (set:sightAngle, degrees) used to aim at the top of a fixed tree. Defaults observerDistance=10 m, sightAngle=30° (aimed too low so the learner aims), eyeHeight=1.5 m, treeHeight=11.5 m; the line meets the tree at eyeHeight + distance × tan(angle), and 45° touches the top from 10 m. When the learner states a distance and an angle to the top, set those and set treeHeight = eyeHeight + distance × tan(angle). Moving the observer never changes treeHeight; keep the angle when only the distance changes. Angles are limited to 1–80°; a 90° vertical sight line has no triangle and is unsupported, as are sloped ground and measurement-error games. ${scene}`,
      commands: ["set:observerDistance", "set:sightAngle"],
      observations: [],
      appearance: "appearance/math-tree-height",
    },
    "prefabs/math-geometry/ScaleDrawing": {
      topic:
        "Scale drawings and similar shapes: how enlarging a floor plan changes lengths and area",
      selectionKey: "scale-floor-plan",
      selectionGroup: "math-geometry",
      guidance: `Build an attached floor-plan scene and one scale-factor slider (set:scaleFactor, 0.25–4). Defaults roomWidth=3 m, roomLength=4 m, scaleFactor=1, roomShape="rectangle"; roomShape="L" removes one quarter of the room. Doubling means scaleFactor=2: lengths ×2, area ×4. Keep the scale factor when only the room shape or size changes. Stretching one direction only is not similar and is unsupported. ${scene}`,
      commands: ["set:scaleFactor"],
      observations: [],
      appearance: "appearance/math-scale-drawing",
    },
    "prefabs/math-geometry/RigidMotion": {
      topic:
        "Reflections, rotations and translations: the difference between flipping, turning and sliding a shape",
      selectionKey: "flip-turn-slide",
      selectionGroup: "math-geometry",
      guidance: `Build an attached grid scene and three buttons: MOTION_FLIP "Flip across the mirror line", MOTION_TURN "Turn 90° about the dot" and MOTION_RESTART "Start again". Add MOTION_SLIDE "Slide 3 squares right" or MOTION_UNDO only when sliding or undoing is requested. The mirror line, turn centre and slide distance are fixed; operations apply in order (default operations=[]). Stretching or resizing is not a rigid motion and is unsupported. ${scene}`,
      commands: ["MOTION_FLIP", "MOTION_TURN", "MOTION_RESTART"],
      observations: [],
      appearance: "appearance/math-rigid-motion",
    },
    "prefabs/math-geometry/RegularTiling": {
      topic:
        "Tessellations: why regular hexagons, squares and triangles tile with no gaps but regular pentagons do not",
      selectionKey: "tile-patterns",
      selectionGroup: "math-geometry",
      guidance: `Build an attached corner-fit scene and one whole-number slider for tileSides (set:tileSides, 3–12). Default tileSides=6; a pentagon is tileSides=5 and a square 4. The scene shows the angle gap. Do not claim that no pentagon can tile: some irregular pentagons do; mixed-polygon tilings are unsupported. ${scene}`,
      commands: ["set:tileSides"],
      observations: [],
      appearance: "appearance/math-tiling",
    },
    "prefabs/math-geometry/CubeNet": {
      topic:
        "Cube nets: which arrangements of six squares fold into a closed cube",
      selectionKey: "cube-nets",
      selectionGroup: "math-geometry",
      guidance: `Build an attached net scene and two buttons: NET_FOLD "Fold it" and NET_NEXT "Try another shape". Presets: 0 Cross, 1 Straight strip, 2 Staircase, 3 2 × 3 block, 4 Row of five plus one, 5 Two rows of three, 6 Flaps on opposite sides, 7 U shape (default preset=0, folded=false). A specific arrangement may set cells to exactly six edge-connected squares {x,y} from 0 to 5. Other square counts or non-cube boxes are unsupported. ${scene}`,
      commands: ["NET_FOLD", "NET_NEXT"],
      observations: [],
      appearance: "appearance/math-cube-net",
    },
    "prefabs/math-geometry/CanPackaging": {
      topic:
        "Packaging optimization: which can shape uses the least metal for a fixed volume",
      selectionKey: "can-material",
      selectionGroup: "math-geometry",
      guidance: `Build an attached can scene and one radius slider (set:canRadius, centimetres); height follows the fixed volume. Defaults canVolume=500 cm³, canRadius=2.5 cm, canClosed=true. A different capacity sets canVolume (100–2000) and keeps the radius; an open cup sets canClosed=false. A zero or negative radius is unsupported. ${scene}`,
      commands: ["set:canRadius"],
      observations: [],
      appearance: "appearance/math-can",
    },
    "prefabs/math-geometry/BoxPacking": {
      topic:
        "Packing boxes into a container: turning boxes sideways and why volume division is only an upper limit",
      selectionKey: "box-packing",
      selectionGroup: "math-geometry",
      guidance: `Build an attached bin scene and two buttons: PACK_TURN "Turn the boxes" and PACK_MIX "Mix two directions". Defaults bin 40×30×20 cm (binLength, binWidth, binHeight) and boxes 25×15×10 cm (boxLength, boxWidth, boxHeight), orientation=0, mixed=false. Specific sizes set those dimensions in centimetres (1–300). Boxes are rigid; squashing, weight and stacking strength are unsupported. ${scene}`,
      commands: ["PACK_TURN", "PACK_MIX"],
      observations: [],
      appearance: "appearance/math-box-packing",
    },
    "prefabs/math-geometry/FencedGarden": {
      topic:
        "Quadratics through a fencing problem: which rectangle encloses the most area with a fixed fence",
      selectionKey: "fencing-garden",
      selectionGroup: "math-geometry",
      guidance: `Build an attached garden scene and one garden-width slider (set:gardenWidth, metres, below half the fence). Defaults fenceLength=20 m, gardenWidth=2 m, againstWall=false. A different fence sets fenceLength and keeps a valid width; three sides against a wall sets againstWall=true. A side as long as or longer than half the fence is impossible and unsupported. ${scene}`,
      commands: ["set:gardenWidth"],
      observations: [],
      appearance: "appearance/math-fencing",
    },
  };
