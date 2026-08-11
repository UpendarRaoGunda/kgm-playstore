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
        <div className="kgm-free-mission-badge">
          <span className="kgm-mission-desktop">{telugu ? <>మన ఊరి నుంచి <b aria-hidden="true">→</b> ప్రపంచానికి</> : <>FROM OUR VILLAGE <b aria-hidden="true">→</b> TO THE WORLD</>}</span>
          <span className="kgm-mission-mobile">{telugu ? <>ఊరు <b aria-hidden="true">→</b> ప్రపంచం</> : <>VILLAGE <b aria-hidden="true">→</b> WORLD</>}</span>
        </div>

        <div className="kgm-free-mission-copy">
          <strong className="kgm-mission-desktop">{telugu ? "జ్ఞానం అందరికీ ఉచితం." : "Knowledge should be free for everyone."}</strong>
          <strong className="kgm-mission-mobile">{telugu ? "అందరికీ ఉచిత జ్ఞానం" : "FREE KNOWLEDGE · FOR EVERYONE"}</strong>
        </div>

        <span className="kgm-free-mission-signal" aria-hidden="true">
          <i /><i /><i /><b>↗</b>
        </span>
      </div>
    </section>
  );
}
