import { useEffect, useRef, useState } from "react";
import { canvasNames } from "./definitions";
import type { CompositionScene, ObjectKind } from "./model";
export type LibraryRequest = { category: string; target?: string };
export type ComponentChoice =
  | ObjectKind
  | "canvas"
  | "slider"
  | "number"
  | "toggle"
  | "readout"
  | "intersection"
  | "comparison"
  | "button"
  | "trip";
type Choice = {
  kind: ComponentChoice;
  label: string;
  description: string;
  category: string;
};
export function CompositionLibrary({
  scene,
  request,
  onClose,
  onAdd,
}: {
  scene: CompositionScene;
  request: LibraryRequest | null;
  onClose: () => void;
  onAdd: (choice: ComponentChoice) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const [category, setCategory] = useState("all"),
    [query, setQuery] = useState("");
  useEffect(() => {
    if (request) {
      opener.current = document.activeElement as HTMLElement;
      setCategory(request.category);
      setQuery("");
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      if (opener.current?.isConnected) opener.current.focus();
      else
        document
          .querySelector<HTMLButtonElement>("[data-composition-add]")
          ?.focus();
    }
  }, [request]);
  const choices: Choice[] = [
    {
      kind: "canvas",
      label: canvasNames[scene.kind],
      description:
        scene.kind === "cartesian"
          ? "Empty axes. Connect lines and shapes to it. Add more than one plane."
          : scene.kind === "town"
            ? "Empty space. Connect ground, houses and people to it."
            : "Empty display space. Connect independent objects to it.",
      category: "canvases",
    },
    ...(scene.kind === "cartesian"
      ? [
          {
            kind: "line",
            label: "Line",
            description:
              "An infinite line with draggable handles, slope, intercept and color.",
            category: "objects",
          },
          {
            kind: "square",
            label: "Square",
            description:
              "A square with size, rotation, fill and outline settings.",
            category: "objects",
          },
        ]
      : scene.kind === "physical"
        ? [
            {
              kind: "gas",
              label: "Gas container",
              description:
                "One independent container with one gas sample, properties and pressure output.",
              category: "objects",
            },
          ]
        : scene.kind === "diagram"
          ? [
              {
                kind: "fraction-bar",
                label: "Fraction bar",
                description:
                  "An independent equal-whole bar with editable partitions and shading.",
                category: "objects",
              },
            ]
          : [
              {
                kind: "ground",
                label: "Ground",
                description:
                  "A walkable surface with editable dimensions and color.",
                category: "objects",
              },
              {
                kind: "building",
                label: "House / building",
                description:
                  "An independent building, entrance and destination.",
                category: "objects",
              },
              {
                kind: "road",
                label: "Road",
                description: "A rectangular road that can be open or closed.",
                category: "objects",
              },
              {
                kind: "person",
                label: "Person",
                description:
                  "A person with a spawn point, spawn time and walking speed.",
                category: "objects",
              },
            ]
    ).map((c) => c as Choice),
    {
      kind: "slider",
      label: "Slider",
      description:
        "Connect its value to a numeric property, such as slope or size.",
      category: "controls",
    },
    {
      kind: "number",
      label: "Number input",
      description: "A learner control for precise numeric changes.",
      category: "controls",
    },
    {
      kind: "toggle",
      label: "Toggle",
      description: "Connect to an on / off property, such as square fill.",
      category: "controls",
    },
    {
      kind: "button",
      label: "Action button",
      description:
        "Connect to a supported action, such as subdivide or canvas reset.",
      category: "controls",
    },
    {
      kind: "readout",
      label: "Readout",
      description: "Connect a calculated output to display it in the lesson.",
      category: "results",
    },
    ...(scene.kind === "cartesian"
      ? [
          {
            kind: "intersection",
            label: "Intersection",
            description:
              "Connect two different lines on the same plane to calculate their intersection.",
            category: "results",
          } as Choice,
        ]
      : scene.kind === "diagram"
        ? [
            {
              kind: "comparison",
              label: "Comparison",
              description:
                "Connect two different fraction bars on the same diagram canvas.",
              category: "results",
            } as Choice,
          ]
        : scene.kind === "physical"
          ? []
          : [
              {
                kind: "trip",
                label: "Scheduled trip",
                description:
                  "Connect a person and a destination; set when to depart.",
                category: "behaviors",
              } as Choice,
            ]),
  ];
  const filtered = choices.filter(
    (c) =>
      (category === "all" || category === c.category) &&
      `${c.label} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <dialog
      ref={dialog}
      className="composition-library"
      aria-label="Add a component"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>Add a component</h2>
        <button
          type="button"
          aria-label="Close component library"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <label>
        Search
        <input
          autoFocus
          type="search"
          placeholder="Line, plane, slider…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <nav aria-label="Component categories">
        {[
          "all",
          "canvases",
          "objects",
          "controls",
          "results",
          ...(scene.kind === "town" ? ["behaviors"] : []),
        ].map((cat) => (
          <button
            type="button"
            key={cat}
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
          >
            {cat[0].toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </nav>
      {filtered.map((c) => (
        <button
          type="button"
          key={c.kind}
          disabled={
            c.kind === "canvas"
              ? (scene.workspace?.canvases.length ?? 0) >= 8
              : [
                    "line",
                    "square",
                    "ground",
                    "building",
                    "road",
                    "person",
                    "gas",
                    "fraction-bar",
                  ].includes(c.kind)
                ? scene.objects.length >= 64
                : c.category === "controls"
                  ? scene.controls.length >= 40
                  : c.category === "results"
                    ? scene.measurements.length >= 40
                    : (scene.workspace?.trips.length ?? 0) >= 128
          }
          onClick={() => onAdd(c.kind)}
        >
          <strong>+ {c.label}</strong>
          <span>{c.description}</span>
        </button>
      ))}
      {!filtered.length && <p>No matching components.</p>}
    </dialog>
  );
}
