import React, { useEffect, useRef, useState } from 'react';

/** Counts smoothly from the previous value to `value` (ease-out cubic). */
function AnimatedNumber({ value = 0, decimals = 2, duration = 900, prefix = '', suffix = '', className = '' }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const formatted = Number(display).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span className={`tabular ${className}`}>{prefix}{formatted}{suffix}</span>;
}

export default AnimatedNumber;
