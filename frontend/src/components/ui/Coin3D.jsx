import React, { useRef } from 'react';

const EDGE_LAYERS = 14;

/**
 * A minted LXG coin rendered in real 3D: stacked edge layers give it thickness,
 * a conic gradient gives the brushed-metal face, and it tilts toward the cursor.
 */
function Coin3D({ size = 220, interactive = true }) {
  const tiltRef = useRef(null);

  const handleMove = (event) => {
    if (!interactive || !tiltRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltRef.current.style.transform = `rotateX(${-y * 30}deg) rotateY(${x * 30}deg)`;
  };

  const handleLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };

  const thickness = size * 0.085;

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size, perspective: size * 5 }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {/* contact shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-xl animate-float"
        style={{ bottom: -size * 0.18, width: size * 0.7, height: size * 0.12, background: 'rgba(0,0,0,0.7)', animationDirection: 'reverse' }}
      />
      {/* glow */}
      <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.35), transparent 65%)' }} />

      <div className="absolute inset-0 animate-float">
        <div ref={tiltRef} className="absolute inset-0 transition-transform duration-300 ease-out" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 coin-spin" style={{ transformStyle: 'preserve-3d' }}>
            {/* edge — stacked rims give the coin real depth when it turns */}
            {Array.from({ length: EDGE_LAYERS }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{
                  transform: `translateZ(${-thickness / 2 + (thickness / (EDGE_LAYERS - 1)) * i}px)`,
                  background: 'repeating-conic-gradient(from 0deg, #8a6a14 0deg 2deg, #c9a43a 2deg 4deg)',
                }}
              />
            ))}
            <CoinFace size={size} z={thickness / 2} />
            <CoinFace size={size} z={-thickness / 2} back />
          </div>
        </div>
      </div>

      <style>{`
        .coin-spin { animation: coin-spin 14s cubic-bezier(.45,.05,.55,.95) infinite; }
        @keyframes coin-spin {
          0%   { transform: rotateY(-22deg) rotateX(8deg); }
          45%  { transform: rotateY(22deg)  rotateX(-4deg); }
          50%  { transform: rotateY(180deg) rotateX(0deg); }
          95%  { transform: rotateY(338deg) rotateX(6deg); }
          100% { transform: rotateY(338deg) rotateX(8deg); }
        }
        @media (prefers-reduced-motion: reduce) { .coin-spin { animation: none; } }
      `}</style>
    </div>
  );
}

function CoinFace({ size, z, back = false }) {
  return (
    <div
      className="absolute inset-0 rounded-full overflow-hidden"
      style={{
        transform: `translateZ(${z}px) ${back ? 'rotateY(180deg)' : ''}`,
        backfaceVisibility: 'hidden',
        background:
          'conic-gradient(from 210deg, #f9e9a0, #c9a43a, #8a6a14, #e8c55a, #fff3c4, #b8891f, #f6e27a, #9c7718, #f9e9a0)',
        boxShadow: 'inset 0 0 0 1px rgba(255,240,190,.6), inset 0 -10px 24px rgba(90,60,5,.55), inset 0 10px 24px rgba(255,250,220,.45)',
      }}
    >
      {/* milled rim */}
      <div
        className="absolute rounded-full"
        style={{
          inset: size * 0.035,
          background: 'repeating-conic-gradient(from 0deg, rgba(255,245,200,.55) 0deg 1.5deg, rgba(110,80,10,.55) 1.5deg 3deg)',
        }}
      />
      {/* inner field */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          inset: size * 0.075,
          background: 'radial-gradient(circle at 35% 30%, #fff6d0 0%, #e8c55a 28%, #b8891f 62%, #7a5c10 100%)',
          boxShadow: 'inset 0 4px 10px rgba(80,55,5,.6), inset 0 -3px 8px rgba(255,245,200,.5)',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ inset: size * 0.05, border: `${Math.max(1, size * 0.006)}px solid rgba(110,80,10,.45)`, boxShadow: '0 1px 0 rgba(255,245,200,.5)' }}
        />
        <div className="text-center leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <div
            style={{
              fontSize: size * 0.24,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: '#6b4f0c',
              textShadow: '0 1px 0 rgba(255,245,200,.85), 0 -1px 0 rgba(60,40,0,.5)',
            }}
          >
            {back ? 'Ⓛ' : 'LXG'}
          </div>
          <div style={{ fontSize: size * 0.05, fontWeight: 600, letterSpacing: '0.35em', color: '#7a5c10', marginTop: size * 0.03, textShadow: '0 1px 0 rgba(255,245,200,.7)' }}>
            {back ? 'MEDIATOR' : 'LAXIGAM'}
          </div>
        </div>
      </div>
      {/* specular sweep */}
      <div className="absolute inset-0 coin-glint" style={{ background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,.55) 48%, transparent 60%)' }} />
      <style>{`
        .coin-glint { animation: coin-glint 5s ease-in-out infinite; mix-blend-mode: overlay; }
        @keyframes coin-glint { 0%,100% { transform: translateX(-60%); } 50% { transform: translateX(60%); } }
      `}</style>
    </div>
  );
}

export default Coin3D;
