"use client";
import { useEffect, useRef, useState } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import type { foodWebMeasure } from "../../systems/ecology/foodWeb";
import {
  type FoodSpeciesId,
  foodWebLinks,
  foodWebSpecies,
  nutrientReturnLinks,
  speciesById,
} from "../../systems/ecology/foodWebSpecies";

export function FoodWebVisual({
  instance,
  onSelect,
  onCommand,
}: {
  instance: ModelInstance;
  onSelect?: (selection: number) => void;
  onCommand?: (command: string, value?: unknown) => void;
}) {
  const scene = instance.outputs.scene as ReturnType<
    typeof foodWebMeasure
  >["scene"];
  const selected = foodWebSpecies[scene.selection];
  const [foodChoice, setFoodChoice] = useState<FoodSpeciesId>();
  const [consumerChoice, setConsumerChoice] = useState<FoodSpeciesId>();
  const [query, setQuery] = useState("");
  const directory = useRef<HTMLDialogElement>(null);
  const [history, setHistory] = useState<number[]>([]);
  const previousSelection = useRef(scene.selection);
  const returning = useRef(false);
  useEffect(() => {
    if (scene.selection === previousSelection.current) return;
    const previous = previousSelection.current;
    if (!returning.current) setHistory((h) => [...h.slice(-19), previous]);
    previousSelection.current = scene.selection;
    returning.current = false;
  }, [scene.selection]);
  const details = useRef<HTMLDialogElement>(null);
  const flows = [
    ...foodWebLinks.map((e) => ({ ...e, kind: "feeding" })),
    ...nutrientReturnLinks.map((e) => ({ ...e, kind: "nutrient" })),
  ];
  const food = flows
    .filter((e) => e.consumer === selected.id)
    .map((e) => e.food);
  const consumers = flows
    .filter((e) => e.food === selected.id)
    .map((e) => e.consumer);
  const navigate = (species: FoodSpeciesId) => {
    const index = foodWebSpecies.findIndex((s) => s.id === species);
    details.current?.close();
    directory.current?.close();
    if (index === scene.selection) return;
    onSelect?.(index);
  };
  const resource =
    foodChoice && food.includes(foodChoice) ? foodChoice : food[0];
  const consumer =
    consumerChoice && consumers.includes(consumerChoice)
      ? consumerChoice
      : consumers[0];
  const card = (
    key: FoodSpeciesId | undefined,
    side: "food" | "selected" | "consumer",
  ) => {
    if (!key)
      return (
        <div className="food-path-empty">
          {side === "food"
            ? selected.role === "Producer"
              ? "Sunlight and soil nutrients support this plant."
              : "Dead plants and animals become part of this resource."
            : "No animal in this selected web eats this organism."}
        </div>
      );
    const species = speciesById(key),
      change = scene.values[key] - 100;
    return (
      <button
        type="button"
        className={`food-path-card ${side === "selected" ? "is-selected" : ""}`}
        onClick={() =>
          side === "selected" ? details.current?.showModal() : navigate(key)
        }
        aria-label={`Explore ${species.name}`}
      >
        <span className="food-path-animal" aria-hidden="true">
          {species.icon}
        </span>
        <strong>{species.name}</strong>
        <span>
          {scene.settings[key] === 0
            ? "Removed from this scenario"
            : change === 0
              ? "Population unchanged"
              : `${Math.abs(change)}% ${change > 0 ? "more" : "fewer"} than baseline`}
        </span>
        <small>
          {side === "selected"
            ? "Learn about this organism"
            : "Follow this organism →"}
        </small>
      </button>
    );
  };
  return (
    <figure
      className="systems-scene food-explorer"
      data-producer={scene.values.grasses}
      data-selected={selected.id}
    >
      <figcaption>
        <strong>Who eats whom in Yellowstone?</strong>
        <span>
          Follow one feeding path at a time. Click an animal to continue the
          journey.
        </span>
      </figcaption>
      <div className="food-explorer-toolbar">
        <button
          type="button"
          onClick={() => {
            setQuery("");
            directory.current?.showModal();
          }}
        >
          Browse 24 organisms
        </button>
        <button
          type="button"
          disabled={!history.length}
          onClick={() => {
            const previous = history.at(-1);
            if (previous !== undefined) {
              returning.current = true;
              onSelect?.(previous);
              setHistory((h) => h.slice(0, -1));
            }
          }}
        >
          ← Previous organism
        </button>
        <button type="button" onClick={() => details.current?.showModal()}>
          Species details
        </button>
        <button
          type="button"
          onClick={() => {
            onCommand?.("WEB_SET_POPULATION", {
              species: "pressure",
              value: 0,
            });
            onSelect?.(12);
          }}
        >
          What if wolves disappear?
        </button>
      </div>
      <fieldset
        className="food-path"
        aria-label="A feeding path through Yellowstone"
      >
        <section>
          <h3>
            {selected.role === "Producer"
              ? "Nutrients come from"
              : `${selected.name} eats`}
          </h3>
          {card(resource, "food")}
          {food.length > 0 && (
            <label>
              Choose a food source
              <select
                aria-label="Choose a food source"
                value={resource}
                onChange={(e) => setFoodChoice(e.target.value as FoodSpeciesId)}
              >
                {food.map((key) => (
                  <option key={key} value={key}>
                    {speciesById(key).name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>
        <span
          className="food-path-arrow"
          aria-hidden="true"
          style={{ visibility: resource ? "visible" : "hidden" }}
        >
          →
        </span>
        <section>
          <h3>You are exploring</h3>
          {card(selected.id, "selected")}
          <p>{selected.note}</p>
        </section>
        <span
          className="food-path-arrow"
          aria-hidden="true"
          style={{ visibility: consumer ? "visible" : "hidden" }}
        >
          →
        </span>
        <section>
          <h3>{selected.id === "fungi" ? "Nutrients support" : "Eaten by"}</h3>
          {card(consumer, "consumer")}
          {consumers.length > 0 && (
            <label>
              Choose a consumer
              <select
                aria-label="Choose a consumer"
                value={consumer}
                onChange={(e) =>
                  setConsumerChoice(e.target.value as FoodSpeciesId)
                }
              >
                {consumers.map((key) => (
                  <option key={key} value={key}>
                    {speciesById(key).name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>
      </fieldset>
      <p className="food-path-sentence">
        {resource
          ? selected.role === "Producer"
            ? `${selected.name} uses nutrients returned by fungi.`
            : `${selected.name} feeds on ${speciesById(resource).name.toLowerCase()}.`
          : selected.role === "Producer"
            ? `${selected.name} grows using sunlight and soil nutrients.`
            : "Dead plants and animals become dead matter."}{" "}
        {consumer
          ? selected.id === "fungi"
            ? `Nutrients returned by fungi support ${speciesById(consumer).name.toLowerCase()}.`
            : `${speciesById(consumer).name} feeds on ${selected.name.toLowerCase()}.`
          : "No consumer is shown for this organism."}
      </p>
      <dialog
        ref={directory}
        className="food-species-dialog food-directory"
        aria-label="Browse Yellowstone organisms"
      >
        <button
          type="button"
          className="food-dialog-close"
          onClick={() => directory.current?.close()}
        >
          Close browser ×
        </button>
        <h2>Where would you like to explore?</h2>
        <p>Choose an organism to see its food sources and consumers.</p>
        <label>
          Find an organism
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try wolf, bear or grasses"
          />
        </label>
        <div className="food-directory-list">
          {foodWebSpecies
            .filter((s) =>
              `${s.name} ${s.role}`.toLowerCase().includes(query.toLowerCase()),
            )
            .map((s) => (
              <button type="button" key={s.id} onClick={() => navigate(s.id)}>
                <span aria-hidden="true">{s.icon}</span>
                <strong>{s.name}</strong>
                <span>{s.role}</span>
              </button>
            ))}
        </div>
        {!foodWebSpecies.some((s) =>
          `${s.name} ${s.role}`.toLowerCase().includes(query.toLowerCase()),
        ) && <p>No organisms match. Try another name.</p>}
      </dialog>
      <dialog
        ref={details}
        className="food-species-dialog"
        aria-label="Organism details"
      >
        <button
          type="button"
          className="food-dialog-close"
          onClick={() => details.current?.close()}
        >
          Close details ×
        </button>
        <div className="food-species-detail" aria-live="polite">
          <div className="food-species-heading">
            <span aria-hidden="true">{selected.icon}</span>
            <div>
              <strong>{selected.name}</strong>
              <span>
                {selected.scientific} · {selected.role}
              </span>
            </div>
            <a href={selected.source} target="_blank" rel="noreferrer">
              Species source ↗
            </a>
          </div>
          <p>{selected.note}</p>
          <div className="food-diet-columns">
            {[
              {
                label:
                  selected.role === "Producer"
                    ? "Nutrient source"
                    : "Feeds on / uses",
                ids: food,
              },
              {
                label:
                  selected.id === "fungi"
                    ? "Nutrients support"
                    : "Eaten by / consumed by",
                ids: consumers,
              },
            ].map((group) => (
              <section key={group.label} className="food-diet-links">
                <h3>{group.label}</h3>
                {group.ids.map((key) => (
                  <button type="button" key={key} onClick={() => navigate(key)}>
                    {speciesById(key).name} →
                  </button>
                ))}
                {!group.ids.length && (
                  <p>
                    {selected.role === "Producer" &&
                    group.label === "Feeds on / uses"
                      ? "Sunlight and nutrients"
                      : "None shown in this selected web."}
                  </p>
                )}
              </section>
            ))}
          </div>
        </div>
      </dialog>
      <p className="systems-footnote">
        {selected.role === "Producer" || selected.id === "fungi"
          ? "The link from fungi to plants shows nutrient return, not feeding."
          : "Each arrow reads “is food for.”"}{" "}
        Population changes are illustrative, not forecasts.
      </p>
    </figure>
  );
}
