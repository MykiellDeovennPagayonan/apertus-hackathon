import { publicDefinitions } from "../../components/catalog";
import {
  definitionDiscovery,
  discoverySections,
  searchRank,
} from "../../components/catalog/discovery";
/** Search ranking and browsing use discovery metadata, never runtime ID spelling. */
export function libraryChoices(category: string, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const order = (d: import("../../runtime/authoring/types").PublicDefinition) =>
    discoverySections.findIndex((s) => s.id === definitionDiscovery(d).group);
  return [...publicDefinitions.values()]
    .filter((d) => {
      const metadata = definitionDiscovery(d);
      const text =
        `${d.title} ${metadata.summary} ${d.tags.join(" ")}`.toLowerCase();
      return (
        (category === "all" ||
          category === metadata.group ||
          category === d.category) &&
        terms.every((term) => text.includes(term))
      );
    })
    .sort(
      (a, b) =>
        searchRank(a.title, query) - searchRank(b.title, query) ||
        order(a) - order(b) ||
        a.title.localeCompare(b.title),
    );
}
