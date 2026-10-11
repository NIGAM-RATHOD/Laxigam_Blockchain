import { useEffect, useState } from 'react';

// Public CORS-enabled Polygon RPCs, tried in order (polygon-rpc.com now requires an API key)
const RPC_URLS = import.meta.env.VITE_RPC_URL
  ? [import.meta.env.VITE_RPC_URL]
  : ['https://polygon-bor-rpc.publicnode.com', 'https://polygon.drpc.org', 'https://1rpc.io/matic'];
let rpcIndex = 0;
const POLL_MS = 6000;
const HISTORY_SIZE = 40;

export const NETWORK_NAMES = { 137: 'Polygon', 80002: 'Polygon Amoy', 1: 'Ethereum', 31337: 'Hardhat' };

const rpc = async (method, params = []) => {
  const response = await fetch(RPC_URLS[rpcIndex], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
};

// One poller shared by every component that uses the hook.
let state = { online: null, blockNumber: null, gasGwei: null, chainId: null, latencyMs: null, updatedAt: null, history: [] };
const listeners = new Set();
let timer = null;

const publish = (next) => {
  state = next;
  listeners.forEach((listener) => listener(state));
};

const poll = async () => {
  const started = performance.now();
  try {
    const [block, gas, chain] = await Promise.all([rpc('eth_blockNumber'), rpc('eth_gasPrice'), rpc('eth_chainId')]);
    const sample = {
      time: Date.now(),
      blockNumber: parseInt(block, 16),
      gasGwei: parseInt(gas, 16) / 1e9,
      latencyMs: Math.round(performance.now() - started),
    };
    publish({
      online: true,
      ...sample,
      chainId: parseInt(chain, 16),
      updatedAt: sample.time,
      history: [...state.history, sample].slice(-HISTORY_SIZE),
    });
  } catch {
    rpcIndex = (rpcIndex + 1) % RPC_URLS.length; // fail over to the next endpoint
    publish({ ...state, online: false });
  }
};

/**
 * Live chain stats read straight from the configured RPC (Polygon by default).
 * Returns { online, blockNumber, gasGwei, chainId, latencyMs, updatedAt, history[] }.
 */
export function useNetworkStats() {
  const [stats, setStats] = useState(state);

  useEffect(() => {
    listeners.add(setStats);
    if (!timer) {
      poll();
      timer = setInterval(poll, POLL_MS);
    }
    return () => {
      listeners.delete(setStats);
      if (listeners.size === 0) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return stats;
}
