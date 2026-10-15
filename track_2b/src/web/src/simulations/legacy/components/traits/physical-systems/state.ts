export interface PendulumParameters {
  length: number;
  gravity: number;
  amplitude: number;
  playing: boolean;
}
export interface TrackParameters {
  height: number;
  resistance: number;
  gravity: number;
  playing: boolean;
}
export interface TimedState {
  elapsed: number;
  playing: boolean;
}
export type PendulumState = PendulumParameters & TimedState;
export type TrackState = TrackParameters & TimedState;
export type Topology = "series" | "parallel";
export interface CircuitState {
  voltage: number;
  resistance: number;
  bulbs: number;
  topology: Topology;
}
export interface Terminal {
  component: string;
  port: "positive" | "negative" | "a" | "b";
}
export interface CircuitWire {
  type: "electrical-wire";
  from: Terminal;
  to: Terminal;
}
