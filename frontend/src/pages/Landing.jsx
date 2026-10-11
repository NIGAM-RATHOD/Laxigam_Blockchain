import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Bot,
  Boxes,
  Cpu,
  Flame,
  Gamepad2,
  Github,
  Globe2,
  Landmark,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import Coin3D from '../components/ui/Coin3D';
import Logo from '../components/ui/Logo';
import Spotlight from '../components/ui/Spotlight';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import NetworkPill from '../components/ui/NetworkPill';
import { useNetworkStats, NETWORK_NAMES } from '../hooks/useNetworkStats';
import { haptic } from '../hooks/useTelegram';
import { GITHUB_URL, TELEGRAM_URL } from '../config';
import Flag from '../components/ui/Flag';

const RAILS = [
  { flag: '🇮🇳', name: 'UPI', region: 'India', speed: 'Instant' },
  { flag: '🇧🇷', name: 'PIX', region: 'Brazil', speed: 'Instant' },
  { flag: '🇷🇺', name: 'QIWI', region: 'Russia', speed: '< 5 min' },
  { flag: '🇨🇳', name: 'Alipay', region: 'China', speed: '< 5 min' },
  { flag: '🇿🇦', name: 'PayFast', region: 'South Africa', speed: '< 1 hr' },
  { flag: '⭐', name: 'Stars', region: 'Telegram', speed: 'Instant' },
  { flag: '💎', name: 'TON', region: 'The Open Network', speed: '~5 s' },
];

const STEPS = [
  { icon: Gamepad2, title: 'Earn in-game', body: 'Any integrated game credits LXG to your game wallet through the GameBridge contract.' },
  { icon: Boxes, title: 'Hold LXG on-chain', body: 'Move funds between game and real wallets. Every balance is verifiable on Polygon.' },
  { icon: Landmark, title: 'Cash out locally', body: 'Sell LXG to UPI, PIX, QIWI or Alipay. The MediatorVault locks tokens until the payout settles.' },
];

const FEATURES = [
  { icon: Cpu, title: 'Dual-AI validation', body: 'Gemini and Claude must both approve a transaction. Disagreement escalates to review.' },
  { icon: ShieldCheck, title: 'Trust Score', body: 'On-chain reputation that raises limits as you transact cleanly, and slows bad actors down.' },
  { icon: Lock, title: 'PIN via Telegram', body: 'Withdrawals need a one-time PIN delivered to your Telegram chat. Never stored in plain text.' },
  { icon: Flame, title: 'Deflationary', body: '50% of protocol fees are burned, permanently reducing LXG supply.' },
  { icon: Globe2, title: 'BRICS+ native', body: 'Local rails in local currencies. No dollar account or international wire required.' },
  { icon: Bot, title: 'Lives in Telegram', body: 'The full app runs as a Telegram Mini App. Pay with Stars, hold TON, get notified instantly.' },
];

function Landing({ onConnect, isTelegram }) {
  const [connecting, setConnecting] = useState(null);
  const network = useNetworkStats();

  const connectMetaMask = async () => {
    haptic('medium');
    if (!window.ethereum) {
      toast.error('MetaMask not detected');
      window.open('https://metamask.io/download/', '_blank', 'noopener');
      return;
    }
    setConnecting('metamask');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      onConnect(accounts[0]);
      toast.success('Wallet connected');
    } catch (error) {
      toast.error(error?.code === 4001 ? 'Request rejected in wallet' : 'Failed to connect wallet');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="relative z-10 min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size={34} />
          <div className="flex items-center gap-2 sm:gap-3">
            <NetworkPill />
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-3 !py-2" aria-label="GitHub repository">
              <Github className="w-4 h-4" />
            </a>
            {!isTelegram && (
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-3 !py-2 hidden sm:inline-flex">
                <Send className="w-4 h-4 text-sky-400" />
                <span className="text-sm">Telegram</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 lg:pt-20 pb-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div className="animate-rise">
          <span className="badge badge-gold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> The gaming-to-bank bridge for BRICS+
          </span>
          <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl font-bold text-white">
            Game earnings.
            <br />
            <span className="gradient-text-animated">Real money.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
            Laxigam turns in-game value into <span className="text-white font-medium">LXG</span> on Polygon and settles it to
            UPI, PIX, QIWI or Alipay in minutes — validated by two independent AIs and secured by a PIN sent to your Telegram.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
            <button onClick={connectMetaMask} disabled={!!connecting} className="btn-primary flex-1 !py-3.5 text-base whitespace-nowrap">
              {connecting === 'metamask' ? (
                <>
                  <span className="w-5 h-5 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <img src="/metamask.svg" alt="" className="w-5 h-5" />
                  Connect MetaMask
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              onClick={() => toast('WalletConnect & TON Connect are next on the roadmap', { icon: '🛠️' })}
              className="btn-secondary flex-1 !py-3.5 whitespace-nowrap"
            >
              <img src="/walletconnect.svg" alt="" className="w-5 h-5 rounded" />
              Other wallets
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Non-custodial</span>
            <span className="inline-flex items-center gap-2"><Cpu className="w-4 h-4 text-[#d4af37]" /> AI-validated</span>
            <span className="inline-flex items-center gap-2"><Zap className="w-4 h-4 text-sky-400" /> Open source · MIT</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center min-h-[360px] lg:min-h-[480px]">
          <div className="absolute inset-0 m-auto w-[340px] h-[340px] lg:w-[440px] lg:h-[440px] rounded-full border border-[#d4af37]/10" />
          <div className="absolute inset-0 m-auto w-[260px] h-[260px] lg:w-[340px] lg:h-[340px] rounded-full border border-dashed border-[#d4af37]/15 animate-[spin_60s_linear_infinite]" />
          <div className="hidden sm:block"><Coin3D size={280} /></div>
          <div className="sm:hidden"><Coin3D size={200} /></div>

          <FloatingChip className="top-6 left-0 lg:-left-4" delay="0s">
            <Flag emoji="🇮🇳" size={18} />
            <div>
              <p className="text-xs text-gray-500">Payout rail</p>
              <p className="text-sm font-semibold">UPI · INR</p>
            </div>
          </FloatingChip>
          <FloatingChip className="bottom-10 right-0 lg:-right-2" delay="-2s">
            <Cpu className="w-5 h-5 text-[#d4af37]" />
            <div>
              <p className="text-xs text-gray-500">AI consensus</p>
              <p className="text-sm font-semibold">Gemini ✓ Claude ✓</p>
            </div>
          </FloatingChip>
          <FloatingChip className="bottom-2 left-4 hidden sm:flex" delay="-4s">
            <Lock className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-xs text-gray-500">Withdrawal PIN</p>
              <p className="text-sm font-semibold font-mono tracking-[0.3em]">• • • • • •</p>
            </div>
          </FloatingChip>
        </div>
      </section>

      {/* Payment rails marquee */}
      <section className="border-y border-white/5 bg-black/30 overflow-hidden py-5">
        <div className="marquee-track gap-4">
          {[...RAILS, ...RAILS].map((rail, index) => (
            <div key={index} className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/5 bg-white/[0.02] shrink-0">
              <Flag emoji={rail.flag} size={18} />
              <span className="font-semibold">{rail.name}</span>
              <span className="text-gray-500 text-sm">{rail.region}</span>
              <span className="text-xs text-emerald-400/90 font-mono">{rail.speed}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Live stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label={`${NETWORK_NAMES[network.chainId] || 'Network'} block`}
            value={network.blockNumber ? <AnimatedNumber value={network.blockNumber} decimals={0} duration={1500} prefix="#" /> : '—'}
            hint={network.online ? 'live from RPC' : network.online === false ? 'RPC unreachable' : 'connecting…'}
            live={network.online}
          />
          <Stat
            label="Gas price"
            value={network.gasGwei ? <AnimatedNumber value={network.gasGwei} decimals={1} suffix=" gwei" /> : '—'}
            hint={network.latencyMs ? `${network.latencyMs} ms RPC latency` : 'awaiting response'}
          />
          <Stat label="Deposit / withdraw fee" value="0.5% · 1%" hint="set in MediatorVault" />
          <Stat label="Fees burned" value="50%" hint="deflationary by design" />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <p className="eyebrow mb-3">How it works</p>
        <h2 className="text-3xl sm:text-4xl font-bold mb-10">
          From <span className="gradient-text">game</span> to <span className="gradient-text">bank</span> in three moves
        </h2>
        <div className="relative grid md:grid-cols-3 gap-5">
          <div className="hidden md:block absolute top-[52px] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
          {STEPS.map((step, index) => (
            <Spotlight key={step.title} className="text-center !pt-8">
              <div className="relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-b from-[#2a2414] to-[#14110a] border border-[#d4af37]/30 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)]">
                <step.icon className="w-6 h-6 text-[#f6e27a]" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#d4af37] text-black text-xs font-bold flex items-center justify-center">{index + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">{step.body}</p>
            </Spotlight>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <p className="eyebrow mb-3">Security & infrastructure</p>
        <h2 className="text-3xl sm:text-4xl font-bold mb-10">Built like a bank. Feels like a game.</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <Spotlight key={feature.title}>
              <feature.icon className="w-6 h-6 text-[#d4af37]" />
              <h3 className="mt-4 font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">{feature.body}</p>
            </Spotlight>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="card !p-8 sm:!p-12 overflow-hidden">
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#d4af37]/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-bold">Open Laxigam in Telegram</h2>
              <p className="mt-2 text-gray-400 max-w-lg">
                The bot sends your security PINs, payout confirmations and opens the full wallet as a Mini App.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-primary !px-7 !py-3.5">
                <Send className="w-4 h-4" /> Launch the bot
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-7 !py-3.5">
                <Github className="w-4 h-4" /> Read the code
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <Logo size={24} />
          <p>© {new Date().getFullYear()} Nigam Rathod & the Laxigam team · MIT License</p>
          <div className="flex items-center gap-4">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, hint, live }) {
  return (
    <Spotlight className="!p-5">
      <p className="eyebrow flex items-center gap-2">
        {live && <span className="live-dot" />}
        {label}
      </p>
      <p className="mt-3 text-2xl sm:text-3xl font-bold font-display text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </Spotlight>
  );
}

function FloatingChip({ children, className = '', delay }) {
  return (
    <div
      className={`absolute flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-white/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.9)] animate-float ${className}`}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

export default Landing;
