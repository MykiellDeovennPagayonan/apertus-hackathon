import { Suspense } from "react";
import ExperimentsShell from "./_components/ExperimentsShell";
export default function Experiments() {
  return (
    <Suspense
      fallback={<div aria-live="polite">Preparing the experiments…</div>}
    >
      <ExperimentsShell />
    </Suspense>
  );
}
