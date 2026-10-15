import {
  componentLimits,
  inspectSource,
} from "../../simulations/creation-and-editing/runtime-engine/imported/contract";

export function authoringBrief(
  name: string,
  description: string,
  guide: string,
  starter: string,
) {
  if (!name.trim() || !description.trim())
    throw new Error("Describe the component and give it a name first.");
  return `# Component request\n\nName: ${name.trim()}\n\nRequested behavior:\n${description.trim()}\n\nCreate a new standalone HTML component for this request. Declare only the inputs, outputs, settings, and actions this behavior needs in the embedded manifest. Use meaningful descriptions, explicit units and bounded schemas so the app can suggest controls and displays. Return the complete HTML file.\n\n${guide}\n\n## Starter HTML\n\n\`\`\`html\n${starter}\n\`\`\`\n`;
}

export function downloadComponentText(
  text: string,
  name: string,
  extension: "html" | "md",
) {
  const url = URL.createObjectURL(
    new Blob([text], {
      type:
        extension === "html"
          ? "text/html;charset=utf-8"
          : "text/markdown;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "component"}.${extension}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readComponentFile(file: File) {
  if (!/\.html?$/i.test(file.name))
    throw new Error("Choose an HTML component file (.html or .htm).");
  if (file.size > componentLimits.source)
    throw new Error("HTML components must be at most 256 KiB.");
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await file.arrayBuffer(),
  );
}

export function componentSource(recipe: unknown) {
  const node = (
    recipe as import("../../simulations/creation-and-editing/authoring-engine/document").CompositeRecipe
  ).document.nodes[0];
  const source = String(node.configuration.source);
  inspectSource(source);
  return source;
}
