import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Gamepad2,
  History,
  Send,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import BalanceCard from '../components/BalanceCard';
import Spotlight from '../components/ui/Spotlight';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { useNetworkStats, NETWORK_NAMES } from '../hooks/useNetworkStats';
import { useWalletStore, useExchangeStore } from '../store/walletStore';
import { TELEGRAM_URL } from '../config';

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

const TX_STYLE = {
  deposit: { icon: ArrowDownLeft, tone: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20', sign: '+' },
  withdraw: { icon: ArrowUpRight, tone: 'text-rose-400 bg-rose-500/10 ring-rose-500/20', sign: '−' },
  default: { icon: Gamepad2, tone: 'text-sky-400 bg-sky-500/10 ring-sky-500/20', sign: '−' },
};

function Dashboard() {
  const { address, realBalance, gameBalances, trustScore, transactions, telegramChatId } = useWalletStore();
  const { lxgUsdRate, fetchRates } = useExchangeStore();
  const network = useNetworkStats();

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const totalGameBalance = Object.values(gameBalances).reduce((a, b) => a + b, 0);
  const totalBalance = realBalance + totalGameBalance;
  const recentTransactions = transactions.slice(0, 5);
  const trustTier = trustScore >= 70 ? { label: 'Excellent', color: '#22c55e' } : trustScore >= 30 ? { label: 'Good', color: '#eab308' } : { label: 'Building', color: '#ef4444' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1 className="text-3xl font-bold text-white mt-1">Your Laxigam overview</h1>
        </div>
        <div className="flex gap-3">
          <Link to="/mediator" className="btn-primary">
            <ArrowLeftRight className="w-4 h-4" /> Buy / Sell LXG
          </Link>
          <Link to="/withdraw" className="btn-secondary">
            <ArrowUpRight className="w-4 h-4" /> Withdraw
          </Link>
        </div>
      </div>

      {/* Hero row */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <BalanceCard address={address} totalBalance={totalBalance} usdValue={totalBalance * lxgUsdRate} />

        <div className="grid grid-cols-2 gap-4">
          <MiniStat icon={Wallet} label="Real wallet" value={<AnimatedNumber value={realBalance} />} hint="Withdrawable" accent="from-emerald-400/20" />
          <MiniStat icon={Gamepad2} label="Game wallets" value={<AnimatedNumber value={totalGameBalance} />} hint={`${Object.keys(gameBalances).length} games linked`} accent="from-sky-400/20" />
          <MiniStat icon={TrendingUp} label="LXG price" value={<AnimatedNumber value={lxgUsdRate} decimals={3} prefix="$" />} hint="Oracle rate" accent="from-[#d4af37]/25" />
          <TrustRing score={trustScore} tier={trustTier} />
        </div>
      </div>

      {/* Telegram link prompt */}
      {!telegramChatId && (
        <div className="card !py-4 flex flex-col sm:flex-row sm:items-center gap-4 !border-sky-500/20 bg-gradient-to-r from-sky-500/[0.07] to-transparent">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Link Telegram to unlock withdrawals</p>
            <p className="text-sm text-gray-400">Security PINs and payout receipts are delivered to your Telegram chat.</p>
          </div>
          <div className="flex gap-2">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2 text-sm">Open bot</a>
            <Link to="/settings" className="btn-primary !py-2 text-sm">Link chat ID</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game wallets */}
        <Spotlight className="lg:col-span-2">
          <SectionHeader title="Game wallets" to="/game-wallet" />
          {Object.keys(gameBalances).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(gameBalances).map(([game, balance]) => (
                <div key={game} className="tx-item !mb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(168,85,247,0.8)]">
                      <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{game}</p>
                      <p className="text-xs text-gray-500">Game balance</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{balance.toFixed(2)} LXG</p>
                    <p className="text-xs text-gray-500 tabular">≈ ${(balance * lxgUsdRate).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Gamepad2} title="No game wallets linked yet" action={<Link to="/game-wallet" className="btn-secondary !py-2 text-sm mt-4">Connect your first game</Link>} />
          )}
        </Spotlight>

        {/* Live network */}
        <Spotlight>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#d4af37]" /> Network
            </h2>
            <span className="badge badge-success">
              <span className={`live-dot ${network.online === false ? 'offline' : ''}`} /> {network.online === false ? 'Offline' : 'Live'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">{NETWORK_NAMES[network.chainId] || 'Polygon'} gas price, sampled every 6 s</p>

          <div className="h-32 -mx-2">
            {network.history.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={network.history} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="gasFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    cursor={{ stroke: 'rgba(212,175,55,0.4)' }}
                    contentStyle={{ background: '#12121c', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, fontSize: 12 }}
                    labelFormatter={(_, payload) => (payload?.[0] ? `Block #${payload[0].payload.blockNumber.toLocaleString()}` : '')}
                    formatter={(value) => [`${value.toFixed(1)} gwei`, 'Gas']}
                  />
                  <Area type="monotone" dataKey="gasGwei" stroke="#f6e27a" strokeWidth={2} fill="url(#gasFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl animate-shimmer" />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <NetStat label="Block" value={network.blockNumber ? `#${network.blockNumber.toLocaleString()}` : '—'} />
            <NetStat label="Gas" value={network.gasGwei ? `${network.gasGwei.toFixed(0)} gwei` : '—'} />
            <NetStat label="RPC" value={network.latencyMs ? `${network.latencyMs} ms` : '—'} />
          </div>
        </Spotlight>
      </div>

      {/* Recent transactions */}
      <Spotlight>
        <SectionHeader title="Recent transactions" to="/history" />
        {recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map((tx, index) => {
              const style = TX_STYLE[tx.type] || TX_STYLE.default;
              return (
                <div key={tx.id || index} className="tx-item !mb-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center ${style.tone}`}>
                      <style.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{tx.source} → {tx.destination}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold tabular ${style.tone.split(' ')[0]}`}>
                      {style.sign}{tx.amount_lxg?.toFixed(2)} LXG
                    </p>
                    <p className="text-xs text-gray-500">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Just now'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={History} title="No transactions yet" body="Deposits, transfers and payouts will appear here." />
        )}
      </Spotlight>
    </div>
  );
}

function SectionHeader({ title, to }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link to={to} className="text-[#d4af37] text-sm flex items-center gap-1 hover:gap-2 transition-all">
        View all <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint, accent }) {
  return (
    <Spotlight className="!p-4 flex flex-col justify-between overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${accent} to-transparent blur-2xl pointer-events-none`} />
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div>
        <p className="mt-3 text-xl sm:text-2xl font-bold font-display">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
    </Spotlight>
  );
}

function TrustRing({ score, tier }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <Spotlight className="!p-4 flex items-center gap-3">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90 shrink-0">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 6px ${tier.color})` }}
        />
      </svg>
      <div>
        <p className="text-xs text-gray-400 font-medium flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Trust</p>
        <p className="text-2xl font-bold font-display">{score}</p>
        <p className="text-xs" style={{ color: tier.color }}>{tier.label}</p>
      </div>
    </Spotlight>
  );
}

function NetStat({ label, value }) {
  return (
    <div className="surface-inset px-2.5 py-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-mono font-semibold text-gray-200 truncate">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="text-center py-10 flex flex-col items-center">
      <div className="w-14 h-14 rounded-2xl surface-inset flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-gray-500" />
      </div>
      <p className="text-gray-300 font-medium">{title}</p>
      {body && <p className="text-sm text-gray-500 mt-1">{body}</p>}
      {action}
    </div>
  );
}

export default Dashboard;
