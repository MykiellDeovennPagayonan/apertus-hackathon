import { publicDefinitions } from "../../components/catalog";
/** Discovery covers all registered public packages, independently of the initial canvas family. */
export function libraryChoices(category: string, query: string) {
  const terms = query.trim().toLowerCase();
  return [...publicDefinitions.values()].filter(
    (d) =>
      (category === "all" || category === d.category) &&
      `${d.title} ${d.description} ${d.tags.join(" ")}`
        .toLowerCase()
        .includes(terms),
  );
}
