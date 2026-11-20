export function CuberMark() {
  return (
    <svg className="cuber-mark" width="29" height="29" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="cuber-mark-chroma" x1="15" y1="20" x2="49" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--mark-blue)" />
          <stop offset=".52" stopColor="var(--mark-violet)" />
          <stop offset="1" stopColor="var(--mark-rose)" />
        </linearGradient>
        <mask id="cuber-mark-hands" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="white"/>
          <g fill="none" stroke="black" strokeLinecap="round">
            <path d="M32 31.5 20.5 24.9" strokeWidth="4.6"/>
            <path d="M32 31.5 40.3 26.7" strokeWidth="4.6"/>
            <path d="M32 31.5V46" strokeWidth="2.6"/>
            <circle cx="32" cy="31.5" r="3" fill="black" stroke="none"/>
          </g>
        </mask>
      </defs>
      <path d="M29.8 11.2 Q32 10 34.2 11.2 L48.8 19.6 Q51 20.9 51 23.4 V40.6 Q51 43.1 48.8 44.4 L34.2 52.8 Q32 54 29.8 52.8 L15.2 44.4 Q13 43.1 13 40.6 V23.4 Q13 20.9 15.2 19.6 Z" fill="url(#cuber-mark-chroma)" mask="url(#cuber-mark-hands)" />
    </svg>
  );
}
