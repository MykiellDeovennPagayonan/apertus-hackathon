const paths = {
  edit: "m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  back: "M19 12H5m6-6-6 6 6 6",
  forward: "M5 12h14m-6-6 6 6-6 6",
  close: "m6 6 12 12M6 18 18 6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  plus: "M12 5v14M5 12h14",
  folder: "M3 7V5h6l2 2h10v13H3Z",
  share:
    "M15 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m10 7a2 2 0 1 0-4 0 2 2 0 0 0 4 0M9 11l6-5m-6 7 6 5",
  history: "M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  info: "M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  check: "m5 12 4 4L19 6",
  warning: "m12 3 10 18H2ZM12 9v5m0 3v1",
  objects: "m12 3 9 5v8l-9 5-9-5V8Zm-9 5 9 5 9-5m-9 5v8",
  controls: "M3 6h18M3 18h18M7 3v6m10 6v6",
  displays: "M3 3v18h18M7 14l4-5 4 3 5-7",
  canvases: "M3 3h18v18H3Zm4 14 4-4 3 3 4-6",
  models: "M3 12h3l3-8 6 16 3-8h3",
  layout: "M3 3h18v18H3Zm0 6h18M9 9v12",
  composites: "m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5",
  experiments: "M9 3h6m-5 0v6l-6 11h16L14 9V3M7 15h10",
  grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
} as const;
export type BuilderIconName = keyof typeof paths;
export function BuilderIcon({
  name,
  className = "",
}: {
  name: BuilderIconName;
  className?: string;
}) {
  return (
    <svg
      className={`builder-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
