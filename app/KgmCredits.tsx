"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const cofounders = [
  { name: "Devarakonda Chinna", initials: "DC" },
  { name: "Gunda Sandeep", initials: "GS" },
  { name: "Marthi Jashwanth", initials: "MJ" },
];

export default function KgmCredits() {
  const [spotlightHost, setSpotlightHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer = 0;

    const mountSpotlight = () => {
      if (cancelled) return;

      const heroGrid = document.querySelector(".yv-hero-grid");
      if (!heroGrid) {
        attempts += 1;
        if (attempts < 120) timer = window.setTimeout(mountSpotlight, 50);
        return;
      }

      const current = document.getElementById("kgm-founder-spotlight-root");
      if (current) {
        setSpotlightHost(current);
        return;
      }

      const host = document.createElement("div");
      host.id = "kgm-founder-spotlight-root";
      heroGrid.insertAdjacentElement("afterend", host);
      setSpotlightHost(host);
    };

    mountSpotlight();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.getElementById("kgm-founder-spotlight-root")?.remove();
    };
  }, []);

  const founderSpotlight = (
    <section className="kgm-founder-spotlight" aria-label="People behind KGM">
      <div className="kgm-founder-intro">
        <div>
          <span className="kgm-founder-eyebrow">✦ PEOPLE BEHIND KGM</span>
          <h2>Small village. Bold builders. A digital future made from here.</h2>
        </div>
        <p>
          KGM began with a simple belief: <strong>our village should not only consume technology — we should create it.</strong>
          Meet the people helping turn that belief into a community playground for learning, making and sharing.
        </p>
      </div>

      <div className="kgm-founder-grid">
        {cofounders.map((founder) => (
          <article className="kgm-founder-card" key={founder.name}>
            <div className="kgm-founder-avatar" aria-hidden="true">{founder.initials}</div>
            <div>
              <small>CO-FOUNDER</small>
              <strong>{founder.name}</strong>
              <span>KORATLAGUDEM · KGM</span>
            </div>
          </article>
        ))}
      </div>

      <div className="kgm-founder-manifesto">
        <strong>One village. One shared belief that local talent deserves a global stage.</strong>
        <span className="kgm-founder-arrow">KORATLAGUDEM → EVERYWHERE</span>
      </div>
    </section>
  );

  return (
    <>
      {spotlightHost ? createPortal(founderSpotlight, spotlightHost) : null}

      <section className="kgm-credits" aria-label="KGM community mission">
        <div className="kgm-credits-copy">
          <span>KGM · KORATLAGUDEM COMMUNITY</span>
          <strong>KGM began here.</strong>
          <p>Built with curiosity, courage and community — so our village can create, learn and share on its own terms.</p>
        </div>
        <div className="kgm-cofounders">
          <small>OPEN TO EVERYONE</small>
          <div>
            <span>LEARN</span>
            <span>BUILD</span>
            <span>SHARE</span>
          </div>
        </div>
      </section>
    </>
  );
}
