import { useEffect, useState } from "react";
import { publicDefinition } from "../../components/catalog";
import type {
  AuthoredDocument,
  ExposedPort,
  Group,
} from "../../runtime/authoring/types";
import { portLabel } from "../graph/authoredGraph";

/** Choices are real child endpoints; the collapsed node never invents runtime ports. */
export function CompositeInterfaceEditor({
  group,
  document,
  onChange,
}: {
  group: Group;
  document: AuthoredDocument;
  onChange: (ports: ExposedPort[]) => void;
}) {
  const exposed = group.exposedPorts ?? [];
  const candidates = [...document.nodes, ...document.resources]
    .filter((n) => group.members.includes(n.id))
    .flatMap((node) => {
      const def = publicDefinition(node.definition);
      return [
        ...Object.entries(def.inputs).map(([port, contract]) => ({
          port,
          contract,
          direction: "input" as const,
        })),
        ...Object.keys(def.commands).map((port) => ({
          port,
          contract: { kind: "command" as const, unit: "" },
          direction: "input" as const,
        })),
        ...Object.entries(def.outputs).map(([port, contract]) => ({
          port,
          contract,
          direction: "output" as const,
        })),
      ].map((p) => ({
        name: `${node.label}: ${portLabel(p.port)}`,
        endpoint: { node: node.id, port: p.port },
        direction: p.direction,
        port: p.contract,
        required: false,
      }));
    });
  const key = (p: ExposedPort) =>
    `${p.direction}:${p.endpoint.node}:${p.endpoint.port}`;
  return (
    <details className="composite-interface-editor">
      <summary>
        Expose inputs and outputs <span>{exposed.length} exposed</span>
      </summary>
      <p>
        Choose only the connections people need outside this group. Existing
        boundary connections stay visible. Inputs marked “required to run” can
        be connected after insertion.
      </p>
      <fieldset>
        <legend>Composite interface</legend>
        {candidates.map((candidate) => {
          const selected = exposed.find((p) => key(p) === key(candidate));
          return (
            <div className="composite-interface-choice" key={key(candidate)}>
              <label>
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={(e) => {
                    let name = candidate.name;
                    let suffix = 2;
                    while (exposed.some((p) => p.name === name))
                      name = `${candidate.name} ${suffix++}`;
                    onChange(
                      e.target.checked
                        ? [...exposed, { ...candidate, name }]
                        : exposed.filter((p) => key(p) !== key(candidate)),
                    );
                  }}
                />
                <span>
                  {candidate.name}
                  <small>
                    {candidate.direction === "input" ? "Input" : "Output"} ·{" "}
                    {candidate.port.kind}{" "}
                    {candidate.port.unit && `· ${candidate.port.unit}`}{" "}
                    {candidate.direction === "input" &&
                    !(
                      "optional" in candidate.port && candidate.port.optional
                    ) &&
                    candidate.port.kind !== "command"
                      ? "· required to run"
                      : "· optional connection"}
                  </small>
                </span>
              </label>
              {selected && (
                <PortNameInput
                  port={selected}
                  ports={exposed}
                  onCommit={(name) =>
                    onChange(
                      exposed.map((p) =>
                        key(p) === key(selected) ? { ...p, name } : p,
                      ),
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </fieldset>
    </details>
  );
}

function PortNameInput({
  port,
  ports,
  onCommit,
}: {
  port: ExposedPort;
  ports: ExposedPort[];
  onCommit: (name: string) => void;
}) {
  const [name, setName] = useState(port.name);
  const [error, setError] = useState("");
  useEffect(() => {
    setName(port.name);
    setError("");
  }, [port.name]);
  return (
    <label className="composite-port-name">
      Visible label
      <input
        value={name}
        aria-label={`Visible label for ${port.name}`}
        aria-invalid={!!error}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
        onBlur={() => {
          const next = name.trim();
          if (!next) setError("Enter a label for this connection.");
          else if (ports.some((p) => p !== port && p.name === next))
            setError("That label is already used. Choose a different label.");
          else {
            setError("");
            onCommit(next);
          }
        }}
      />
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
