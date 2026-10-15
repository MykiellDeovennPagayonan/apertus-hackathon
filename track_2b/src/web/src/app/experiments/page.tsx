import { Suspense } from "react";
import LoadingState from "../_components/LoadingState";
import ExperimentsShell from "./_components/ExperimentsShell";
export default function Experiments() {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Preparing your experiments…"
          description="Getting your experiments and tools ready."
        />
      }
    >
      <ExperimentsShell />
    </Suspense>
  );
}
