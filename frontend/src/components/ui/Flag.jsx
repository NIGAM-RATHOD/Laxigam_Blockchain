import React from 'react';

const REGIONAL_A = 0x1f1e6;

/** "🇮🇳" -> "in"; returns null for anything that isn't a two-letter flag emoji. */
const flagToCode = (emoji) => {
  const points = [...(emoji || '')].map((char) => char.codePointAt(0));
  if (points.length !== 2 || points.some((p) => p < REGIONAL_A || p > REGIONAL_A + 25)) return null;
  return points.map((p) => String.fromCharCode(p - REGIONAL_A + 97)).join('');
};

/**
 * Renders flag emoji as real flag images (Windows has no flag emoji glyphs and
 * shows "IN", "BR"…). Any other emoji, such as ⭐ or 💎, is rendered as text.
 */
function Flag({ emoji, size = 20, className = '', title }) {
  const code = flagToCode(emoji);
  if (!code) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }} title={title}>
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={title || code.toUpperCase()}
      title={title}
      width={Math.round(size * 1.4)}
      height={size}
      loading="lazy"
      className={`inline-block rounded-[3px] object-cover ring-1 ring-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.5)] ${className}`}
      style={{ width: Math.round(size * 1.4), height: size }}
    />
  );
}

export default Flag;
