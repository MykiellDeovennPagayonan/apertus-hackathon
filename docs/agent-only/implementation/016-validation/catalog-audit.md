# Catalog Audit for Agentic Composition and Physics

Date: 2026-10-07
Author: Antigravity Agent

## 1. Overview of Catalog Categories

Total public definitions: 169
- **models (42):** 
  - Arithmetic/Elementary math: `counting`, `arithmetic`, `equal-groups`, `fraction-builder`, `fraction-number-line`, `ratio`, `area-perimeter`, `coordinates`, `probability`.
  - Foundations/Prefabs: `Equation`, `Line`, `Circle`.
  - Spatial/Town/Bridge: `Projectile`, `TrussJoint`, `TrussMember`, `BridgeLoad`, `BridgeResponse`, `TownBuilding`, `Market`, `DailyRoutine`, `TownNavigation`, `ScheduledTrip`, `AuthoredLine`, `AuthoredSquare`, `AuthoredGround`, `AuthoredBuilding`, `AuthoredRoad`, `AuthoredPerson`, `AuthoredFractionBar`.
  - Chemistry: `prefabs/chemistry/Dilution`, `Conservation`, `ReactionRate`, `AuthoredGasContainer`.
  - Physical systems:
    - `prefabs/physical-systems/Pendulum` (Period, angle, length, gravity)
    - `prefabs/physical-systems/RollingTrack` (Ramp exit onto rolling-resistance floor; parameters: `height`, `resistance` $\mu$, `gravity`, `playing`; outputs: `entrySpeed`, `deceleration`, `stopTime`, `stoppingDistance`, `speed`, `distance`, `stopped`, `points`)
    - `prefabs/physical-systems/ResistiveCircuit` (Bulbs, voltage, current, power)
  - Natural systems: `DiffusionField`, `PredatorPrey`, `PlantGrowth`.
  - Dynamic systems: `CompoundGrowth`, `RingTraffic`, `CheckoutQueue`.
- **controls (21):** `controls/Slider`, `controls/NumberInput`, `controls/Toggle`, `controls/Select`, `controls/ActionButton`, etc.
- **displays (12):** `readout`, `inspector`, `views/DatasetDisplay`, `dataPresentation`, etc.
- **appearance (39):** `appearance/physical-track`, `appearance/physical-pendulum`, `appearance/physical-circuit`, etc.
- **canvases (5):** `canvases/cartesian`, `canvases/spatial`, `canvases/town`, etc.
- **behaviors (16):** `behaviors/*`.
- **resources (26):** Presets, tasks, palettes.
- **layout (8):** Arrangers, repeaters.

## 2. Findings on Physics, Friction, Weight, and Momentum

1. **Friction:**
   - Present via `prefabs/physical-systems/RollingTrack`.
   - Parameter `resistance`: dimensionless rolling resistance / friction coefficient $\mu \in [0, 1]$.
   - Commands: `ROLL_SET_RESISTANCE` (absolute $\mu$), `ROLL_SCALE_RESISTANCE` (multiplicative factor), `ROLL_SET_HEIGHT`, `ROLL_SET_GRAVITY`.
   - Physics modeled: $v^2 = 2gh$, $a = \mu g$, stopping distance $s = h / \mu$.
2. **Weight / Mass:**
   - Absent from `RollingTrack` (in rolling resistance without drag, mass cancels out of $a = \mu g$).
   - Present only in `models/Projectile` (`mass` in kg for visual/ballistic presets, but drag is not modeled) and `models/BridgeLoad` (`loadTons`).
3. **Momentum ($p = mv$):**
   - Completely absent across all 169 definitions.
   - No component computes momentum or supports momentum collisions/conservation.

## 3. Decision for Prompt: "I wanna know the difference if I have higher friction or weight in momentum"

Per Section 8 of the spec:
- The prompt explicitly asks to compare higher friction vs weight in momentum.
- **Friction** can be demonstrated via `prefabs/physical-systems/RollingTrack` (showing how higher friction/resistance increases deceleration and reduces stopping distance).
- **Weight and Momentum** are NOT supported by the runtime engine.
- Result contract:
  - If treated as partial: build a `RollingTrack` comparison with varying friction/resistance, and explicitly state in the lesson explanation that mass/weight and momentum calculations are unavailable.
  - If treated as unsupported: return `status: "unsupported"` stating that weight/mass variations and momentum calculations are outside the runtime engine's physical models.
  - Under no circumstances shall arithmetic, bridge, or projectile be relabeled as momentum.
