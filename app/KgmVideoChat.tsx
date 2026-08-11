"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const TOKEN_KEY = "kgm-village-chat-token-v2";
const ACCOUNT_CACHE_KEY = "kgm-account-cache-v1";

type CachedAccount = { id?: string; nickname?: string; role?: string };

function readAccount(): CachedAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CACHE_KEY);
    return raw ? JSON.parse(raw) as CachedAccount : null;
  } catch {
    return null;
  }
}

function dailyRoomName() {
  const now = new Date();
  const localDay = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  return `KGM-Koratlagudem-Youthverse-${localDay}`;
}

function roomUrl(nickname: string) {
  const room = encodeURIComponent(dailyRoomName());
  const name = encodeURIComponent(nickname || "KGM member");
  return `https://meet.jit.si/${room}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.prejoinPageEnabled=true&config.disableDeepLinking=true&userInfo.displayName=${name}`;
}

export default function KgmVideoChat() {
  const [host, setHost] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [account, setAccount] = useState<CachedAccount | null>(null);

  useEffect(() => {
    let frame = 0;
    const findHost = () => {
      const next = document.querySelector(".village-chat-meta-actions");
      setHost((current) => current === next ? current : next);
    };
    findHost();
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(findHost);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const sync = () => setAccount(readAccount());
    sync();
    window.addEventListener("kgm-auth-state", sync);
    window.addEventListener("kgm-profile-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kgm-auth-state", sync);
      window.removeEventListener("kgm-profile-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("kgm-video-chat-open", open);
    return () => document.documentElement.classList.remove("kgm-video-chat-open");
  }, [open]);

  const src = useMemo(() => roomUrl(account?.nickname || "KGM member"), [account?.nickname]);
  const authenticated = Boolean(account?.id && typeof window !== "undefined" && localStorage.getItem(TOKEN_KEY));

  function launch() {
    if (!authenticated) {
      (document.querySelector(".kgm-account-nav-link") as HTMLElement | null)?.click();
      return;
    }
    setJoined(false);
    setOpen(true);
  }

  function close() {
    setJoined(false);
    setOpen(false);
  }

  const trigger = host ? createPortal(
    <button className="kgm-video-chat-trigger" type="button" onClick={launch} title="Open KGM video room" data-kgm-no-translate>
      <span aria-hidden="true">🎥</span>
      <span className="kgm-video-en">Video room</span>
      <span className="kgm-video-te" lang="te">వీడియో గది</span>
    </button>,
    host,
  ) : null;

  return <>
    {trigger}
    {open && <div className="kgm-video-chat-backdrop" role="dialog" aria-modal="true" aria-label="KGM Video Room" data-kgm-no-translate>
      <section className="kgm-video-chat-shell">
        <header className="kgm-video-chat-head">
          <div className="kgm-video-chat-brand">
            <span className="kgm-video-live"><i /> LIVE</span>
            <div>
              <strong className="kgm-video-en">KGM Video Room</strong>
              <strong className="kgm-video-te" lang="te">KGM వీడియో గది</strong>
              <small className="kgm-video-en">Koratlagudem · today&apos;s community room</small>
              <small className="kgm-video-te" lang="te">కొరట్లగూడెం · ఈరోజు కమ్యూనిటీ గది</small>
            </div>
          </div>
          <button className="kgm-video-chat-close" type="button" onClick={close} aria-label="Close video room">×</button>
        </header>

        {!joined ? <div className="kgm-video-chat-lobby">
          <div className="kgm-video-lobby-mark" aria-hidden="true"><span>◉</span><b>↗</b></div>
          <span className="kgm-video-kicker kgm-video-en">FACE TO FACE · WITHOUT SHARING PHONE NUMBERS</span>
          <span className="kgm-video-kicker kgm-video-te" lang="te">ఫోన్ నంబర్లు పంచుకోకుండా · ముఖాముఖి</span>
          <h2 className="kgm-video-en">See the village.<br/>Talk together.</h2>
          <h2 className="kgm-video-te" lang="te">మన ఊరిని చూడండి.<br/>కలిసి మాట్లాడండి.</h2>
          <p className="kgm-video-en">A shared KGM video room for signed-in community members. Your camera and microphone start off; turn them on only when you choose.</p>
          <p className="kgm-video-te" lang="te">సైన్ ఇన్ చేసిన KGM సభ్యుల కోసం ఒకే వీడియో గది. కెమెరా, మైక్ మొదట ఆఫ్‌లో ఉంటాయి; మీకు కావాలనిపించినప్పుడే ఆన్ చేయండి.</p>

          <div className="kgm-video-safety-grid">
            <div><span>🔒</span><strong className="kgm-video-en">KGM account required</strong><strong className="kgm-video-te" lang="te">KGM ఖాతా అవసరం</strong></div>
            <div><span>🎙️</span><strong className="kgm-video-en">Mic starts muted</strong><strong className="kgm-video-te" lang="te">మైక్ మొదట మ్యూట్</strong></div>
            <div><span>📷</span><strong className="kgm-video-en">Camera starts off</strong><strong className="kgm-video-te" lang="te">కెమెరా మొదట ఆఫ్</strong></div>
            <div><span>🌅</span><strong className="kgm-video-en">New room each day</strong><strong className="kgm-video-te" lang="te">ప్రతి రోజు కొత్త గది</strong></div>
          </div>

          <div className="kgm-video-safety-note">
            <span>🛡️</span>
            <p className="kgm-video-en"><strong>Community safety:</strong> keep personal contact details private, leave immediately if anything feels uncomfortable, and use Village Chat reporting for community concerns.</p>
            <p className="kgm-video-te" lang="te"><strong>కమ్యూనిటీ భద్రత:</strong> వ్యక్తిగత సంప్రదింపు వివరాలు పంచుకోకండి. అసౌకర్యంగా అనిపిస్తే వెంటనే బయటకు రండి; సమస్యలను Village Chat ద్వారా రిపోర్ట్ చేయండి.</p>
          </div>

          <button className="kgm-video-enter" type="button" onClick={() => setJoined(true)}>
            <span className="kgm-video-en">Enter video room</span>
            <span className="kgm-video-te" lang="te">వీడియో గదిలోకి వెళ్లండి</span>
            <b aria-hidden="true">→</b>
          </button>
          <small className="kgm-video-provider kgm-video-en">Live calling opens inside KGM using Jitsi Meet.</small>
          <small className="kgm-video-provider kgm-video-te" lang="te">లైవ్ కాలింగ్ KGMలో Jitsi Meet ద్వారా తెరుచుకుంటుంది.</small>
        </div> : <div className="kgm-video-stage">
          <iframe
            src={src}
            title="KGM community video room"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            referrerPolicy="no-referrer"
            allowFullScreen
          />
          <div className="kgm-video-stage-bar">
            <span><i /> <span className="kgm-video-en">Today&apos;s KGM room</span><span className="kgm-video-te" lang="te">ఈరోజు KGM గది</span></span>
            <button type="button" onClick={close}><span className="kgm-video-en">Leave room</span><span className="kgm-video-te" lang="te">గది నుంచి బయటకు</span></button>
          </div>
        </div>}
      </section>
    </div>}
  </>;
}
