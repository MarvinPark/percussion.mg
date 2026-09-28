export function ExcelIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="14" height="14" rx="1.5" fill="#217346" />
      <path d="M4.5 4.5h7v7h-7v-7z" fill="white" fillOpacity="0.15" />
      <path
        d="M5 8.2 6.4 10 8.8 6.5 10.2 8.2 12 5.5"
        stroke="white"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="4.2"
        y="6.2"
        fill="white"
        fontSize="3.2"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        X
      </text>
    </svg>
  );
}
