"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function YouthHeroShowcase() {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    let currentHost: HTMLElement | null = null;

    const mount = () => {
      const grid = document.querySelector<HTMLElement>(".yv-hero-grid-simple");
      if (!grid) return;

      let nextHost = document.getElementById("kgm-youth-hero-showcase-root") as HTMLElement | null;
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.id = "kgm-youth-hero-showcase-root";
        nextHost.className = "yv-hero-showcase-host";
        grid.appendChild(nextHost);
      }

      if (currentHost !== nextHost) {
        currentHost = nextHost;
        setHost(nextHost);
      }
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      currentHost?.remove();
    };
  }, []);

  function click(selector: string) {
    (document.querySelector(selector) as HTMLElement | null)?.click();
  }

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openCinema() {
    window.dispatchEvent(new Event("kgm-open-cinema"));
  }

  const showcase = (
    <aside className="yv-hero-showcase yv-hero-showcase-v2" aria-label="Explore the KGM ecosystem">
      <div className="yv-signal-ambient" aria-hidden="true">
        <i className="ring ring-a" />
        <i className="ring ring-b" />
        <i className="ring ring-c" />
        <span className="signal-dot dot-a" />
        <span className="signal-dot dot-b" />
        <span className="signal-dot dot-c" />
      </div>

      <section className="yv-signal-board">
        <header className="yv-signal-topbar">
          <div className="yv-signal-live"><i /> LIVE FROM KORATLAGUDEM</div>
          <div className="yv-signal-id">KGM / SIGNAL 01</div>
        </header>

        <div className="yv-signal-intro">
          <div className="yv-signal-logo">K</div>
          <div>
            <small>KGM YOUTHVERSE</small>
            <h2>Local ideas.<br/><em>Global signal.</em></h2>
          </div>
        </div>

        <div className="yv-signal-route" aria-label="From Koratlagudem to everywhere">
          <div className="yv-signal-place yv-signal-place-home">
            <span>KGM</span>
            <div><small>MADE HERE</small><strong>Koratlagudem</strong><em>17.12° N · 80.02° E</em></div>
          </div>
          <div className="yv-signal-beam" aria-hidden="true"><i/><i/><i/><b>→</b></div>
          <div className="yv-signal-place yv-signal-place-world">
            <span>∞</span>
            <div><small>SHARED OUT</small><strong>Everywhere</strong><em>Open knowledge network</em></div>
          </div>
        </div>

        <div className="yv-signal-caption">
          <p>Apps, science, music and village creations — one place to build locally and share beyond the village.</p>
          <span><b>05</b> creative spaces</span>
        </div>

        <nav className="yv-signal-channels" aria-label="KGM creative spaces">
          <button type="button" className="yv-signal-channel yv-channel-apps" onClick={() => jump("apps")}>
            <span className="yv-channel-icon">⌘</span>
            <div><small>BUILD</small><strong>Young makers</strong><em>Apps →</em></div>
          </button>
          <button type="button" className="yv-signal-channel yv-channel-cinema" onClick={openCinema}>
            <span className="yv-channel-icon">▶</span>
            <div><small>WATCH</small><strong>Science Cinema</strong><em>STEM →</em></div>
          </button>
          <button type="button" className="yv-signal-channel yv-channel-music" onClick={() => jump("music")}>
            <span className="yv-channel-wave" aria-hidden="true"><i/><i/><i/><i/></span>
            <div><small>LISTEN</small><strong>KGM Folk Radio</strong><em>Play ♪</em></div>
          </button>
          <button type="button" className="yv-signal-channel yv-channel-gallery" onClick={() => click(".kgm-gallery-nav-link")}>
            <span className="yv-channel-stack" aria-hidden="true"><i/><i/><i/></span>
            <div><small>SHARE</small><strong>Community Gallery</strong><em>Open ↗</em></div>
          </button>
        </nav>

        <footer className="yv-signal-footer">
          <span><i/> COMMUNITY NETWORK ONLINE</span>
          <strong>OPEN TO EVERYONE ↗</strong>
        </footer>
      </section>

      <div className="yv-signal-side-label" aria-hidden="true"><span>KGM</span><small>KORATLAGUDEM → WORLD</small></div>
    </aside>
  );

  return host ? createPortal(showcase, host) : null;
}
