import React, { useId } from 'react';

/** Laxigam mark: a minted hexagonal coin with a bridging "L". */
export function LogoMark({ size = 32, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbefb0" />
          <stop offset="0.35" stopColor="#e8c55a" />
          <stop offset="0.65" stopColor="#a8811a" />
          <stop offset="1" stopColor="#f3d77a" />
        </linearGradient>
        <linearGradient id={`i${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1408" />
          <stop offset="1" stopColor="#0b0905" />
        </linearGradient>
      </defs>
      <path d="M32 2 58 17v30L32 62 6 47V17Z" fill={`url(#g${id})`} />
      <path d="M32 7.5 53.5 20v24L32 56.5 10.5 44V20Z" fill={`url(#i${id})`} />
      <path d="M24 19v22h17" fill="none" stroke={`url(#g${id})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="41" cy="23" r="3.5" fill={`url(#g${id})`} />
    </svg>
  );
}

function Logo({ size = 32, showText = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} className="drop-shadow-[0_4px_12px_rgba(212,175,55,0.35)]" />
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight">
          <span className="gradient-text">Laxigam</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
