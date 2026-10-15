export default function ExperimentArt({
  type,
}: {
  type: "projectile" | "cell-division" | "acid-base-titration";
}) {
  return (
    <svg viewBox="0 0 320 170" fill="none" aria-hidden="true">
      <path d="M25 137H295" stroke="#c9c1ac" strokeWidth="1.5" />
      {type === "projectile" && (
        <>
          <path
            d="M46 136Q144 -52 271 136"
            stroke="#b7bca5"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <path d="M46 136Q93 50 145 47" stroke="#285e56" strokeWidth="2.5" />
          <path
            d="M45 137L69 106"
            stroke="#285e56"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="146" cy="47" r="8" fill="#c18a57" />
          <circle cx="45" cy="137" r="5" fill="#285e56" />
          <path d="M146 61V135" stroke="#d4ccb7" strokeDasharray="3 5" />
          <text
            x="160"
            y="84"
            fill="#808777"
            fontFamily="monospace"
            fontSize="11"
          >
            what if θ = 45°?
          </text>
          <path d="M257 135l14 -4 14 4" stroke="#285e56" />
          <text
            x="42"
            y="158"
            fill="#98917d"
            fontFamily="monospace"
            fontSize="9"
          >
            LAUNCH
          </text>
          <text
            x="251"
            y="158"
            fill="#98917d"
            fontFamily="monospace"
            fontSize="9"
          >
            LAND
          </text>
        </>
      )}
      {type === "cell-division" && (
        <>
          <path
            d="M160 60C120 15 48 38 48 85S120 155 160 110C200 155 272 132 272 85S200 15 160 60Z"
            fill="#e2e9dc"
            stroke="#47796a"
            strokeWidth="2"
          />
          <circle cx="105" cy="85" r="25" fill="#faf5df" stroke="#a7bab1" />
          <circle cx="215" cy="85" r="25" fill="#faf5df" stroke="#a7bab1" />
          <path
            d="M95 74L105 96M105 74L95 96M111 78L120 92M120 78L111 92M205 74L215 96M215 74L205 96M221 78L230 92M230 78L221 92"
            stroke="#b48147"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M160 36V134" stroke="#a7bab1" strokeDasharray="3 5" />
          <text
            x="106"
            y="157"
            fill="#98917d"
            fontSize="9"
            fontFamily="monospace"
          >
            DAUGHTER CELLS
          </text>
        </>
      )}
      {type === "acid-base-titration" && (
        <>
          <path
            d="M63 137V24M47 137H89M63 38H137"
            stroke="#98917d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M126 20H140V76L133 83V91"
            stroke="#47796a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M128 43H138V74L133 79 128 74Z" fill="#a7bab1" />
          <path
            d="M126 31H132M126 41H132M126 51H132M126 61H132M123 83H145"
            stroke="#47796a"
          />
          <path d="M133 94Q127 102 133 104Q139 102 133 94Z" fill="#47796a" />
          <path
            d="M120 108V116L101 134Q99 137 105 137H161Q167 137 165 134L146 116V108"
            fill="#faf5df"
            stroke="#47796a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M113 125Q133 122 153 125L161 135H105Z" fill="#cc9aa0" />
          <path
            d="M193 121H281M193 121V43"
            stroke="#c9c1ac"
            strokeWidth="1.5"
          />
          <path
            d="M197 113C222 113 227 106 233 84S240 53 277 51"
            stroke="#285e56"
            strokeWidth="2.5"
          />
          <path d="M234 48V121" stroke="#b48147" strokeDasharray="3 5" />
          <text
            x="202"
            y="39"
            fill="#808777"
            fontFamily="monospace"
            fontSize="11"
          >
            pH
          </text>
          <text
            x="207"
            y="157"
            fill="#98917d"
            fontFamily="monospace"
            fontSize="9"
          >
            BASE ADDED
          </text>
        </>
      )}
    </svg>
  );
}
