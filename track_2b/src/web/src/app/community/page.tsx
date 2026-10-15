import { notFound } from "next/navigation";
import { accountFeaturesEnabled } from "../../lib/deployment";
import Community from "./Community";
export default function Page() {
  if (!accountFeaturesEnabled()) notFound();
  return <Community />;
}
