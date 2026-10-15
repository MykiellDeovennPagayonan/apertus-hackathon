export function DrawingIcon({
  name,
}: {
  name:
    | "select"
    | "hand"
    | "box"
    | "text"
    | "left"
    | "center"
    | "right"
    | "copy"
    | "duplicate"
    | "delete"
    | "lock"
    | "unlock"
    | "front"
    | "back"
    | "forward"
    | "backward";
}) {
  const align = name === "left" || name === "center" || name === "right";
  const down = name === "back" || name === "backward";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "select" ? (
        <path d="M5 3v17l5-5 4 6 3-2-4-6h7Z" />
      ) : name === "hand" ? (
        <path d="M7 12V7a1.5 1.5 0 0 1 3 0v5-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v6c0 4-2 6-6 6-3 0-4-1-6-4l-3-4a1.5 1.5 0 0 1 2-2Z" />
      ) : name === "box" ? (
        <rect x="4" y="5" width="16" height="14" rx="1" />
      ) : name === "text" ? (
        <path d="M4 5h16M12 5v15M8 20h8" />
      ) : align ? (
        <>
          <path d="M4 5h16M4 12h16M4 19h16" />
          <path
            d={
              name === "left"
                ? "M4 8.5h10M4 15.5h10"
                : name === "center"
                  ? "M7 8.5h10M7 15.5h10"
                  : "M10 8.5h10M10 15.5h10"
            }
          />
        </>
      ) : name === "copy" || name === "duplicate" ? (
        <>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V4H4v12h4" />
          {name === "duplicate" && <path d="M11 14h6M14 11v6" />}
        </>
      ) : name === "delete" ? (
        <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
      ) : name === "lock" || name === "unlock" ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path
            d={
              name === "lock"
                ? "M8 10V6a4 4 0 0 1 8 0v4"
                : "M8 10V6a4 4 0 0 1 8 0"
            }
          />
          <path d="M12 14v3" />
        </>
      ) : (
        <>
          <path d={down ? "M12 4v14M7 13l5 5 5-5" : "M12 20V6M7 11l5-5 5 5"} />
          {(name === "front" || name === "back") && (
            <path d={down ? "M5 21h14" : "M5 3h14"} />
          )}
        </>
      )}
    </svg>
  );
}
