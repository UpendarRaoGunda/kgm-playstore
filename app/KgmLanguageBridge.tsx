"use client";

import { useEffect, useRef, useState } from "react";

const LANG_KEY = "kgm-language-v2";
type Dict = Record<string, string>;

const te: Dict = {
  "Discover": "అన్వేషించండి",
  "Apps": "యాప్స్",
  "Music": "సంగీతం",
  "Cinema": "సినిమా",
  "Gallery": "గ్యాలరీ",
  "Chat": "చాట్",
  "Science Cinema": "సైన్స్ సినిమా",
  "Village Chat": "గ్రామ చాట్",
  "Install Android": "ఆండ్రాయిడ్‌లో ఇన్‌స్టాల్",
  "Safety": "భద్రత",
  "Young creators": "యువ సృష్టికర్తలు",
  "Sign in / Register": "సైన్ ఇన్ / నమోదు",
  "Watch Science Cinema": "సైన్స్ సినిమా చూడండి",
  "＋ Drop something": "＋ మీ సృష్టిని పంచుకోండి",
  "KGM° · KORATLAGUDEM'S DIGITAL PLAYGROUND": "KGM° · కొరట్లగూడెం డిజిటల్ ఆటస్థలం",
  "🔥 TRENDING IN KGM": "🔥 KGMలో కొత్తవి",
  "Fresh drops from the village.": "మన గ్రామం నుంచి కొత్త సృష్టులు.",
  "See all ↗": "అన్నీ చూడండి ↗",
  "FOR YOU": "మీ కోసం",
  "One feed. Every kind of creativity and curiosity.": "ఒకే చోట సృజనాత్మకత, జిజ్ఞాస అన్నీ.",
  "CREATORS OF KGM": "KGM సృష్టికర్తలు",
  "People are the platform.": "మనుషులే మన వేదిక.",
  "KGM SCIENCE CINEMA": "KGM సైన్స్ సినిమా",
  "STEM ONLY · FREE KNOWLEDGE": "STEM మాత్రమే · ఉచిత జ్ఞానం",
  "Space": "అంతరిక్షం",
  "Physics": "భౌతిక శాస్త్రం",
  "Life": "జీవశాస్త్రం",
  "All": "అన్నీ",
  "Biology": "జీవశాస్త్రం",
  "Earth": "భూమి",
  "Engineering": "ఇంజినీరింగ్",
  "Kids Science": "పిల్లల సైన్స్",
  "Mathematics": "గణితం",
  "Medicine": "వైద్యం",
  "Scientists": "శాస్త్రవేత్తలు",
  "Technology": "సాంకేతికత",
  "Telugu Science": "తెలుగు సైన్స్",
  "STEM LIBRARY": "STEM గ్రంథాలయం",
  "CONTINUE WATCHING": "చూడటం కొనసాగించండి",
  "Pick up where you left off.": "మీరు ఆపిన చోట నుంచే కొనసాగించండి.",
  "🛡 STEM-only curation": "🛡 STEM మాత్రమే ఎంపిక",
  "WATCH → NOTICE → EXPLAIN": "చూడండి → గమనించండి → వివరించండి",
  "Science inside this film": "ఈ చిత్రంలోని సైన్స్",
  "After watching, can you explain…": "చూసిన తర్వాత మీరు వివరించగలరా…",
  "▶ Watch inside KGM": "▶ KGMలో చూడండి",
  "＋ My List": "＋ నా జాబితా",
  "✓ In My List": "✓ నా జాబితాలో ఉంది",
  "KGM · OPEN KNOWLEDGE": "KGM · అందరికీ జ్ఞానం",
  "Knowledge should be free for everyone.": "జ్ఞానం అందరికీ ఉచితంగా ఉండాలి.",
};

const selectors = [
  ".kgm-youth-nav button",
  ".kgm-youth-mobile-menu button",
  ".yv-kicker",
  ".yv-actions button",
  ".yv-section-head span",
  ".yv-section-head h2",
  ".yv-section-head button",
  ".kgm-cinema-brand strong",
  ".kgm-cinema-brand small",
  ".kgm-cinema-topbar nav button",
  ".kgm-cinema-categories button",
  ".kgm-cinema-section-head span",
  ".kgm-cinema-section-head h2",
  ".kgm-cinema-hero-actions button",
  ".kgm-cinema-learning-kicker",
  ".kgm-cinema-learning-panel h3",
  ".kgm-cinema-learning-panel h4",
  ".kgm-free-mission-badge",
  ".kgm-free-mission-copy strong",
].join(",");

function setText(node: HTMLElement, value: string) {
  if (node.textContent !== value) node.textContent = value;
}

function translateElement(el: Element, lang: "en" | "te") {
  const node = el as HTMLElement;
  if (!node.dataset.kgmOriginalText) node.dataset.kgmOriginalText = node.textContent?.trim() || "";
  const original = node.dataset.kgmOriginalText || "";
  if (!original) return;
  if (lang === "te") {
    const exact = te[original];
    if (exact) setText(node, exact);
  } else {
    setText(node, original);
  }
}

function applyLanguage(lang: "en" | "te") {
  document.documentElement.lang = lang === "te" ? "te-IN" : "en-IN";
  document.documentElement.classList.toggle("kgm-lang-te", lang === "te");
  document.querySelectorAll(selectors).forEach((el) => translateElement(el, lang));

  const hero = document.querySelector(".yv-hero-copy h1") as HTMLElement | null;
  if (hero) {
    if (!hero.dataset.kgmOriginalHtml) hero.dataset.kgmOriginalHtml = hero.innerHTML;
    const value = lang === "te"
      ? '<span>ఇక్కడే సృష్టించాం.</span><br/><em>ప్రపంచంతో పంచుకుంటాం.</em>'
      : hero.dataset.kgmOriginalHtml;
    if (hero.innerHTML !== value) hero.innerHTML = value;
  }

  const heroP = document.querySelector(".yv-hero-copy > p") as HTMLElement | null;
  if (heroP) {
    if (!heroP.dataset.kgmOriginalText) heroP.dataset.kgmOriginalText = heroP.textContent?.trim() || "";
    const original = heroP.dataset.kgmOriginalText || "";
    let value = original;
    if (lang === "te") {
      if (original.startsWith("Yo ")) {
        const name = original.replace(/^Yo\s+/, "").split("👋")[0].trim();
        value = `హాయ్ ${name} 👋 ఈ రోజు మనం ఏమి సృష్టించాలి లేదా నేర్చుకోవాలి?`;
      } else {
        value = "యాప్స్, సైన్స్ సినిమా, సంగీతం, ఫోటోలు, వీడియోలు, ఆలోచనలు — చిన్న గ్రామం నుంచి పెద్ద ప్రపంచానికి.";
      }
    }
    setText(heroP, value);
  }
}

export default function KgmLanguageBridge() {
  const [lang, setLang] = useState<"en" | "te">("en");
  const scheduled = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) === "te" ? "te" : "en";
    setLang(saved);
    applyLanguage(saved);

    const onToggle = () => setLang((current) => current === "en" ? "te" : "en");
    window.addEventListener("kgm-toggle-language", onToggle);

    const observer = new MutationObserver(() => {
      if (scheduled.current) return;
      scheduled.current = window.requestAnimationFrame(() => {
        scheduled.current = null;
        applyLanguage(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("kgm-toggle-language", onToggle);
      observer.disconnect();
      if (scheduled.current) cancelAnimationFrame(scheduled.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage(lang);
    window.dispatchEvent(new CustomEvent("kgm-language-changed", { detail: { lang } }));
  }, [lang]);

  return null;
}
