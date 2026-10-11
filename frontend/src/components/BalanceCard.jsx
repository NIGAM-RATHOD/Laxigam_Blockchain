import React, { useRef } from 'react';
import { Wifi } from 'lucide-react';
import { LogoMark } from './ui/Logo';
import AnimatedNumber from './ui/AnimatedNumber';

/**
 * Brushed-metal LXG card. Tilts in 3D toward the cursor and a holographic
 * glare tracks the light source, like a real premium card under a lamp.
 */
function BalanceCard({ address, totalBalance, usdValue }) {
  const cardRef = useRef(null);

  const handleMove = (event) => {
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.transform = `rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 16}deg)`;
    card.style.setProperty('--gx', `${x * 100}%`);
    card.style.setProperty('--gy', `${y * 100}%`);
  };

  const handleLeave = () => {
    cardRef.current.style.transform = 'rotateX(0) rotateY(0)';
  };

  const groups = (address || '0x0000000000000000').slice(2, 18).toUpperCase().match(/.{1,4}/g);

  return (
    <div style={{ perspective: 1200 }} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <div
        ref={cardRef}
        className="relative w-full aspect-[1.7/1] max-h-[280px] rounded-[22px] overflow-hidden transition-transform duration-200 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          background:
            'linear-gradient(135deg, #2a2416 0%, #13110b 40%, #1d1a10 60%, #3a301a 100%)',
          boxShadow:
            '0 40px 60px -30px rgba(0,0,0,0.95), 0 0 0 1px rgba(246,226,122,0.25) inset, 0 1px 0 rgba(255,245,200,0.25) inset',
        }}
      >
        {/* brushed metal */}
        <div
          className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0px, rgba(0,0,0,0.4) 1px, rgba(255,255,255,0.2) 2px, rgba(0,0,0,0.3) 3px)' }}
        />
        {/* guilloché rings */}
        <svg className="absolute -right-24 -top-24 w-[420px] h-[420px] opacity-25" viewBox="0 0 200 200" aria-hidden="true">
          {Array.from({ length: 16 }).map((_, i) => (
            <circle key={i} cx="100" cy="100" r={20 + i * 5} fill="none" stroke="#d4af37" strokeWidth="0.35" />
          ))}
        </svg>
        {/* holographic glare */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(500px circle at var(--gx, 30%) var(--gy, 20%), rgba(255,245,200,0.22), transparent 40%), linear-gradient(115deg, transparent 30%, rgba(120,200,255,0.06) 45%, rgba(255,120,220,0.06) 55%, transparent 70%)',
          }}
        />

        <div className="relative h-full p-5 sm:p-7 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow !text-[#d4af37]/80">Total balance</p>
              <p className="mt-2 text-3xl sm:text-5xl font-bold font-display text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                <AnimatedNumber value={totalBalance} />
                <span className="text-lg sm:text-2xl ml-2 gradient-text">LXG</span>
              </p>
              <p className="mt-1 text-sm text-gray-400 tabular">
                ≈ <AnimatedNumber value={usdValue} prefix="$" /> USD
              </p>
            </div>
            <LogoMark size={44} />
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {/* EMV chip */}
                <div
                  className="w-11 h-8 rounded-md relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #f6e27a, #b8891f 50%, #f3d77a)', boxShadow: 'inset 0 0 0 1px rgba(80,55,5,0.5)' }}
                >
                  <div className="absolute inset-y-1 left-1/2 w-px bg-black/30" />
                  <div className="absolute inset-x-1 top-1/3 h-px bg-black/30" />
                  <div className="absolute inset-x-1 top-2/3 h-px bg-black/30" />
                </div>
                <Wifi className="w-5 h-5 text-[#d4af37]/70 rotate-90" />
              </div>
              <p className="font-mono text-xs sm:text-base tracking-[0.12em] sm:tracking-[0.2em] text-gray-200 whitespace-nowrap" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.15)' }}>
                0x {groups.join(' ')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] eyebrow">Network</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-200 whitespace-nowrap">Polygon PoS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BalanceCard;
