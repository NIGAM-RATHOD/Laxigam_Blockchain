import React from 'react';

/** Fixed ambient background: drifting light orbs, perspective grid and film grain. */
function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-orb" style={{ width: 520, height: 520, top: '-12%', right: '-8%', background: 'rgba(212,175,55,0.22)' }} />
      <div className="scene-orb" style={{ width: 420, height: 420, top: '35%', left: '-12%', background: 'rgba(56,189,248,0.10)', animationDelay: '-8s' }} />
      <div className="scene-orb" style={{ width: 380, height: 380, bottom: '-10%', right: '25%', background: 'rgba(168,85,247,0.10)', animationDelay: '-14s' }} />
      <div className="scene-grid" />
      <div className="scene-grain" />
    </div>
  );
}

export default Scene;
