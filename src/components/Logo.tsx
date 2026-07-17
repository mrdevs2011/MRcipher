export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MRcipher logo"
    >
      <circle cx="100" cy="100" r="90" fill="#0f172a" stroke="#38bdf8" strokeWidth="6" />
      <text
        x="50%"
        y="58%"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="75"
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        ***
      </text>
    </svg>
  );
}
