"use client";

import { useEffect, useMemo, useState } from "react";
import { isKgmAvatarUpload } from "./KgmAvatar";
import KgmCatalog from "./KgmCatalog";

type UploadKind = "image" | "audio" | "video" | "apk";
type UploadItem = { id: string; title: string; kind: UploadKind; created_at: string; uploader: { id: string; nickname: string; role: string }; file_url: string; download_url: string };
type Account = { id: string; nickname: string; role: string };
type Lang = "en" | "te";

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const LANG_KEY = "kgm-language-v2";
const LAST_VISIT_KEY = "kgm-home-last-visit-v3";

const MAKER_ROLES = [
  ["⌘", "BUILD", "Young makers", "Turn ideas into apps, games and tools."],
  ["✦", "CREATE", "Village creators", "Share photos, videos, music and stories."],
  ["◎", "EXPLORE", "Curious learners", "Watch, question, experiment and learn."],
] as const;

function absolute(path: string) { return path.startsWith("http") ? path : `${API}${path}`; }
function timeAgo(value: string) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "New";
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function YouthverseExperience() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [freshCount, setFreshCount] = useState(0);
  const [lang, setLang] = useState<Lang>("en");
  const telugu = lang === "te";
  const text = (en: string, te: string) => telugu ? te : en;

  useEffect(() => {
    const readLanguage = () => setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
    readLanguage();
    window.addEventListener("kgm-language-changed", readLanguage as EventListener);
    return () => window.removeEventListener("kgm-language-changed", readLanguage as EventListener);
  }, []);

  useEffect(() => {
    const previousVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
    fetch(`${API}/api/kgm-uploads?kind=all&limit=18`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { items?: UploadItem[] }) => {
        const next = (data.items || []).filter((item) => !isKgmAvatarUpload(item)).slice(0, 12);
        setUploads(next);
        setFreshCount(previousVisit ? next.filter((item) => new Date(item.created_at).getTime() > previousVisit).length : Math.min(next.length, 4));
        localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
      }).catch(() => setUploads([]));

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    fetch(`${API}/api/kgm-chat/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((me: Account) => setAccount(me)).catch(() => undefined);
  }, []);

  function clickExisting(selector: string) { (document.querySelector(selector) as HTMLElement | null)?.click(); }
  function openGallery() { clickExisting(".kgm-gallery-nav-link"); }
  function openUpload() { openGallery(); window.setTimeout(() => clickExisting(".kgm-gallery-upload-button"), 100); }
  function openCinema() { window.dispatchEvent(new Event("kgm-open-cinema")); }
  function openChat() { window.dispatchEvent(new CustomEvent("kgm-open-village-chat")); }
  function openVideo() { window.dispatchEvent(new Event("kgm-open-video-chat")); }
  function openAi() { window.dispatchEvent(new Event("kgm-open-ai-tutor")); }
  function openProfile() { if (localStorage.getItem(TOKEN_KEY)) window.dispatchEvent(new Event("kgm-open-profile")); else clickExisting(".kgm-account-nav-link"); }
  function jump(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  const latest = useMemo(() => uploads.slice(0, 6), [uploads]);
  const greeting = account
    ? freshCount ? text(`Hi ${account.nickname} 👋 ${freshCount} new drop${freshCount === 1 ? "" : "s"} since your last visit.`, `హాయ్ ${account.nickname} 👋 మీరు వచ్చిన తర్వాత ${freshCount} కొత్తవి వచ్చాయి.`)
      : text(`Hi ${account.nickname} 👋 see what Koratlagudem is making today.`, `హాయ్ ${account.nickname} 👋 ఈరోజు కొరట్లగూడెం ఏమి సృష్టిస్తుందో చూడండి.`)
    : text("A free digital space where village children and youth learn, build, create and connect.", "గ్రామ పిల్లలు, యువత నేర్చుకోవడానికి, నిర్మించడానికి, సృష్టించడానికి, కలవడానికి ఉచిత డిజిటల్ స్థలం.");

  return <main className="kgmShellHome" id="kgm-home">
    <section className="kgmHero" aria-labelledby="kgm-home-title">
      <div className="kgmHeroCopy">
        <span className="kgmKicker"><i/> KORATLAGUDEM · OPEN TO THE WORLD</span>
        <h1 id="kgm-home-title">{text("MADE HERE.", "ఇక్కడే సృష్టించాం.")}<br/><em>{text("SHARED EVERYWHERE.", "ప్రపంచంతో పంచుకుంటాం.")}</em></h1>
        <p>{greeting}</p>
        <div className="kgmHeroActions">
          <button type="button" className="primary" onClick={() => jump("kgm-live-drops")}>{text("Explore today", "ఈరోజు చూడండి")} <span>→</span></button>
          <button type="button" className="ai" onClick={openAi}><span>✦</span>{text("Ask KGM AI", "KGM AIని అడగండి")}</button>
          <button type="button" className="create" onClick={openUpload}>{text("Create", "సృష్టించండి")} ＋</button>
        </div>
        <div className="kgmHeroProof"><span>● {text("Village-born", "మన ఊరిలో పుట్టింది")}</span><span>{text("Free knowledge", "ఉచిత జ్ఞానం")}</span><span>{text("English + తెలుగు", "English + తెలుగు")}</span></div>
      </div>
      <aside className="kgmHeroSignal" aria-label="Koratlagudem ideas moving to the world">
        <div className="kgmSignalTop"><span><i/> LIVE · KORATLAGUDEM</span><b>KGM°</b></div>
        <div className="kgmSignalMark">K<span>FROM OUR VILLAGE</span></div>
        <div className="kgmSignalLine"><b>KORATLAGUDEM</b><span/><em>WORLD</em></div>
        <div className="kgmSignalOrbit">∞</div>
      </aside>
    </section>

    <section className="kgmLive" id="kgm-live-drops" aria-labelledby="kgm-live-title">
      <div className="kgmSectionHeading"><div><span className="kgmEyebrow">HAPPENING NOW</span><h2 id="kgm-live-title">The village is the feed.</h2></div><p>Real photos, videos, music and builds from KGM creators — not stock imagery.</p></div>
      {latest.length ? <div className="kgmLiveRail">{latest.map((item) => <button type="button" className={`kgmDrop ${item.kind}`} key={item.id} onClick={openGallery}>
        <div className="kgmDropMedia">{item.kind === "image" ? <img src={absolute(item.file_url)} alt="" loading="lazy" /> : item.kind === "video" ? <video src={`${absolute(item.file_url)}#t=0.3`} preload="metadata" muted playsInline /> : <span>{item.kind === "audio" ? "♪" : "APK"}</span>}</div>
        <div className="kgmDropCopy"><small>{item.kind.toUpperCase()} · {timeAgo(item.created_at)}</small><strong>{item.title}</strong><span>by {item.uploader.nickname}</span></div>
      </button>)}</div> : <button className="kgmLiveEmpty" type="button" onClick={openUpload}><strong>The next drop starts with you.</strong><span>Share a photo, video, song or APK →</span></button>}
    </section>

    <section className="kgmExplore" id="kgm-explore" aria-labelledby="kgm-explore-title">
      <div className="kgmSectionHeading"><div><span className="kgmEyebrow">EXPLORE KGM</span><h2 id="kgm-explore-title">Pick a rabbit hole.</h2></div><p>Five ways into the same village culture: learn, watch, build, listen and share.</p></div>
      <div className="kgmBento">
        <button className="cinema" type="button" onClick={openCinema}><small>WATCH · SCIENCE CINEMA</small><strong>Films that make curiosity bigger.</strong><p>Space, physics, biology, Earth and engineering — free inside KGM.</p><b>↗</b></button>
        <button className="ai" type="button" onClick={openAi}><small>LEARN · KGM AI</small><strong>Ask. Try. Build.</strong><p>Hints instead of spoilers, explanations, quizzes and project help.</p><b>✦</b></button>
        <button className="apps" type="button" onClick={() => jump("apps")}><small>BUILD · APPS</small><strong>Ideas become APKs.</strong><b>↗</b></button>
        <button className="gallery" type="button" onClick={openGallery}><small>SHARE · GALLERY</small><strong>Village moments deserve a feed.</strong><b>↗</b></button>
        <button className="music" type="button" onClick={() => jump("music")}><small>LISTEN · MUSIC</small><strong>KGM folk + community sound.</strong><b>♪</b></button>
      </div>
    </section>

    <section className="kgmCommunity" id="kgm-community-live" aria-labelledby="kgm-community-title">
      <div className="kgmSectionHeading"><div><span className="kgmEyebrow">COMMUNITY</span><h2 id="kgm-community-title">One village. One shared space.</h2></div><p>Conversation, creators and community media belong together — with clear public-room safety.</p></div>
      <div className="kgmCommunityGrid">
        <div className="kgmCommunityStory"><span>PUBLIC · COMMUNITY FIRST</span><h3>Talk here.<br/>Create here.<br/><em>Learn here.</em></h3><p>KGM is built around public community participation without turning the platform into a phone-number exchange.</p><button type="button" onClick={openUpload}>Share something ＋</button></div>
        <div className="kgmCommunityActions">
          <button type="button" onClick={openChat}><span>💬</span><small>PUBLIC ROOM</small><strong>Village Chat</strong><p>Friendly local conversation with reporting and privacy rules.</p><b>→</b></button>
          <button type="button" onClick={openVideo}><span>🎥</span><small>LIVE</small><strong>Video Room</strong><p>See each other without publishing personal contact details.</p><b>→</b></button>
          <button type="button" onClick={openGallery}><span>✦</span><small>CREATORS</small><strong>Community Gallery</strong><p>Photos, videos, music, APKs and stories from KGM.</p><b>→</b></button>
          <button type="button" onClick={openProfile}><span>☺</span><small>YOU</small><strong>Your KGM profile</strong><p>Your creator identity, uploads and community presence.</p><b>→</b></button>
        </div>
      </div>
      <div className="kgmSafetyStrip"><span>🛡</span><div><strong>Share creativity, not private details.</strong><p>Village Chat is public. Avoid phone numbers, addresses, school details and passwords. Report anything uncomfortable.</p></div><a href="/privacy">Safety & privacy →</a></div>
    </section>

    <KgmCatalog />

    <section className="kgmMakers" aria-labelledby="kgm-makers-title">
      <div className="kgmSectionHeading"><div><span className="kgmEyebrow">THE PEOPLE BEHIND KGM</span><h2 id="kgm-makers-title">A village can be a technology lab.</h2></div><p>KGM gives young people a place to move from consuming technology to making things with it.</p></div>
      <div className="kgmMakerGrid">{MAKER_ROLES.map(([icon, label, title, copy]) => <article key={label}><span>{icon}</span><small>{label}</small><strong>{title}</strong><p>{copy}</p></article>)}<button type="button" onClick={openUpload}><span>＋</span><small>YOUR TURN</small><strong>Make the next thing.</strong><p>Start small. Share what you learn.</p></button></div>
    </section>

    <section className="kgmMission"><span>KGM° · KORATLAGUDEM</span><h2>Free knowledge should not depend on a postcode.</h2><p>Learn something. Build something. Share something. Help someone else start.</p><div><button type="button" onClick={openAi}>Ask KGM AI ✦</button><button type="button" onClick={openUpload}>Create something ＋</button></div></section>

    <nav className="kgmMobileDock" aria-label="KGM mobile navigation">
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span>⌂</span><b>Home</b></button>
      <button type="button" onClick={() => jump("kgm-explore")}><span>◎</span><b>Explore</b></button>
      <button type="button" className="ai" onClick={openAi}><span>✦</span><b>KGM AI</b></button>
      <button type="button" onClick={() => jump("kgm-community-live")}><span>◌</span><b>Community</b></button>
      <button type="button" onClick={openProfile}><span>☺</span><b>You</b></button>
    </nav>
  </main>;
}
