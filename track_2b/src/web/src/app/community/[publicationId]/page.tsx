import { notFound } from "next/navigation";
import { offlineEnabled } from "../../../lib/deployment";
import PublicationDetail from "./PublicationDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ publicationId: string }>;
}) {
  if (offlineEnabled()) notFound();
  return <PublicationDetail id={(await params).publicationId} />;
}
