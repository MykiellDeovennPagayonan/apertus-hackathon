import { publicDefinitions } from "../../registry/index";
import { discoverableDefinition, definitionDiscovery, discoverySections, searchRank } from "../../registry/discovery";
import { retiredControls } from "../../registry/contracts/controlContract";
/** Search ranking and browsing use discovery metadata, never runtime ID spelling. */
export function libraryChoices(category: string, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const order = (d: import("../../registry/contracts/publicDefinition").PublicDefinition) =>
    discoverySections.findIndex((s) => s.id === definitionDiscovery(d).group);
  return [...publicDefinitions.values()].filter(discoverableDefinition)
    .filter((d) => {
      if (retiredControls.has(d.id)) return false;
      if (["displays/Text", "displays/Box"].includes(d.id)) return false;
      const metadata = definitionDiscovery(d);
      const text =
        `${d.title} ${metadata.summary} ${d.tags.join(" ")}`.toLowerCase();
      return (
        (category === "all" ||
          category === metadata.group ||
          (category === d.category && metadata.group !== "composites")) &&
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
