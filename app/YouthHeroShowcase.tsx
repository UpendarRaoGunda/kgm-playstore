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

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".yv-hero-grid-simple");
    if (!hero || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("kgm-hero-in-view", Boolean(entry?.isIntersecting));
    }, { threshold: 0.16 });

    observer.observe(hero);
    return () => {
      observer.disconnect();
      document.body.classList.remove("kgm-hero-in-view");
    };
  }, [host]);

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
    <aside className="yv-transmission yv-transmission-v3" aria-label="Koratlagudem creations shared everywhere through KGM">
      <div className="yv-tx-scan" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="yv-tx-glow" aria-hidden="true" />

      <div className="yv-tx-meta">
        <span className="yv-tx-live"><i /> LIVE FROM KORATLAGUDEM</span>
        <span>KGM° · YOUTHVERSE</span>
      </div>

      <div className="yv-tx-stage">
        <div className="yv-tx-origin">
          <span className="yv-origin-pulse" aria-hidden="true"><i/><i/></span>
          <div>
            <small>ORIGIN · 17.12°N 80.02°E</small>
            <strong>KORATLAGUDEM</strong>
            <em>TELANGANA · INDIA</em>
          </div>
        </div>

        <div className="yv-tx-beam" aria-hidden="true">
          <span className="yv-tx-beam-soft" />
          <span className="yv-tx-beam-core" />
          <i className="yv-tx-particle p1"/><i className="yv-tx-particle p2"/><i className="yv-tx-particle p3"/><i className="yv-tx-particle p4"/>
          <b>→</b>
        </div>

        <div className="yv-k-monolith" aria-label="KGM amplifier">
          <div className="yv-k-shadow" aria-hidden="true" />
          <div className="yv-k-back" aria-hidden="true" />
          <div className="yv-k-face">
            <span className="yv-k-eyebrow">KGM°</span>
            <strong>K</strong>
            <small>KORATLAGUDEM YOUTHVERSE</small>
          </div>
          <div className="yv-k-edge" aria-hidden="true" />
          <div className="yv-k-shine" aria-hidden="true" />
        </div>

        <div className="yv-tx-destination">
          <span className="yv-world-network" aria-hidden="true">
            <i className="n1"/><i className="n2"/><i className="n3"/><i className="n4"/><b/><em/>
          </span>
          <div>
            <small>OPEN ACCESS · GLOBAL</small>
            <strong>EVERYWHERE</strong>
            <em>Ideas travel farther than their postcode.</em>
          </div>
        </div>

        <div className="yv-tx-proof" aria-hidden="true">
          <span>MADE HERE</span><i/> <span>AMPLIFIED BY KGM</span><i/> <span>SHARED OUT</span>
        </div>
      </div>

      <nav className="yv-tx-spaces" aria-label="Explore KGM creative spaces">
        <button type="button" onClick={() => jump("apps")}><i className="apps"/><span><small>BUILD</small><strong>Apps</strong></span><b>↗</b></button>
        <button type="button" onClick={openCinema}><i className="cinema"/><span><small>WATCH</small><strong>Cinema</strong></span><b>↗</b></button>
        <button type="button" onClick={() => jump("music")}><i className="music"/><span><small>LISTEN</small><strong>Music</strong></span><b>↗</b></button>
        <button type="button" onClick={() => click(".kgm-gallery-nav-link")}><i className="gallery"/><span><small>SHARE</small><strong>Gallery</strong></span><b>↗</b></button>
      </nav>

      <div className="yv-tx-foot" aria-hidden="true">
        <span><i/> COMMUNITY NETWORK ONLINE</span>
        <strong>LOCAL CREATION → GLOBAL REACH</strong>
      </div>
    </aside>
  );

  return host ? createPortal(showcase, host) : null;
}
