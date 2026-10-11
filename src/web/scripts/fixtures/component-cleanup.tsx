import { useState } from "react";
import { createRoot } from "react-dom/client";
import { NumberField } from "../../src/simulations/components/controls/NumberField";
import { ParameterSlider } from "../../src/simulations/components/controls/ParameterSlider";
import { SchemaForm } from "../../src/simulations/components/controls/SchemaForm";
import { num, object } from "../../src/simulations/runtime/parameterSchema";

declare global {
  interface Window {
    numericFixture: { externalValue: (value: number) => void };
  }
}

function NumericFixture() {
  const [value, setValue] = useState(5);
  const [commands, setCommands] = useState(0);
  window.numericFixture = { externalValue: setValue };
  const command = (next: number) => {
    setCommands((count) => count + 1);
    if (next === 7)
      return {
        accepted: false as const,
        error: "Seven is rejected by the model.",
      };
    setValue(next);
    return { accepted: true as const };
  };
  return (
    <main>
      <NumberField
        label="Numeric value"
        value={value}
        min={0}
        max={10}
        step={0.1}
        integer={false}
        presentation="slider"
        onChange={command}
      />
      <ParameterSlider
        label="Sibling slider"
        value={value}
        min={0}
        max={10}
        step={0.1}
        onChange={command}
      />
      <SchemaForm
        label="Submitted value"
        schema={object({ value: num(0, 10) })}
        initial={{ value: 5 }}
        current={{ value }}
        onSubmit={(args) => command(Number(args.value))}
      />
      <output data-testid="accepted">{value}</output>
      <output data-testid="commands">{commands}</output>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Numeric fixture root is missing");
createRoot(root).render(<NumericFixture />);
