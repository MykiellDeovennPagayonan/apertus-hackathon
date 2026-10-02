export default function ExperimentArt({
  type,
}: {
  type: "projectile" | "bridge" | "town";
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
      {type === "town" && (
        <>
          <path
            d="M25 132Q60 116 97 128T175 129T295 121V138H25Z"
            fill="#bac3aa"
          />
          <path d="M130 139L145 104H174L195 139" fill="#e5dbc4" />
          <path d="M70 125V88H107V125" fill="#dfd6bc" stroke="#a99e83" />
          <path d="M63 89L88 67 115 89Z" fill="#739280" />
          <path d="M192 124V77H236V124" fill="#e8dcc0" stroke="#aa9e85" />
          <path d="M185 78L214 54 242 78Z" fill="#b68065" />
          <path d="M83 125V109H94V125M207 123V105H218V123" fill="#918d74" />
          <path
            d="M78 95H85V102H78ZM95 95H102V102H95ZM200 88H208V97H200ZM221 88H229V97H221Z"
            fill="#faf5df"
          />
          <path d="M46 125V105M269 127V97" stroke="#a88161" strokeWidth="4" />
          <path d="M33 108L46 78 59 108Z" fill="#6d9278" />
          <path d="M253 101L269 62 285 101Z" fill="#7b9b80" />
          <circle cx="153" cy="117" r="3" fill="#b78060" />
          <path
            d="M153 121V129"
            stroke="#285e56"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="179" cy="129" r="3" fill="#b78060" />
          <path
            d="M179 133V140"
            stroke="#b5944c"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="139" cy="48" r="12" fill="#eeddb0" />
        </>
      )}
    </svg>
  );
}
