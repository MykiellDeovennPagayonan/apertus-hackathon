import { notFound } from "next/navigation";
import { accountFeaturesEnabled } from "../../../lib/deployment";
import PublicationDetail from "./PublicationDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ publicationId: string }>;
}) {
  if (!accountFeaturesEnabled()) notFound();
  return <PublicationDetail id={(await params).publicationId} />;
}
