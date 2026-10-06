export type DynamicState = Record<string, unknown>;

export type GrowthState = DynamicState & {
  principal: number;
  annualRate: number;
  years: number;
};

export type TrafficVehicle = {
  id: number;
  position: number;
  speed: number;
};

export type TrafficState = DynamicState & {
  vehicleCount: number;
  roadLength: number;
  desiredSpeed: number;
  desiredHeadway: number;
  minimumGap: number;
  maximumAcceleration: number;
  comfortableBraking: number;
  seed: number;
  playing: boolean;
  elapsed: number;
  disturbanceRemaining: number;
  vehicles: TrafficVehicle[];
  speedHistory: { x: number; y: number }[];
};

export type QueueCustomer = {
  id: number;
  arrival: number;
  service: number;
};

export type QueueState = DynamicState & {
  arrivalRate: number;
  serviceRate: number;
  duration: number;
  cashiers: number;
  seed: number;
  customers: QueueCustomer[];
};
