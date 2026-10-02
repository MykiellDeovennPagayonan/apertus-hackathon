import { ArithmeticSystem } from "../components/systems/ArithmeticSystem";
import { BallisticMotionSystem } from "../components/systems/BallisticMotionSystem";
import { BehaviorRunnerSystem } from "../components/systems/BehaviorRunnerSystem";
import { CountingSystem } from "../components/systems/CountingSystem";
import {
  RandomTrialSystem,
  RatioSystem,
  RectangleMetricsSystem,
} from "../components/systems/ElementarySystems";
import { EqualGroupingSystem } from "../components/systems/EqualGroupingSystem";
import { FractionBuilderSystem } from "../components/systems/FractionBuilderSystem";
import { FractionNumberLineSystem } from "../components/systems/FractionNumberLineSystem";
import { HeuristicBridgeResponseSystem } from "../components/systems/HeuristicBridgeResponseSystem";
import { MeasurementSamplingSystem } from "../components/systems/MeasurementSamplingSystem";
import { NavigationSystem } from "../components/systems/NavigationSystem";
import { PathFollowingSystem } from "../components/systems/PathFollowingSystem";
/** Trusted provider code is separate from serializable definitions and recipes. */
export const systemProviders = {
  RatioSystem,
  RectangleMetricsSystem,
  RandomTrialSystem,
  MeasurementSamplingSystem,
  CountingSystem,
  ArithmeticSystem,
  EqualGroupingSystem,
  FractionBuilderSystem,
  FractionNumberLineSystem,

  BallisticMotionSystem,
  HeuristicBridgeResponseSystem,
  BehaviorRunnerSystem,
  NavigationSystem,
  PathFollowingSystem,
};
