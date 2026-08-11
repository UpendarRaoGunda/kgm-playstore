"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isKgmAvatarUpload } from "./KgmAvatar";

type UploadKind = "image" | "audio" | "video" | "apk";
type UploadItem = {
  id: string;
  title: string;
  description?: string;
  kind: UploadKind;
  created_at: string;
  uploader: { id: string; nickname: string; role: string };
  file_url: string;
  download_url: string;
};
type Account = { id: string; nickname: string; role: string };
type Lang = "en" | "te";

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const LANG_KEY = "kgm-language-v2";
const LAST_VISIT_KEY = "kgm-home-last-visit-v2";

const communityRoles = [
  { glyph: "⌘", label: "BUILD", teLabel: "నిర్మించు", title: "Young makers", teTitle: "యువ మేకర్స్", vibe: "Turn ideas into apps, games and tools.", teVibe: "ఆలోచనలను యాప్స్, గేమ్స్, టూల్స్‌గా మార్చండి." },
  { glyph: "✦", label: "CREATE", teLabel: "సృష్టించు", title: "Village creators", teTitle: "గ్రామ సృష్టికర్తలు", vibe: "Share photos, videos, music and stories.", teVibe: "ఫోటోలు, వీడియోలు, సంగీతం, కథలను పంచుకోండి." },
  { glyph: "◎", label: "EXPLORE", teLabel: "అన్వేషించు", title: "Curious learners", teTitle: "ఆసక్తిగల నేర్చుకునేవారు", vibe: "Watch, question, experiment and learn.", teVibe: "చూడండి, ప్రశ్నించండి, ప్రయోగించండి, నేర్చుకోండి." },
];

function absolute(path: string) {
  return path.startsWith("http") ? path : `${API}${path}`;
}

function timeAgo(value: string, telugu: boolean) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return telugu ? "కొత్తది" : "New";
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (minutes < 1) return telugu ? "ఇప్పుడే" : "now";
  if (minutes < 60) return telugu ? `${minutes}ని` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return telugu ? `${hours}గం` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return telugu ? `${days}రోజు` : `${days}d`;
}

export default function YouthverseExperience() {
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [freshCount, setFreshCount] = useState(0);
  const [lang, setLang] = useState<Lang>("en");

  const telugu = lang === "te";
  const text = (en: string, te: string) => telugu ? te : en;

  useEffect(() => {
    const hero = document.querySelector(".hero");
    if (!hero || document.querySelector("#kgm-youthverse-root")) return;
    const host = document.createElement("div");
    host.id = "kgm-youthverse-root";
    hero.parentElement?.insertBefore(host, hero);
    setPortalHost(host);
    return () => host.remove();
  }, []);

  useEffect(() => {
    const readLanguage = () => setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
    readLanguage();
    window.addEventListener("kgm-language-changed", readLanguage as EventListener);
    window.addEventListener("storage", readLanguage);
    return () => {
      window.removeEventListener("kgm-language-changed", readLanguage as EventListener);
      window.removeEventListener("storage", readLanguage);
    };
  }, []);

  useEffect(() => {
    const previousVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
    fetch(`${API}/api/kgm-uploads?kind=all&limit=16`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { items?: UploadItem[] }) => {
        const next = (data.items || []).filter((item) => !isKgmAvatarUpload(item)).slice(0, 10);
        setUploads(next);
        if (previousVisit > 0) setFreshCount(next.filter((item) => new Date(item.created_at).getTime() > previousVisit).length);
        else setFreshCount(Math.min(next.length, 4));
        localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
      })
      .catch(() => setUploads([]));

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    fetch(`${API}/api/kgm-chat/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((me: Account) => setAccount(me))
      .catch(() => setAccount(null));

    const handleProfile = (event: Event) => {
      const next = (event as CustomEvent<{ id?: string; nickname?: string; role?: string }>).detail;
      if (next?.id && next.nickname && next.role) setAccount({ id: next.id, nickname: next.nickname, role: next.role });
    };
    window.addEventListener("kgm-profile-updated", handleProfile as EventListener);
    return () => window.removeEventListener("kgm-profile-updated", handleProfile as EventListener);
  }, []);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".kgm2-hero");
    if (!hero || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("kgm-hero-in-view", Boolean(entry?.isIntersecting));
    }, { threshold: 0.16 });
    observer.observe(hero);
    return () => {
      observer.disconnect();
      document.body.classList.remove("kgm-hero-in-view");
    };
  }, [portalHost]);

  function clickExisting(selector: string) {
    (document.querySelector(selector) as HTMLElement | null)?.click();
  }

  function openGallery() {
    clickExisting(".kgm-gallery-nav-link");
  }

  function openCinema() {
    window.dispatchEvent(new Event("kgm-open-cinema"));
  }

  function openChat() {
    clickExisting(".kgm-chat-nav-link");
  }

  function openVideo() {
    window.dispatchEvent(new Event("kgm-open-video-chat"));
  }

  function openProfile() {
    if (localStorage.getItem(TOKEN_KEY)) window.dispatchEvent(new Event("kgm-open-profile"));
    else clickExisting(".kgm-account-nav-link");
  }

  function openUpload() {
    openGallery();
    window.setTimeout(() => clickExisting(".kgm-gallery-upload-button"), 90);
  }

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const latest = useMemo(() => uploads.slice(0, 5), [uploads]);
  const greeting = account
    ? freshCount > 0
      ? text(`Yo ${account.nickname} 👋 ${freshCount} fresh drop${freshCount === 1 ? "" : "s"} since you were here.`, `హాయ్ ${account.nickname} 👋 మీరు వచ్చిన తర్వాత ${freshCount} కొత్తవి వచ్చాయి.`)
      : text(`Yo ${account.nickname} 👋 see what Koratlagudem is making today.`, `హాయ్ ${account.nickname} 👋 ఈరోజు కొరట్లగూడెం ఏమి సృష్టిస్తుందో చూడండి.`)
    : text("Apps, films, music and ideas created in Koratlagudem — open to the world.", "కొరట్లగూడెంలో రూపొందిన యాప్స్, సినిమాలు, సంగీతం, ఆలోచనలు — ప్రపంచానికి తెరిచి ఉన్నాయి.");

  const experience = (
    <>
      <main className="kgm-home-v2 yv-shell yv-shell-v2" aria-label={text("KGM Youthverse homepage", "KGM యూత్‌వర్స్ హోమ్‌పేజ్")}>
        <section className="kgm2-hero yv-hero-grid" aria-labelledby="kgm2-home-title">
          <div className="kgm2-hero-copy">
            <span className="kgm2-kicker">KGM° · {text("KORATLAGUDEM'S YOUTH NETWORK", "కొరట్లగూడెం యువత నెట్‌వర్క్")}</span>
            <h1 id="kgm2-home-title">{text("MADE HERE.", "ఇక్కడే సృష్టించాం.")}<br/><em>{text("SHARED EVERYWHERE.", "ప్రపంచంతో పంచుకుంటాం.")}</em></h1>
            <p>{greeting}</p>
            <div className="kgm2-hero-actions">
              <button type="button" className="kgm2-primary" onClick={() => jump("kgm-live-drops")}>{text("Explore today", "ఈరోజు చూడండి")} <span>→</span></button>
              <button type="button" className="kgm2-secondary" onClick={openUpload}>{text("Create +", "సృష్టించండి +")}</button>
            </div>
            <div className="kgm2-hero-proof" aria-label={text("KGM principles", "KGM సూత్రాలు")}>
              <span><i/> <b>{text("Village-born", "మన ఊరిలో పుట్టింది")}</b></span>
              <span>·</span>
              <span><b>{text("Free knowledge", "ఉచిత జ్ఞానం")}</b></span>
              <span>·</span>
              <span><b>{text("Open to all", "అందరికీ తెరిచి ఉంది")}</b></span>
            </div>
          </div>

          <aside className="kgm2-signal" aria-label={text("Koratlagudem to KGM to the world", "కొరట్లగూడెం నుంచి KGM ద్వారా ప్రపంచానికి")}>
            <div className="kgm2-signal-meta"><span><i/>{text("LIVE · KORATLAGUDEM", "లైవ్ · కొరట్లగూడెం")}</span><span>KGM° · YOUTHVERSE</span></div>
            <div className="kgm2-signal-line" aria-hidden="true">
              <b>{text("KORATLAGUDEM", "కొరట్లగూడెం")}</b>
              <em>{text("WORLD", "ప్రపంచం")}</em>
              <i className="kgm2-signal-particle"/><i className="kgm2-signal-particle"/><i className="kgm2-signal-particle"/>
            </div>
            <div className="kgm2-k" aria-label="KGM"><small>KGM°</small><span>KORATLAGUDEM</span></div>
            <div className="kgm2-world" aria-hidden="true">∞</div>
          </aside>
        </section>

        <section className="kgm2-live" id="kgm-live-drops" aria-label={text("Happening now in KGM", "KGMలో ఇప్పుడు జరుగుతున్నవి")}>
          <div className="kgm2-section-head">
            <div><span className="kgm2-eyebrow"><i/>{text("HAPPENING NOW", "ఇప్పుడు జరుగుతున్నవి")}</span><h2>{text("Real drops from the village.", "మన ఊరి నిజమైన సృష్టులు.")}</h2></div>
            <p>{text("Photos, videos, music and builds from KGM creators — the community is the visual identity.", "KGM సృష్టికర్తల ఫోటోలు, వీడియోలు, సంగీతం, నిర్మాణాలు — కమ్యూనిటీనే మన గుర్తింపు.")}</p>
          </div>
          {latest.length ? <div className="kgm2-live-row">
            {latest.map((item) => <button key={item.id} type="button" className={`kgm2-drop ${item.kind}`} onClick={openGallery}>
              <div className="kgm2-drop-media">
                {item.kind === "image" ? <img src={absolute(item.file_url)} alt="" loading="lazy" /> : null}
                {item.kind === "video" ? <video src={`${absolute(item.file_url)}#t=0.35`} preload="metadata" muted playsInline /> : null}
                {item.kind === "audio" ? <div className="kgm2-drop-fallback" aria-hidden="true">♪</div> : null}
                {item.kind === "apk" ? <div className="kgm2-drop-fallback" aria-hidden="true">APK</div> : null}
              </div>
              <div className="kgm2-drop-copy">
                <div className="kgm2-drop-top"><span className="kgm2-drop-kind">{item.kind === "image" ? text("PHOTO", "ఫోటో") : item.kind === "video" ? text("VIDEO", "వీడియో") : item.kind === "audio" ? text("MUSIC", "సంగీతం") : "APK"}</span><span className="kgm2-drop-time">{timeAgo(item.created_at, telugu)}</span></div>
                <strong>{item.title}</strong><p>{text("by", "ద్వారా")} {item.uploader.nickname}</p>
              </div>
            </button>)}
          </div> : <div className="kgm2-live-empty"><div><strong>{text("The next drop starts with you.", "తర్వాతి సృష్టి మీతో మొదలవుతుంది.")}</strong><br/><span>{text("Upload a photo, video, song or APK.", "ఫోటో, వీడియో, పాట లేదా APK అప్‌లోడ్ చేయండి.")}</span></div></div>}
        </section>

        <section className="kgm2-explore" id="kgm-explore" aria-label={text("Explore KGM", "KGMను అన్వేషించండి")}>
          <div className="kgm2-section-head"><div><span className="kgm2-eyebrow"><i/>{text("EXPLORE KGM", "KGM అన్వేషణ")}</span><h2>{text("Pick a rabbit hole.", "మీ ఆసక్తి దారిని ఎంచుకోండి.")}</h2></div><p>{text("Watch, build, listen and share — four ways into the same village culture.", "చూడండి, నిర్మించండి, వినండి, పంచుకోండి — ఒకే గ్రామ సంస్కృతిలోకి నాలుగు మార్గాలు.")}</p></div>
          <div className="kgm2-bento">
            <button type="button" className="kgm2-tile cinema" onClick={openCinema}><span>{text("WATCH · SCIENCE CINEMA", "చూడండి · సైన్స్ సినిమా")}</span><strong>{text("Films that make curiosity bigger.", "ఆసక్తిని మరింత పెద్దదిగా చేసే సినిమాలు.")}</strong><p>{text("Space, physics, biology, Earth and engineering — free inside KGM.", "అంతరిక్షం, భౌతికశాస్త్రం, జీవశాస్త్రం, భూమి, ఇంజినీరింగ్ — KGMలో ఉచితం.")}</p><b>↗</b></button>
            <button type="button" className="kgm2-tile apps" onClick={() => jump("apps")}><span>{text("BUILD · APPS", "నిర్మించండి · యాప్స్")}</span><strong>{text("Ideas become APKs.", "ఆలోచనలు APKలవుతాయి.")}</strong><b>↗</b></button>
            <button type="button" className="kgm2-tile music" onClick={() => jump("music")}><span>{text("LISTEN · MUSIC", "వినండి · సంగీతం")}</span><strong>{text("KGM Folk Radio.", "KGM ఫోక్ రేడియో.")}</strong><b>♪</b></button>
            <button type="button" className="kgm2-tile gallery" onClick={openGallery}><span>{text("SHARE · GALLERY", "పంచుకోండి · గ్యాలరీ")}</span><strong>{text("Village moments deserve a feed.", "మన ఊరి క్షణాలకు ఒక ఫీడ్ కావాలి.")}</strong><p>{text("Real photos, videos, music and creations from the community.", "కమ్యూనిటీ నుంచి నిజమైన ఫోటోలు, వీడియోలు, సంగీతం, సృష్టులు.")}</p><b>↗</b></button>
            <button type="button" className="kgm2-tile create" onClick={openUpload}><span>{text("CREATE · YOUR TURN", "సృష్టించండి · మీ వంతు")}</span><strong>{text("Drop something into KGM.", "KGMలో మీ సృష్టిని పంచండి.")}</strong><b>＋</b></button>
          </div>
        </section>

        <section className="kgm2-community" id="kgm-community-live" aria-label={text("KGM Community Live", "KGM కమ్యూనిటీ లైవ్")}>
          <div className="kgm2-section-head"><div><span className="kgm2-eyebrow"><i/>{text("COMMUNITY · LIVE", "కమ్యూనిటీ · లైవ్")}</span><h2>{text("Talk here. See each other here.", "ఇక్కడ మాట్లాడండి. ఇక్కడే ముఖాముఖి కలవండి.")}</h2></div></div>
          <div className="kgm2-community-panel">
            <div className="kgm2-community-intro"><div><h3>{text("One village. One shared room.", "ఒక ఊరు. ఒకే పంచుకున్న గది.")}</h3><p>{text("Village Chat and Video Room belong together: public community conversation without turning KGM into a phone-number exchange.", "Village Chat, Video Room రెండూ కలిసి ఒకే కమ్యూనిటీ స్థలం — ఫోన్ నంబర్లు పంచుకోవాల్సిన అవసరం లేకుండా.")}</p></div><div className="kgm2-community-stat"><i/>{text("KGM community network online", "KGM కమ్యూనిటీ నెట్‌వర్క్ ఆన్‌లైన్")}</div></div>
            <div className="kgm2-community-actions">
              <button type="button" className="kgm2-community-card" onClick={openChat}><span>💬</span><small>{text("PUBLIC ROOM", "పబ్లిక్ గది")}</small><strong>{text("Village Chat", "గ్రామ చాట్")}</strong><b>→</b></button>
              <button type="button" className="kgm2-community-card video" onClick={openVideo}><span>🎥</span><small>{text("FACE TO FACE", "ముఖాముఖి")}</small><strong>{text("Video Room", "వీడియో గది")}</strong><b>→</b></button>
            </div>
          </div>
        </section>

        <section className="kgm-home-makers" id="kgm-makers" aria-label={text("Young makers and creators", "యువ మేకర్స్ మరియు సృష్టికర్తలు")}>
          <div className="kgm2-section-head"><div><span className="kgm2-eyebrow"><i/>{text("BUILT BY OUR VILLAGE", "మన ఊరు నిర్మించింది")}</span><h2>{text("Everyone can make something.", "ప్రతి ఒక్కరూ ఏదో ఒకటి సృష్టించవచ్చు.")}</h2></div><p>{text("KGM is not a showcase for a few people. It is a place to learn, make and publish.", "KGM కొద్దిమందికి మాత్రమే కాదు. నేర్చుకోవడానికి, సృష్టించడానికి, పంచుకోవడానికి అందరికీ స్థలం.")}</p></div>
          <div className="kgm2-maker-grid">
            {communityRoles.map((role) => <article className="kgm2-maker" key={role.title}><div className="kgm2-maker-mark">{role.glyph}</div><small>{telugu ? role.teLabel : role.label}</small><strong>{telugu ? role.teTitle : role.title}</strong><p>{telugu ? role.teVibe : role.vibe}</p></article>)}
            <button type="button" className="kgm2-maker join" onClick={openProfile}><div className="kgm2-maker-mark">＋</div><small>{text("YOUR TURN", "మీ వంతు")}</small><strong>{account ? text("Style your KGM profile", "మీ KGM ప్రొఫైల్‌ను మార్చండి") : text("Join KGM", "KGMలో చేరండి")}</strong><p>{account ? text("Avatar · nickname · role", "అవతార్ · పేరు · పాత్ర") : text("Sign in · create · share", "సైన్ ఇన్ · సృష్టించు · పంచుకో")}</p></button>
          </div>
        </section>
      </main>

      <nav className="yv-mobile-dock kgm2-dock" aria-label={text("KGM mobile navigation", "KGM మొబైల్ నావిగేషన్")}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span>⌂</span><small>{text("Home", "హోమ్")}</small></button>
        <button onClick={() => jump("kgm-explore")}><span>◉</span><small>{text("Explore", "అన్వేషణ")}</small></button>
        <button className="yv-upload-dock" onClick={openUpload}><span>＋</span><small>{text("Create", "సృష్టి")}</small></button>
        <button onClick={openChat}><span>◌</span><small>{text("Chat", "చాట్")}</small></button>
        <button onClick={openProfile}><span>☺</span><small>{text("Me", "నేను")}</small></button>
      </nav>
    </>
  );

  return portalHost ? createPortal(experience, portalHost) : null;
}
