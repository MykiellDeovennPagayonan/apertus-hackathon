import { Suspense } from "react";
import Builder from "../../../simulations/builder/Builder";
export default function BuilderPage() { return <Suspense fallback={<p>Opening builder…</p>}><Builder /></Suspense>; }
