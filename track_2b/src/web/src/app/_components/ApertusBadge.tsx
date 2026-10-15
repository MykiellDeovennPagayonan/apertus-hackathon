import "./ApertusBadge.css";

export default function ApertusBadge() {
  return (
    <span
      className="apertus-badge"
      title="Premade experiment. Apertus is optional for follow-up changes; no build is needed."
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 7V3m-2 0h4M4 12H2m20 0h-2" />
        <rect x="4" y="7" width="16" height="14" rx="4" />
        <path d="M8 12v2m8-2v2m-7 3h6" />
      </svg>
      Apertus optional
    </span>
  );
}
