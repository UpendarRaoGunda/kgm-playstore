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
    <aside className="yv-transmission" aria-label="Explore the KGM Youthverse">
      <div className="yv-transmission-grid" aria-hidden="true" />
      <div className="yv-transmission-glow" aria-hidden="true" />

      <div className="yv-transmission-meta">
        <span className="yv-transmission-live"><i /> LIVE FROM KORATLAGUDEM</span>
        <span>KGM° / YOUTHVERSE</span>
      </div>

      <div className="yv-transmission-stage">
        <div className="yv-transmission-origin">
          <small>ORIGIN</small>
          <strong>KORATLAGUDEM</strong>
          <span>TELANGANA · INDIA</span>
        </div>

        <div className="yv-k-monolith" aria-label="KGM Youthverse">
          <div className="yv-k-back" aria-hidden="true" />
          <div className="yv-k-face">
            <span className="yv-k-eyebrow">KGM°</span>
            <strong>K</strong>
            <div className="yv-k-caption"><small>MADE HERE</small><b>SHARED<br/>EVERYWHERE</b></div>
          </div>
          <div className="yv-k-edge" aria-hidden="true" />
          <div className="yv-k-shine" aria-hidden="true" />
        </div>

        <div className="yv-transmission-world">
          <span className="yv-world-mark">∞</span>
          <div><small>OPEN NETWORK</small><strong>EVERYWHERE</strong><em>Curiosity has no postcode.</em></div>
        </div>

        <div className="yv-transmission-beam" aria-hidden="true">
          <span className="yv-beam-line" />
          <i className="yv-beam-dot d1" /><i className="yv-beam-dot d2" /><i className="yv-beam-dot d3" />
          <b>→</b>
        </div>

        <div className="yv-transmission-stamp" aria-hidden="true">
          <span>17.12° N</span><i /> <span>80.02° E</span>
        </div>
      </div>

      <nav className="yv-transmission-rail" aria-label="KGM creative spaces">
        <button type="button" onClick={() => jump("apps")}>
          <span className="yv-rail-glyph apps">⌘</span>
          <span><small>BUILD</small><strong>Apps</strong></span>
          <b>↗</b>
        </button>
        <button type="button" onClick={openCinema}>
          <span className="yv-rail-glyph cinema">▶</span>
          <span><small>WATCH</small><strong>Cinema</strong></span>
          <b>↗</b>
        </button>
        <button type="button" onClick={() => jump("music")}>
          <span className="yv-rail-glyph music">♪</span>
          <span><small>LISTEN</small><strong>Music</strong></span>
          <b>↗</b>
        </button>
        <button type="button" onClick={() => click(".kgm-gallery-nav-link")}>
          <span className="yv-rail-glyph gallery">✦</span>
          <span><small>SHARE</small><strong>Gallery</strong></span>
          <b>↗</b>
        </button>
      </nav>

      <div className="yv-transmission-foot" aria-hidden="true">
        <span><i /> COMMUNITY NETWORK ONLINE</span>
        <strong>LOCAL CREATION → GLOBAL ACCESS</strong>
      </div>
    </aside>
  );

  return host ? createPortal(showcase, host) : null;
}
