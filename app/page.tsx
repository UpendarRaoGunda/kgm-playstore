"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "All" | "Learning" | "Games" | "Village" | "Tools";

type AppEntry = {
  id: string;
  name: string;
  teluguName: string;
  tagline: string;
  description: string;
  category: Exclude<Category, "All">;
  version: string;
  size: string;
  android: string;
  updated: string;
  maker: string;
  age: string;
  permissions: string[];
  icon: string;
  accent: string;
  apkUrl?: string;
  featured?: boolean;
};

const apps: AppEntry[] = [
  {
    id: "math-sprint",
    name: "KGM Math Sprint",
    teluguName: "కేజీఎం మ్యాథ్ స్ప్రింట్",
    tagline: "Quick number challenges made for curious minds.",
    description:
      "A fast, friendly practice game for arithmetic, patterns and mental maths—with short rounds that work well at home or in the classroom.",
    category: "Learning",
    version: "Preview",
    size: "Coming soon",
    android: "Android 8+ planned",
    updated: "In development",
    maker: "KGM Young Coders",
    age: "Ages 8+",
    permissions: ["No account", "No location", "No ads"],
    icon: "π",
    accent: "#ff6b35",
    featured: true,
  },
  {
    id: "mana-ooru",
    name: "Mana Ooru Quiz",
    teluguName: "మన ఊరు క్విజ్",
    tagline: "Discover our village, Telangana and India.",
    description:
      "A local-first quiz about geography, culture, science and community knowledge, designed to turn everyday surroundings into questions worth exploring.",
    category: "Village",
    version: "Preview",
    size: "Coming soon",
    android: "Android 8+ planned",
    updated: "In development",
    maker: "Koratlagudem Learners",
    age: "Everyone",
    permissions: ["Works offline", "No tracking", "No ads"],
    icon: "ఊ",
    accent: "#12a594",
    featured: true,
  },
  {
    id: "kspace-explorer",
    name: "KSpace Explorer",
    teluguName: "కేస్పేస్ ఎక్స్‌ప్లోరర్",
    tagline: "A pocket launchpad for young space explorers.",
    description:
      "Explore planets, space missions and astronomy challenges through playful missions created for children who look up and ask why.",
    category: "Learning",
    version: "Preview",
    size: "Coming soon",
    android: "Android 9+ planned",
    updated: "In development",
    maker: "KGM Space Club",
    age: "Ages 9+",
    permissions: ["No account", "No contacts", "No ads"],
    icon: "↗",
    accent: "#7657ed",
    featured: true,
  },
  {
    id: "telugu-bloom",
    name: "Telugu Word Bloom",
    teluguName: "తెలుగు పద వికాసం",
    tagline: "Build Telugu vocabulary one playful word at a time.",
    description:
      "Picture-led word practice, small spelling challenges and local expressions that help children learn Telugu with confidence.",
    category: "Learning",
    version: "Concept",
    size: "Coming soon",
    android: "Android 8+ planned",
    updated: "Concept stage",
    maker: "KGM Language Club",
    age: "Ages 6+",
    permissions: ["Offline first", "No account", "No ads"],
    icon: "అ",
    accent: "#e34a7a",
  },
  {
    id: "eco-patrol",
    name: "Eco Patrol",
    teluguName: "ఎకో పెట్రోల్",
    tagline: "Tiny missions for a cleaner, greener village.",
    description:
      "Complete practical nature missions, learn about waste and water, and build planet-friendly habits without sharing personal information.",
    category: "Games",
    version: "Concept",
    size: "Coming soon",
    android: "Android 8+ planned",
    updated: "Concept stage",
    maker: "KGM Green Team",
    age: "Ages 7+",
    permissions: ["No camera", "No location", "No ads"],
    icon: "✦",
    accent: "#2c9b55",
  },
  {
    id: "study-buddy",
    name: "Study Buddy",
    teluguName: "స్టడీ బడ్డీ",
    tagline: "A calm homework and revision companion.",
    description:
      "Create simple study sessions, use focus timers and keep revision goals on the device. No sign-in and no cloud profile required.",
    category: "Tools",
    version: "Concept",
    size: "Coming soon",
    android: "Android 8+ planned",
    updated: "Concept stage",
    maker: "KGM Young Coders",
    age: "Ages 10+",
    permissions: ["Local data only", "No account", "No ads"],
    icon: "✓",
    accent: "#2878d1",
  },
];

const categories: Category[] = ["All", "Learning", "Games", "Village", "Tools"];

function Icon({ name, size = 20 }: { name: "search" | "shield" | "download" | "arrow" | "close" | "check" | "menu" | "github" | "spark"; size?: number }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.7 8 7 10 4.3-2 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    menu: <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
    github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 19.3 3 5.4 5.4 0 0 0 19.1 0S17.9-.4 15 1.6a13.4 13.4 0 0 0-7 0C5.1-.4 3.9 0 3.9 0a5.4 5.4 0 0 0-.2 3A5.8 5.8 0 0 0 2.2 7.1c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 8 18v4"/><path d="M8 19c-3 .9-3-1.5-4.2-2"/></>,
    spark: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [selected, setSelected] = useState<AppEntry | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [telugu, setTelugu] = useState(false);

  const filteredApps = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return apps.filter((app) => {
      const matchesCategory = category === "All" || app.category === category;
      const matchesQuery = !needle || [app.name, app.teluguName, app.tagline, app.maker, app.category].some((value) => value.toLowerCase().includes(needle));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Koratlagudem APK Hub home">
          <span className="brand-mark" aria-hidden="true"><span>K</span></span>
          <span><strong>KGM</strong><small>APK HUB</small></span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}><Icon name="menu"/></button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <a href="#apps" onClick={() => setMenuOpen(false)}>Explore apps</a>
          <a href="#safety" onClick={() => setMenuOpen(false)}>Safety</a>
          <a href="#build" onClick={() => setMenuOpen(false)}>Young creators</a>
          <button className="language-button" onClick={() => setTelugu(!telugu)}>{telugu ? "English" : "తెలుగు"}</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot"/> Built in Koratlagudem · Shared with everyone</div>
          <h1>{telugu ? <>మన ఊరి పిల్లలు.<br/><em>మన యాప్స్.</em> ప్రపంచం కోసం.</> : <>Small village.<br/><em>Big ideas.</em> Apps for everyone.</>}</h1>
          <p>{telugu ? "కోరట్లగూడెం యువ సృష్టికర్తలు రూపొందించిన సురక్షితమైన, ఉపయోగకరమైన ఆండ్రాయిడ్ యాప్స్‌కు మన కమ్యూనిటీ హోమ్." : "The community home for safe, useful Android apps imagined and built by the young creators of Koratlagudem."}</p>
          <div className="hero-actions">
            <a className="primary-button" href="#apps">Explore the apps <Icon name="arrow"/></a>
            <a className="text-button" href="#build">I made an app <span>↗</span></a>
          </div>
          <div className="trust-strip">
            <span><Icon name="shield" size={18}/> Mentor-reviewed releases</span>
            <span><Icon name="check" size={18}/> Clear permissions</span>
            <span><Icon name="spark" size={18}/> Made by young creators</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Featured community apps">
          <div className="phone-shell">
            <div className="phone-top"><span>9:41</span><i/></div>
            <div className="phone-greeting"><small>నమస్కారం 👋</small><strong>What will you discover?</strong></div>
            <div className="mini-search"><Icon name="search" size={16}/> Search KGM apps</div>
            <div className="mini-featured">
              <span className="mini-app-icon" style={{background: apps[1].accent}}>{apps[1].icon}</span>
              <div><small>FEATURED</small><strong>{apps[1].name}</strong><p>{apps[1].tagline}</p></div>
            </div>
            <div className="mini-grid">{apps.slice(0,4).map((app) => <div key={app.id}><span style={{background: app.accent}}>{app.icon}</span><small>{app.name}</small></div>)}</div>
            <div className="phone-home"/>
          </div>
          <div className="floating-note note-one"><span>6</span><small>ideas growing</small></div>
          <div className="floating-note note-two"><Icon name="shield"/><small>Safety first</small></div>
        </div>
      </section>

      <section className="story-band">
        <div><span className="story-number">01</span><p><strong>Imagine</strong><br/>A child spots a problem worth solving.</p></div>
        <div><span className="story-number">02</span><p><strong>Build</strong><br/>They turn curiosity into working code.</p></div>
        <div><span className="story-number">03</span><p><strong>Share</strong><br/>A safe release reaches the community.</p></div>
      </section>

      <section className="apps-section" id="apps">
        <div className="section-heading">
          <div><span className="section-kicker">THE COMMUNITY SHELF</span><h2>{telugu ? "కోరట్లగూడెంలో తయారు చేయబడింది" : "Made in Koratlagudem"}</h2><p>Fresh ideas from young builders. Published apps will include a verified APK, version details and a safety note.</p></div>
          <div className="catalog-count"><strong>{apps.length}</strong><span>ideas<br/>growing</span></div>
        </div>

        <div className="catalog-tools">
          <label className="search-box"><Icon name="search"/><span className="sr-only">Search apps</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps, creators or categories…"/></label>
          <div className="category-list" aria-label="Filter by category">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        </div>

        {filteredApps.length ? <div className="app-grid">{filteredApps.map((app, index) => (
          <article className={app.featured ? "app-card featured" : "app-card"} key={app.id}>
            <div className="card-topline"><span>{app.category}</span><small>{String(index + 1).padStart(2, "0")}</small></div>
            <button className="card-main" onClick={() => setSelected(app)} aria-label={`View ${app.name} details`}>
              <span className="app-icon" style={{background: app.accent}}>{app.icon}</span>
              <span className="app-copy"><strong>{app.name}</strong><em>{app.teluguName}</em><p>{app.tagline}</p></span>
            </button>
            <div className="card-meta"><span>{app.age}</span><span>•</span><span>{app.maker}</span></div>
            <div className="card-actions"><button className="details-button" onClick={() => setSelected(app)}>View details <Icon name="arrow" size={17}/></button><span className="status-pill">In the lab</span></div>
          </article>
        ))}</div> : <div className="empty-state"><span>⌕</span><h3>No apps found yet</h3><p>Try a different word or choose “All”. Good ideas sometimes hide in unexpected shelves.</p><button onClick={() => {setQuery(""); setCategory("All");}}>Clear filters</button></div>}
      </section>

      <section className="safety-section" id="safety">
        <div className="safety-copy"><span className="section-kicker light">BEFORE ANY “INSTALL”</span><h2>Trust is a feature.<br/>We build it in.</h2><p>Community software should be easy to understand—not a mystery box. Each published APK must pass a simple, visible review before its download button goes live.</p><a href="https://github.com/UpendarRaoGunda/kgm-playstore" target="_blank" rel="noreferrer">See the open-source project <Icon name="arrow" size={17}/></a></div>
        <div className="safety-grid">
          {[
            ["01", "Malware scan", "Every release file is scanned before publishing."],
            ["02", "Permission check", "Camera, location and storage access must be justified."],
            ["03", "Mentor review", "An adult reviewer checks content and privacy."],
            ["04", "Version history", "Creator, version and update notes stay visible."],
          ].map(([number, title, copy]) => <div className="safety-item" key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}
        </div>
      </section>

      <section className="install-section">
        <div className="install-preview"><div className="download-ring"><Icon name="download" size={34}/><span/></div><small>SAFE SIDELOAD</small><strong>Three clear steps.<br/>No guesswork.</strong></div>
        <div className="install-copy"><span className="section-kicker">HOW INSTALLATION WORKS</span><h2>From our shelf<br/>to your Android.</h2><ol><li><span>1</span><div><strong>Choose a published app</strong><p>Open its details and review the creator, version, permissions and Android requirement.</p></div></li><li><span>2</span><div><strong>Download the verified APK</strong><p>Your phone may ask permission to install from this browser. Allow it only for this installation.</p></div></li><li><span>3</span><div><strong>Install, then switch permission off</strong><p>Open the APK, confirm Install, and disable “unknown apps” access afterward.</p></div></li></ol><div className="android-note"><Icon name="shield"/><p><strong>Android only.</strong> Never install an APK sent through an unknown message. Download from this hub and check the app details first.</p></div></div>
      </section>

      <section className="builder-section" id="build">
        <div className="builder-label">FOR KORATLAGUDEM’S<br/>NEXT GENERATION</div>
        <div className="builder-main"><span className="section-kicker light">YOUNG CREATOR? START HERE.</span><h2>Your first app does not need to be perfect.<br/><em>It needs to be yours.</em></h2><p>Bring a useful idea, a working Android build and what you learned. A mentor can help check privacy, permissions and the release details before it joins the community shelf.</p><div className="builder-actions"><a className="light-button" href="https://github.com/UpendarRaoGunda/kgm-playstore/issues/new?template=app-submission.yml" target="_blank" rel="noreferrer">Submit an app <Icon name="arrow"/></a><a href="https://github.com/UpendarRaoGunda/kgm-playstore" target="_blank" rel="noreferrer"><Icon name="github"/> View the project</a></div></div>
      </section>

      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><span>K</span></span><span><strong>KGM</strong><small>APK HUB</small></span></a><p>Made with curiosity in Koratlagudem, Telangana.<br/><span>మన ఊరు · మన కోడ్ · మన భవిష్యత్తు</span></p><div><a href="#apps">Apps</a><a href="#safety">Safety</a><a href="#build">Submit</a></div></footer>

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="app-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close app details"><Icon name="close"/></button><div className="modal-hero" style={{background: selected.accent}}><span className="modal-icon">{selected.icon}</span><small>{selected.category} · {selected.age}</small></div><div className="modal-body"><span className="status-pill">Preview listing</span><h2 id="modal-title">{selected.name}</h2><em>{selected.teluguName}</em><p>{selected.description}</p><div className="modal-facts"><div><small>VERSION</small><strong>{selected.version}</strong></div><div><small>SIZE</small><strong>{selected.size}</strong></div><div><small>REQUIRES</small><strong>{selected.android}</strong></div></div><h3>Privacy at a glance</h3><div className="permission-list">{selected.permissions.map((permission) => <span key={permission}><Icon name="check" size={15}/>{permission}</span>)}</div><div className="creator-line"><span>Created by</span><strong>{selected.maker}</strong><small>{selected.updated}</small></div>{selected.apkUrl ? <a className="modal-install" href={selected.apkUrl} download><Icon name="download"/> Download APK</a> : <button className="modal-install disabled" disabled>APK coming after safety review</button>}<p className="modal-note">This is a transparent preview listing—not a published APK. The install button activates only after a verified build is added.</p></div></section></div>}
    </main>
  );
}
