"use client";

// HiFeed Logo — inline SVG React component
// Colors extracted from brand logo:
//   Teal leaf: #00a078 (primary brand color)
//   Leaf highlight: #14a078
//   Text: #506478
//   Tagline: #64748b

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function LogoSvg({ width = 200, height, className }: LogoProps) {
  // Auto-scale height from width (320:80 = 4:1 ratio)
  const autoHeight = height ?? Math.round(width * 0.25);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      width={width}
      height={autoHeight}
      className={className}
      aria-label="HiFeed Logo"
      role="img"
    >
      {/* Leaf icon — left side */}
      <g transform="translate(4, 8)">
        {/* Leaf body — teal oval */}
        <ellipse cx="36" cy="32" rx="28" ry="28" fill="#00a078" />
        {/* Leaf highlight overlay */}
        <ellipse cx="36" cy="30" rx="20" ry="20" fill="#14a078" />
        {/* Leaf vein — center stem */}
        <line x1="36" y1="8" x2="36" y2="58" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        {/* Leaf veins — left branches */}
        <line x1="36" y1="18" x2="18" y2="13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="26" x2="16" y2="23" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="34" x2="16" y2="33" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="42" x2="18" y2="43" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="50" x2="20" y2="53" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        {/* Leaf veins — right branches */}
        <line x1="36" y1="18" x2="54" y2="13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="26" x2="56" y2="23" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="34" x2="56" y2="33" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="42" x2="54" y2="43" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="36" y1="50" x2="52" y2="53" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </g>

      {/* Wordmark: HIFEED */}
      <text
        x="88"
        y="52"
        fontFamily="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
        fontSize="36"
        fontWeight="700"
        fill="#506478"
        letterSpacing="-1"
      >
        HiFeed
      </text>

      {/* Tagline */}
      <text
        x="88"
        y="68"
        fontFamily="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="400"
        fill="#64748b"
        letterSpacing="0.5"
      >
        Human Resource Management
      </text>
    </svg>
  );
}

// Compact icon-only version for very small spaces (e.g. mobile nav)
export function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 72 72"
      width={size}
      height={size}
      className={className}
      aria-label="HiFeed"
      role="img"
    >
      <ellipse cx="36" cy="36" rx="30" ry="30" fill="#00a078" />
      <ellipse cx="36" cy="34" rx="22" ry="22" fill="#14a078" />
      <line x1="36" y1="10" x2="36" y2="62" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <line x1="36" y1="20" x2="18" y2="15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="36" y1="30" x2="16" y2="26" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="36" y1="40" x2="16" y2="38" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="36" y1="50" x2="20" y2="52" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="36" y1="20" x2="54" y2="15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="36" y1="30" x2="56" y2="26" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="36" y1="40" x2="56" y2="38" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="36" y1="50" x2="52" y2="52" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}