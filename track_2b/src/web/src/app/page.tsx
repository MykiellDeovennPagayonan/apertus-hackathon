import { Suspense } from "react";
import LoadingState from "./_components/LoadingState";
import ExperimentsShell from "./experiments/_components/ExperimentsShell";
export default function Home() {
  return (
    <Suspense fallback={<LoadingState title="Preparing the lab…" />}>
      <ExperimentsShell landing />
    </Suspense>
  );
}
