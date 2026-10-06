import { useState } from "react";
import { publicDefinition } from "../../components/catalog";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { ComponentInstance } from "../../runtime/authoring/types";
import {
  changeControlType,
  controlTypeCompatibility,
  interchangeableControls,
} from "../editor/controlTypeCommands";
import type { ComponentCatalog } from "./useComponentCatalog";

export function ControlTypeSettings({
  node,
  catalog,
}: {
  node: ComponentInstance;
  catalog: ComponentCatalog;
}) {
  const [type, setType] = useState(node.definition);
  const [parameter, setParameter] = useState("");
  const [error, setError] = useState("");
  const options = interchangeableControls.map((id) => ({
    id,
    title: publicDefinition(id).title,
    ...controlTypeCompatibility(catalog.document, node, id),
  }));
  const selected = requireValue(options.find((option) => option.id === type));
  const changed = type !== node.definition;
  const needsParameter =
    changed && selected.parameters.length > 1 && !node.configuration.parameter;
  return (
    <fieldset className="control-type-settings">
      <legend>Component type</legend>
      <label>
        Control type
        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setParameter("");
            setError("");
          }}
        >
          {options.map((option) => (
            <option
              key={option.id}
              value={option.id}
              disabled={!!option.reason && option.id !== node.definition}
            >
              {option.title}
              {option.reason ? " — incompatible target" : ""}
            </option>
          ))}
        </select>
      </label>
      <p>{publicDefinition(type).description}</p>
      {needsParameter && (
        <label>
          Parameter for new control
          <select
            value={parameter}
            onChange={(event) => setParameter(event.target.value)}
          >
            <option value="">Choose a parameter</option>
            {selected.parameters.map((path) => (
              <option key={path} value={path}>
                {path.replace(/^value\./, "")}
              </option>
            ))}
          </select>
        </label>
      )}
      {changed && (
        <>
          <p>
            The label, placement and connections stay. Settings specific to the
            previous type are removed.
          </p>
          <button
            type="button"
            disabled={!!selected.reason || (needsParameter && !parameter)}
            onClick={() => {
              try {
                const accepted = catalog.change(
                  "Change control type",
                  (document) =>
                    changeControlType(document, node.id, type, parameter),
                );
                if (!accepted)
                  setError("The control type could not be changed.");
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "The control type could not be changed.",
                );
              }
            }}
          >
            Change to {selected.title}
          </button>
        </>
      )}
      {options.some((option) => option.reason) && (
        <details>
          <summary>Why are some types unavailable?</summary>
          <ul>
            {options
              .filter((option) => option.reason)
              .map((option) => (
                <li key={option.id}>
                  <strong>{option.title}:</strong> {option.reason}
                </li>
              ))}
          </ul>
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
