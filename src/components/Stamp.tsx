/** 圈選章：紅圈裡一個「卜」形記號，選票上蓋的那一種 */
export function Stamp({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="var(--stamp)"
      strokeLinecap="round"
    >
      <circle cx="32" cy="32" r="27" strokeWidth="5" />
      <path d="M27 15v34" strokeWidth="6" />
      <path d="M27 29l15 9" strokeWidth="6" />
    </svg>
  );
}
