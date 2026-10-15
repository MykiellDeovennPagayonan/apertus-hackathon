import { Suspense } from "react";
import Builder from "../../../simulations/builder/Builder";
import LoadingState from "../../_components/LoadingState";
export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Opening builder…"
          description="Getting your canvas and components ready."
        />
      }
    >
      <Builder />
    </Suspense>
  );
}
