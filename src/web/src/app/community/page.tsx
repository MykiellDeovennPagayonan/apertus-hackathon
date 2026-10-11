import { notFound } from "next/navigation";
import { offlineEnabled } from "../../lib/deployment";
import Community from "./Community";
export default function Page() {
  if (offlineEnabled()) notFound();
  return <Community />;
}
