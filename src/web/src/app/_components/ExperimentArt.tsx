export default function ExperimentArt({
  type,
}: {
  type: "projectile" | "bridge" | "acid-base-titration";
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
      {type === "bridge" && (
        <>
          <path
            d="M31 140L48 113 65 140M255 140L272 113 289 140"
            fill="#c8c7b5"
          />
          <path
            d="M48 114H272M48 114L104 57 160 114 216 57 272 114M104 57H216M104 57V114M160 57V114M216 57V114M104 114L160 57 216 114"
            stroke="#47796a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {[48, 104, 160, 216, 272].map((x) => (
            <circle
              key={x}
              cx={x}
              cy="114"
              r="3.3"
              fill="#fffbef"
              stroke="#47796a"
              strokeWidth="1.5"
            />
          ))}
          <rect x="145" y="90" width="30" height="18" rx="2" fill="#c99d5c" />
          <path
            d="M160 27V45m-5 -5 5 5 5 -5"
            stroke="#b48147"
            strokeWidth="1.5"
          />
          <text
            x="172"
            y="35"
            fill="#98917d"
            fontSize="10"
            fontFamily="monospace"
          >
            load
          </text>
          <path d="M75 150q20 -7 40 0t40 0t40 0t40 0" stroke="#a7bab1" />
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
