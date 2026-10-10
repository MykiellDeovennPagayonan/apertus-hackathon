import type { AgentConfiguration } from "../../traits/AIAgent";

const palettes = [
  { shirt: "#417b70", hair: "#3e3933", skin: "#e9b893", backdrop: "#dcece4" },
  { shirt: "#c37652", hair: "#57443c", skin: "#bd805e", backdrop: "#f5e5d7" },
  { shirt: "#7c799e", hair: "#31342f", skin: "#d99b78", backdrop: "#e8e5f2" },
  { shirt: "#657c9a", hair: "#4b3934", skin: "#f0c5a5", backdrop: "#e1eaf2" },
  { shirt: "#b59243", hair: "#a19b91", skin: "#cc9673", backdrop: "#f4ecd4" },
  { shirt: "#a56578", hair: "#302b2c", skin: "#a66d50", backdrop: "#f2e2e8" },
];

/** Decorative, scalable character portraits; identity and personality remain authored data. */
export function AgentAvatar({
  agent,
  className = "",
}: {
  agent: AgentConfiguration;
  className?: string;
}) {
  const seat = agent.id.match(/\/([PO])([123])$/);
  const variant = seat
    ? Number(seat[2]) - 1 + (seat[1] === "O" ? 3 : 0)
    : [...agent.name].reduce((total, char) => total + char.charCodeAt(0), 0) %
      palettes.length;
  const colors = palettes[variant];
  return (
    <svg
      className={`agent-avatar ${className}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="57" fill={colors.backdrop} />
      <path
        d="M18 116v-12c0-23 18-36 42-36s42 13 42 36v12"
        fill={colors.shirt}
      />
      <path d="M49 67v16q11 12 22 0V67" fill={colors.skin} />
      {variant === 2 && (
        <path d="M27 57C19 9 96 6 94 57v36H27Z" fill={colors.hair} />
      )}
      <ellipse cx="32" cy="51" rx="6" ry="9" fill={colors.skin} />
      <ellipse cx="88" cy="51" rx="6" ry="9" fill={colors.skin} />
      <rect x="33" y="21" width="54" height="57" rx="26" fill={colors.skin} />
      <path
        d={
          variant % 2
            ? "M31 44C23 11 74 5 88 29l3 19-12-16-37-3Z"
            : "M31 43C25 3 94 5 90 43L80 29Q54 36 40 26Z"
        }
        fill={colors.hair}
      />
      <path
        d="M42 47h9m18 0h9"
        stroke={colors.hair}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="47" cy="53" r="2.3" fill="#36352f" />
      <circle cx="73" cy="53" r="2.3" fill="#36352f" />
      <path
        d="m60 53-3 9h5"
        fill="none"
        stroke="#98684e"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M51 68q9 7 18 0"
        fill="none"
        stroke="#805545"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {(variant === 0 || variant === 3 || variant === 4) && (
        <g fill="none" stroke={colors.hair} strokeWidth="2.2">
          <rect x="36" y="46" width="23" height="14" rx="5" />
          <rect x="63" y="46" width="23" height="14" rx="5" />
          <path d="M59 50h4" />
        </g>
      )}
      <path
        d="m43 89 17 12 17-12"
        fill="none"
        stroke="#fff"
        strokeOpacity=".65"
        strokeWidth="3"
      />
      {variant === 1 && (
        <path d="M73 101h13v11H73Z" fill="#fff" fillOpacity=".7" />
      )}
      <circle
        className="agent-speaking-ring"
        cx="60"
        cy="60"
        r="57"
        fill="none"
        stroke="var(--accent, #285e56)"
        strokeWidth="3"
      />
    </svg>
  );
}
export const agentShortName = (agent: AgentConfiguration) =>
  agent.name.split(" · ")[0];
