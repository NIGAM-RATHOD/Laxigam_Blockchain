import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWalletStore } from '../store/walletStore';

const tg = () => window.Telegram?.WebApp;

/** True only inside a real Telegram client (the SDK script also loads in normal browsers). */
export const isTelegramWebApp = () => Boolean(tg()?.initData);

/** Light haptic tap inside Telegram; no-op elsewhere. */
export const haptic = (style = 'light') => tg()?.HapticFeedback?.impactOccurred(style);

/**
 * Wires the Mini App into Telegram:
 *  - ready/expand + brand colours for header, background and bottom bar
 *  - links the Telegram user to the wallet store so security PINs arrive in the bot chat
 *  - native BackButton that follows the router
 */
export function useTelegram() {
  const navigate = useNavigate();
  const location = useLocation();
  const { telegramChatId, setTelegramChatId } = useWalletStore();
  const inTelegram = useMemo(isTelegramWebApp, []);
  const user = inTelegram ? tg().initDataUnsafe?.user : null;

  useEffect(() => {
    if (!inTelegram) return;
    const app = tg();
    app.ready();
    app.expand();
    app.setHeaderColor?.('#07070b');
    app.setBackgroundColor?.('#07070b');
    app.setBottomBarColor?.('#07070b');
    app.disableVerticalSwipes?.();

    // In a private chat with the bot, chat id === user id
    if (user?.id && !telegramChatId) setTelegramChatId(String(user.id));
  }, [inTelegram, user?.id, telegramChatId, setTelegramChatId]);

  useEffect(() => {
    if (!inTelegram) return;
    const back = tg().BackButton;
    const goBack = () => {
      haptic();
      navigate(-1);
    };

    if (location.pathname === '/') back.hide();
    else back.show();

    back.onClick(goBack);
    return () => back.offClick(goBack);
  }, [inTelegram, location.pathname, navigate]);

  return { inTelegram, user };
}
