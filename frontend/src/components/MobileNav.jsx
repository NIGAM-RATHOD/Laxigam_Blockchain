import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeftRight, Gamepad2, LayoutDashboard, MoreHorizontal, Wallet, X } from 'lucide-react';
import { NAV_SECTIONS } from './Sidebar';
import { haptic } from '../hooks/useTelegram';

const PRIMARY = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/mediator', label: 'Swap', icon: ArrowLeftRight, center: true },
  { path: '/game-wallet', label: 'Games', icon: Gamepad2 },
];

/** Thumb-reachable bottom bar for phones and the Telegram Mini App. */
function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const allItems = NAV_SECTIONS.flatMap((section) => section.items);

  return (
    <>
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-rise" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-24 left-3 right-3 card !p-3 grid grid-cols-3 gap-2" onClick={(event) => event.stopPropagation()}>
            {allItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => {
                  haptic();
                  setMoreOpen(false);
                }}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs ${isActive ? 'bg-[#d4af37]/15 text-[#f6e27a]' : 'text-gray-400 hover:bg-white/5'}`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="glass !border border-white/10 rounded-2xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.9)] grid grid-cols-5 items-end px-1 py-1.5">
          {PRIMARY.slice(0, 2).map((item) => <Tab key={item.path} item={item} />)}
          <Tab item={PRIMARY[2]} />
          {PRIMARY.slice(3).map((item) => <Tab key={item.path} item={item} />)}
          <button
            onClick={() => {
              haptic();
              setMoreOpen(!moreOpen);
            }}
            className="flex flex-col items-center gap-1 py-1.5 text-[11px] text-gray-400"
          >
            {moreOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            More
          </button>
        </div>
      </nav>
    </>
  );
}

function Tab({ item }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={() => haptic()}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors ${isActive ? 'text-[#f6e27a]' : 'text-gray-400'}`
      }
    >
      {({ isActive }) =>
        item.center ? (
          <>
            <span className="-mt-7 w-14 h-14 rounded-2xl flex items-center justify-center btn-primary !p-0 !rounded-2xl">
              <item.icon className="w-6 h-6" />
            </span>
            <span className={isActive ? 'text-[#f6e27a]' : ''}>{item.label}</span>
          </>
        ) : (
          <>
            <item.icon className="w-5 h-5" />
            {item.label}
          </>
        )
      }
    </NavLink>
  );
}

export default MobileNav;
