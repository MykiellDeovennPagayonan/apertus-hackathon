module.exports.cases = [
  {
    id: "pendulum",
    prompt: "pendulum sim",
    definition: "prefabs/physical-systems/Pendulum",
  },
  {
    id: "traffic",
    prompt: "why does traffic stop when theres no accident",
    definition: "prefabs/dynamic-systems/RingTraffic",
  },
  {
    id: "circuit",
    prompt:
      "Build a circuit where I can add bulbs and switch between series and parallel. Show what happens to their brightness.",
    definition: "prefabs/physical-systems/ResistiveCircuit",
  },
  {
    id: "eclipse",
    prompt:
      "I’m teaching eclipses tomorrow. Can you make something students can move around to see when an eclipse happens?",
    definition: "models/EclipseGeometry",
  },
  {
    id: "sound",
    prompt:
      "something with sound waves? like noise cancelling headphones, let me try it",
    definition: "data/SignalSuperposition",
  },
];
