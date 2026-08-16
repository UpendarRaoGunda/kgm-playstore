"use client";

import { useEffect, useState } from "react";

const LANG_KEY = "kgm-language-v2";
const cofounders = [
  { name: "Devarakonda Chinna", initials: "DC" },
  { name: "Gunda Sandeep", initials: "GS" },
  { name: "Marthi Jashwanth", initials: "MJ" },
];

export default function KgmCredits() {
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

  return (
    <section className="kgmCreditsV3" aria-label={text("KGM co-founders and origin story", "KGM సహ వ్యవస్థాపకులు మరియు ఆరంభ కథ")}>
      <div className="kgmFounderPanel">
        <div className="kgmFounderHead">
          <div>
            <span>✦ {text("WHERE KGM BEGAN", "KGM ఎక్కడ మొదలైంది")}</span>
            <h2>{text("Built in Koratlagudem. Built together.", "కొరట్లగూడెంలో నిర్మించాం. కలిసి నిర్మించాం.")}</h2>
          </div>
          <p>{text("KGM began with one belief: our village should not only consume technology — we should create it, learn through it and share what we make with the world.", "KGM ఒక నమ్మకంతో మొదలైంది: మన ఊరు టెక్నాలజీని కేవలం ఉపయోగించకూడదు — మనమే సృష్టించాలి, దాని ద్వారా నేర్చుకోవాలి, మన సృష్టిని ప్రపంచంతో పంచుకోవాలి.")}</p>
        </div>

        <div className="kgmFounderGridV3">
          {cofounders.map((founder) => (
            <article className="kgmFounderCardV3" key={founder.name}>
              <div className="kgmFounderAvatarV3" aria-hidden="true">{founder.initials}</div>
              <div>
                <small>{text("CO-FOUNDER", "సహ వ్యవస్థాపకుడు")}</small>
                <strong>{founder.name}</strong>
                <span>KORATLAGUDEM · KGM</span>
              </div>
            </article>
          ))}
        </div>

        <div className="kgmFounderManifestoV3">
          <strong>{text("Local talent deserves a global stage.", "స్థానిక ప్రతిభకు ప్రపంచ వేదిక కావాలి.")}</strong>
          <span>KORATLAGUDEM → WORLD</span>
        </div>
      </div>

      <div className="kgmCreditsFooterV3">
        <div><strong>{text("Knowledge. Creation. Community.", "జ్ఞానం. సృష్టి. కమ్యూనిటీ.")}</strong> · {text("Free to learn. Open to create. Built to share.", "నేర్చుకోవడం ఉచితం. సృష్టించడానికి అందరికీ అవకాశం. పంచుకోవడానికి నిర్మించాం.")}</div>
        <div><a href="/privacy">{text("Privacy", "గోప్యత")}</a> · <a href="/privacy#safety">{text("Youth safety", "యువ భద్రత")}</a></div>
      </div>
    </section>
  );
}
