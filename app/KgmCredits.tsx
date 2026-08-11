"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LANG_KEY = "kgm-language-v2";
const cofounders = [
  { name: "Devarakonda Chinna", initials: "DC" },
  { name: "Gunda Sandeep", initials: "GS" },
  { name: "Marthi Jashwanth", initials: "MJ" },
];

export default function KgmCredits() {
  const [spotlightHost, setSpotlightHost] = useState<HTMLElement | null>(null);
  const [telugu, setTelugu] = useState(false);
  const text = (en: string, te: string) => telugu ? te : en;

  useEffect(() => {
    const read = () => setTelugu(localStorage.getItem(LANG_KEY) === "te");
    read();
    window.addEventListener("kgm-language-changed", read as EventListener);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("kgm-language-changed", read as EventListener);
      window.removeEventListener("storage", read);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer = 0;

    const mountSpotlight = () => {
      if (cancelled) return;
      const makers = document.querySelector(".kgm-home-makers");
      if (!makers) {
        attempts += 1;
        if (attempts < 160) timer = window.setTimeout(mountSpotlight, 50);
        return;
      }
      let host = document.getElementById("kgm-founder-spotlight-root") as HTMLElement | null;
      if (!host) {
        host = document.createElement("div");
        host.id = "kgm-founder-spotlight-root";
        makers.insertAdjacentElement("afterend", host);
      }
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
    <section className="kgm-founder-spotlight" aria-label={text("KGM origin story", "KGM ఆరంభ కథ")}>
      <div className="kgm-founder-intro">
        <div>
          <span className="kgm-founder-eyebrow">✦ {text("WHERE KGM BEGAN", "KGM ఎక్కడ మొదలైంది")}</span>
          <h2>{text("Built in Koratlagudem. Built together.", "కొరట్లగూడెంలో నిర్మించాం. కలిసి నిర్మించాం.")}</h2>
        </div>
        <p>{text("KGM began with one belief: our village should not only consume technology — we should create it, learn through it and share what we make with the world.", "KGM ఒక నమ్మకంతో మొదలైంది: మన ఊరు టెక్నాలజీని కేవలం ఉపయోగించకూడదు — మనమే సృష్టించాలి, దాని ద్వారా నేర్చుకోవాలి, మన సృష్టిని ప్రపంచంతో పంచుకోవాలి.")}</p>
      </div>

      <div className="kgm-founder-grid">
        {cofounders.map((founder) => (
          <article className="kgm-founder-card" key={founder.name}>
            <div className="kgm-founder-avatar" aria-hidden="true">{founder.initials}</div>
            <div><small>{text("CO-FOUNDER", "సహ వ్యవస్థాపకుడు")}</small><strong>{founder.name}</strong><span>KORATLAGUDEM · KGM</span></div>
          </article>
        ))}
      </div>

      <div className="kgm-founder-manifesto">
        <strong>{text("Local talent deserves a global stage.", "స్థానిక ప్రతిభకు ప్రపంచ వేదిక కావాలి.")}</strong>
        <span className="kgm-founder-arrow">KORATLAGUDEM → WORLD</span>
      </div>
    </section>
  );

  return (
    <>
      {spotlightHost ? createPortal(founderSpotlight, spotlightHost) : null}
      <section className="kgm-credits" aria-label={text("KGM community mission", "KGM కమ్యూనిటీ లక్ష్యం")}>
        <div className="kgm-credits-copy"><span>KGM · KORATLAGUDEM</span><strong>{text("Knowledge. Creation. Community.", "జ్ఞానం. సృష్టి. కమ్యూనిటీ.")}</strong><p>{text("Free to learn. Open to create. Built to share.", "నేర్చుకోవడం ఉచితం. సృష్టించడానికి అందరికీ అవకాశం. పంచుకోవడానికి నిర్మించాం.")}</p></div>
        <div className="kgm-cofounders"><small>{text("OPEN TO EVERYONE", "అందరికీ తెరిచి ఉంది")}</small><div><span>{text("LEARN", "నేర్చుకో")}</span><span>{text("BUILD", "నిర్మించు")}</span><span>{text("SHARE", "పంచుకో")}</span></div></div>
      </section>
    </>
  );
}
