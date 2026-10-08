import PublicationDetail from "./PublicationDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ publicationId: string }>;
}) {
  return <PublicationDetail id={(await params).publicationId} />;
}
