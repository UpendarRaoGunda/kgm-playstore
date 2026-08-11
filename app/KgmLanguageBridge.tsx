"use client";

import { useEffect, useRef, useState } from "react";
import { translateKgmUiText, type KgmLanguage } from "./kgm-telugu";
import { translateLegacyKgmUiText } from "./kgm-telugu-legacy";

const LANG_KEY = "kgm-language-v2";
const ORIGINAL_TEXT = new WeakMap<Text, string>();
const LAST_TEXT = new WeakMap<Text, string>();
const ORIGINAL_ATTRS = new WeakMap<Element, Map<string, string>>();
const LAST_ATTRS = new WeakMap<Element, Map<string, string>>();
const ATTRS = ["placeholder", "title", "aria-label"] as const;

const USER_CONTENT_SELECTOR = [
  ".chat-message > p",
  ".kgm-upload-body > h3",
  ".kgm-upload-body > p",
  ".kgm-live-card-body > h3",
  ".kgm-live-card-body > p",
  ".yv-happening-card[class*='yv-kind-'] > strong",
  ".kgm-cinema-hero-copy > h1",
  ".kgm-cinema-hero-copy > p",
  ".kgm-cinema-player-modal header h2",
  ".music-manager-song strong",
  ".music-manager-song small",
].join(",");

function translateUi(value: string) {
  const primary = translateKgmUiText(value);
  return primary !== value ? primary : translateLegacyKgmUiText(value);
}

function shouldSkip(node: Node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  if (!element) return true;
  if (element.closest("script,style,noscript,code,pre,[data-kgm-no-translate]")) return true;
  return Boolean(element.closest(USER_CONTENT_SELECTOR));
}

function keepWhitespace(original: string, translated: string) {
  const lead = original.match(/^\s*/)?.[0] || "";
  const tail = original.match(/\s*$/)?.[0] || "";
  return `${lead}${translated}${tail}`;
}

function translateTextNode(node: Text, lang: KgmLanguage) {
  if (shouldSkip(node)) return;
  const current = node.nodeValue || "";
  if (!current.trim()) return;

  let original = ORIGINAL_TEXT.get(node);
  const last = LAST_TEXT.get(node);
  if (original === undefined || (last !== undefined && current !== last && current !== original)) {
    original = current;
    ORIGINAL_TEXT.set(node, original);
  }

  const core = original.trim();
  const translated = lang === "te" ? translateUi(core) : core;
  const next = keepWhitespace(original, translated);
  if (current !== next) node.nodeValue = next;
  LAST_TEXT.set(node, next);
}

function attrMap(store: WeakMap<Element, Map<string, string>>, element: Element) {
  let map = store.get(element);
  if (!map) {
    map = new Map<string, string>();
    store.set(element, map);
  }
  return map;
}

function translateAttributes(element: Element, lang: KgmLanguage) {
  if (shouldSkip(element)) return;
  const originals = attrMap(ORIGINAL_ATTRS, element);
  const lasts = attrMap(LAST_ATTRS, element);

  ATTRS.forEach((attr) => {
    const current = element.getAttribute(attr);
    if (!current) return;
    const stored = originals.get(attr);
    const last = lasts.get(attr);
    if (stored === undefined || (last !== undefined && current !== last && current !== stored)) originals.set(attr, current);
    const original = originals.get(attr) || current;
    const next = lang === "te" ? translateUi(original) : original;
    if (current !== next) element.setAttribute(attr, next);
    lasts.set(attr, next);
  });
}

function translateTree(root: Node, lang: KgmLanguage) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, lang);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root as Element, lang);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text, lang);
    else translateAttributes(current as Element, lang);
    current = walker.nextNode();
  }
}

function applyDocumentLanguage(lang: KgmLanguage) {
  document.documentElement.lang = lang === "te" ? "te-IN" : "en-IN";
  document.documentElement.dir = "ltr";
  document.documentElement.classList.toggle("kgm-lang-te", lang === "te");

  const html = document.documentElement;
  if (!html.dataset.kgmOriginalTitle) html.dataset.kgmOriginalTitle = document.title;
  document.title = lang === "te" ? "KGM · కొరట్లగూడెం యూత్‌వర్స్" : (html.dataset.kgmOriginalTitle || "KGM · Koratlagudem Youthverse");

  if (document.body) translateTree(document.body, lang);
}

export default function KgmLanguageBridge() {
  const [lang, setLang] = useState<KgmLanguage>("en");
  const scheduled = useRef<number | null>(null);

  useEffect(() => {
    const saved: KgmLanguage = localStorage.getItem(LANG_KEY) === "te" ? "te" : "en";
    setLang(saved);
    applyDocumentLanguage(saved);

    const onToggle = () => setLang((current) => current === "en" ? "te" : "en");
    window.addEventListener("kgm-toggle-language", onToggle);

    const observer = new MutationObserver(() => {
      if (scheduled.current) return;
      scheduled.current = window.requestAnimationFrame(() => {
        scheduled.current = null;
        const current: KgmLanguage = localStorage.getItem(LANG_KEY) === "te" ? "te" : "en";
        applyDocumentLanguage(current);
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => {
      window.removeEventListener("kgm-toggle-language", onToggle);
      observer.disconnect();
      if (scheduled.current) cancelAnimationFrame(scheduled.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    applyDocumentLanguage(lang);
    window.dispatchEvent(new CustomEvent("kgm-language-changed", { detail: { lang } }));
  }, [lang]);

  return null;
}
