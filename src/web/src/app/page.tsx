import { Suspense } from "react";
import ExperimentsShell from "./experiments/_components/ExperimentsShell";
export default function Home() {
  return (
    <Suspense fallback={<output>Preparing the lab…</output>}>
      <ExperimentsShell landing />
    </Suspense>
  );
}
