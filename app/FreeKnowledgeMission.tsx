"use client";

import { useEffect, useState } from "react";

const LANG_KEY = "kgm-language-v2";
type Lang = "en" | "te";

export default function FreeKnowledgeMission() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const read = () => setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
    read();
    window.addEventListener("kgm-language-changed", read as EventListener);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("kgm-language-changed", read as EventListener);
      window.removeEventListener("storage", read);
    };
  }, []);

  const telugu = lang === "te";

  return (
    <section className="kgm-free-mission" aria-label={telugu ? "KGM ఉచిత జ్ఞాన లక్ష్యం" : "KGM free knowledge mission"} data-kgm-no-translate>
      <div className="kgm-free-mission-inner">
        <div className="kgm-free-mission-badge kgm-mission-desktop">
          {telugu ? <>మన ఊరి నుంచి <b aria-hidden="true">→</b> ప్రపంచానికి</> : <>FROM OUR VILLAGE <b aria-hidden="true">→</b> TO THE WORLD</>}
        </div>
        <div className="kgm-free-mission-copy kgm-mission-desktop">
          <strong>{telugu ? "జ్ఞానం అందరికీ ఉచితం." : "Knowledge should be free for everyone."}</strong>
        </div>
        <strong className="kgm-mission-mobile kgm-mission-mobile-one-line">
          {telugu ? "ఉచిత జ్ఞానం · ఊరి నుంచి ప్రపంచానికి" : "FREE KNOWLEDGE · VILLAGE → WORLD"}
        </strong>
        <span className="kgm-free-mission-signal" aria-hidden="true"><i/><i/><i/><b>↗</b></span>
      </div>
    </section>
  );
}
