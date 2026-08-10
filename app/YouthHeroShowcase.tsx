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
    <aside className="yv-hero-showcase" aria-label="Explore the KGM ecosystem">
      <div className="yv-hero-aurora" aria-hidden="true" />
      <div className="yv-hero-orbit yv-hero-orbit-a" aria-hidden="true" />
      <div className="yv-hero-orbit yv-hero-orbit-b" aria-hidden="true" />
      <div className="yv-hero-route" aria-hidden="true"><i /><i /><i /><i /></div>

      <div className="yv-hero-core-card">
        <div className="yv-hero-core-top">
          <span className="yv-hero-network-live"><i /> LIVE FROM KORATLAGUDEM</span>
          <span className="yv-hero-core-code">KGM°01</span>
        </div>
        <div className="yv-hero-core-brand">
          <span className="yv-hero-core-k">K</span>
          <div><small>KGM YOUTHVERSE</small><strong>Village ideas,<br/>everywhere.</strong></div>
        </div>
        <p>One home for things our community builds, watches, learns, records and shares.</p>
        <div className="yv-hero-core-stats">
          <span><strong>05</strong><small>creative spaces</small></span>
          <span><strong>01</strong><small>village network</small></span>
          <span><strong>∞</strong><small>curiosity</small></span>
        </div>
        <div className="yv-hero-core-foot"><span>17.12° N · 80.02° E</span><b>OPEN TO EVERYONE ↗</b></div>
      </div>

      <button type="button" className="yv-hero-mini yv-hero-mini-apps" onClick={() => jump("apps")} aria-label="Explore apps by young makers">
        <span className="yv-hero-mini-icon">⌘</span>
        <small>BUILT HERE</small>
        <strong>Young makers</strong>
        <em>Apps →</em>
      </button>

      <button type="button" className="yv-hero-mini yv-hero-mini-cinema" onClick={openCinema} aria-label="Open KGM Science Cinema">
        <span className="yv-hero-mini-icon">▶</span>
        <small>SCIENCE CINEMA</small>
        <strong>Watch curiosity</strong>
        <em>STEM →</em>
      </button>

      <button type="button" className="yv-hero-mini yv-hero-mini-music" onClick={() => jump("music")} aria-label="Play KGM music">
        <span className="yv-hero-mini-wave" aria-hidden="true"><i/><i/><i/><i/><i/></span>
        <small>FOLK RADIO</small>
        <strong>Village sounds</strong>
        <em>Play ♪</em>
      </button>

      <button type="button" className="yv-hero-mini yv-hero-mini-gallery" onClick={() => click(".kgm-gallery-nav-link")} aria-label="Open the KGM community gallery">
        <span className="yv-hero-gallery-stack" aria-hidden="true"><i/><i/><i/></span>
        <small>COMMUNITY DROP</small>
        <strong>Made by us</strong>
        <em>Gallery ↗</em>
      </button>

      <div className="yv-hero-share-ribbon" aria-hidden="true">
        <span>MADE HERE</span><i>→</i><span>SHARED EVERYWHERE</span>
      </div>
    </aside>
  );

  return host ? createPortal(showcase, host) : null;
}
