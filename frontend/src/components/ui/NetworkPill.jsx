import React from 'react';
import { NETWORK_NAMES, useNetworkStats } from '../../hooks/useNetworkStats';

/** Live chain status: pulsing dot, network name and current block. */
function NetworkPill({ showBlock = true }) {
  const network = useNetworkStats();
  const label = NETWORK_NAMES[network.chainId] || 'Polygon';

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 text-xs"
      title={network.online ? `${label} · RPC ${network.latencyMs} ms` : network.online === false ? 'RPC unreachable' : 'Connecting…'}
    >
      <span className={`live-dot ${network.online === false ? 'offline' : ''}`} />
      <span className="text-gray-300 font-medium">{label}</span>
      {showBlock && network.blockNumber && <span className="hidden md:inline font-mono text-gray-500">#{network.blockNumber.toLocaleString()}</span>}
    </div>
  );
}

export default NetworkPill;
