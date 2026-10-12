import { publicDefinition } from "../../components/catalog";
import { ComponentDialog } from "../ComponentDialog";
import { FeedbackView } from "../composition/FeedbackView";
import {
  type ComponentCatalog,
  download,
} from "../composition/useComponentCatalog";
export function SaveCompositeDialog({
  catalog,
  open,
  onClose,
}: {
  catalog: ComponentCatalog;
  open: boolean;
  onClose: () => void;
}) {
  const {
    name,
    setName,
    tags,
    setTags,
    selection,
    selectedComponents,
    parameterTargets,
    setParameterTargets,
    saveRecipe,
    makeSelectionRecipe,
    report,
  } = catalog;
  const errorText = (e: unknown) =>
    e instanceof Error ? e.message : "Could not export";
  return (
    <ComponentDialog
      open={open}
      title="Save selection as composite"
      onClose={onClose}
    >
      {open && (
        <FeedbackView
          message={catalog.message}
          floating={catalog.message?.severity !== "error"}
          onDismiss={() => report("")}
        />
      )}
      <fieldset>
        <legend>Save selection as prebuilt</legend>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <fieldset>
          <legend>Exposed parameters</legend>
          {selectedComponents.flatMap((node) => {
            const schema = publicDefinition(node).configuration;
            return schema.type === "object"
              ? Object.keys(schema.properties).map((field) => {
                  const key = `${node.id}\u0000${field}`;
                  return (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={parameterTargets.includes(key)}
                        onChange={(e) =>
                          setParameterTargets((current) =>
                            e.target.checked
                              ? [...current, key]
                              : current.filter((item) => item !== key),
                          )
                        }
                      />
                      {node.label} · {field}
                    </label>
                  );
                })
              : [];
          })}
          {!selectedComponents.length && (
            <small>Select components first.</small>
          )}
        </fieldset>
        <label>
          Tags (comma separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <button type="button" disabled={!selection.length} onClick={saveRecipe}>
          Save prebuilt
        </button>
        <button
          type="button"
          disabled={!selection.length}
          onClick={() => {
            try {
              download(makeSelectionRecipe(), "prebuilt.json");
            } catch (e) {
              report(errorText(e));
            }
          }}
        >
          Export selection
        </button>
      </fieldset>
    </ComponentDialog>
  );
}
