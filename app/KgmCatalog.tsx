"use client";

import { useMemo, useState } from "react";

type Status = "Ready" | "Beta" | "Idea";
type Category = "All" | "Learning" | "Games" | "Village" | "Tools";
type AppItem = {
  id: string;
  name: string;
  telugu: string;
  tagline: string;
  category: Exclude<Category, "All">;
  status: Status;
  maker: string;
  age: string;
  size: string;
  icon: string;
  accent: string;
  href?: string;
};

const APPS: AppItem[] = [
  { id: "kgm-youthverse", name: "KGM Youthverse", telugu: "కేజీఎం యూత్‌వర్స్", tagline: "Learn, build, create and connect from Koratlagudem.", category: "Village", status: "Ready", maker: "KGM Community", age: "Everyone", size: "Android + PWA", icon: "K", accent: "#7657ed", href: "/downloads/kgm-playstore-latest.apk" },
  { id: "math-sprint", name: "KGM Math Sprint", telugu: "కేజీఎం మ్యాథ్ స్ప్రింట్", tagline: "Fast number challenges for curious minds.", category: "Learning", status: "Beta", maker: "KGM Young Coders", age: "8+", size: "Preview", icon: "π", accent: "#d8ff3e" },
  { id: "mana-ooru", name: "Mana Ooru Quiz", telugu: "మన ఊరు క్విజ్", tagline: "Discover our village, Telangana and India.", category: "Village", status: "Beta", maker: "Koratlagudem Learners", age: "Everyone", size: "Preview", icon: "ఊ", accent: "#49d9ff" },
  { id: "kspace", name: "KSpace Explorer", telugu: "కేస్పేస్ ఎక్స్‌ప్లోరర్", tagline: "A pocket launchpad for young space explorers.", category: "Learning", status: "Beta", maker: "KGM Space Club", age: "9+", size: "Preview", icon: "↗", accent: "#9f7cff" },
  { id: "telugu-bloom", name: "Telugu Word Bloom", telugu: "తెలుగు పద వికాసం", tagline: "Build Telugu vocabulary one playful word at a time.", category: "Learning", status: "Idea", maker: "KGM Language Club", age: "6+", size: "Concept", icon: "అ", accent: "#ff5ecf" },
  { id: "eco-patrol", name: "Eco Patrol", telugu: "ఎకో పెట్రోల్", tagline: "Tiny missions for a cleaner, greener village.", category: "Games", status: "Idea", maker: "KGM Green Team", age: "7+", size: "Concept", icon: "✦", accent: "#70e7a7" },
  { id: "study-buddy", name: "Study Buddy", telugu: "స్టడీ బడ్డీ", tagline: "A calm homework and revision companion.", category: "Tools", status: "Idea", maker: "KGM Young Coders", age: "10+", size: "Concept", icon: "✓", accent: "#5fb4ff" },
];

const CATEGORIES: Category[] = ["All", "Learning", "Games", "Village", "Tools"];
const STATUS_COPY: Record<Status, string> = {
  Ready: "Ready to install",
  Beta: "Testing now",
  Idea: "Being imagined",
};

export default function KgmCatalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [status, setStatus] = useState<Status | "All">("All");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return APPS.filter((app) => {
      if (category !== "All" && app.category !== category) return false;
      if (status !== "All" && app.status !== status) return false;
      if (!needle) return true;
      return [app.name, app.telugu, app.tagline, app.maker, app.category].some((value) => value.toLowerCase().includes(needle));
    });
  }, [category, query, status]);

  return (
    <section className="kgmCatalog" id="apps" aria-labelledby="kgm-apps-title">
      <div className="kgmSectionHeading">
        <div>
          <span className="kgmEyebrow">BUILD · APPS</span>
          <h2 id="kgm-apps-title">Made by us.<br/><em>Ready when it is ready.</em></h2>
        </div>
        <p>KGM clearly separates apps you can install today from experiments still being tested and ideas still being built.</p>
      </div>

      <div className="kgmCatalogControls">
        <label className="kgmSearch">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps, makers or ideas" aria-label="Search KGM apps" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button> : null}
        </label>
        <div className="kgmFilterRail" aria-label="App categories">
          {CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div className="kgmStatusRail" aria-label="App status">
          {(["All", "Ready", "Beta", "Idea"] as const).map((item) => <button type="button" key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item === "All" ? "All stages" : STATUS_COPY[item]}</button>)}
        </div>
      </div>

      <div className="kgmAppGrid">
        {filtered.map((app) => {
          const body = <>
            <div className="kgmAppTop"><span className={`kgmStage ${app.status.toLowerCase()}`}>{STATUS_COPY[app.status]}</span><small>{app.category}</small></div>
            <div className="kgmAppMain">
              <span className="kgmAppIcon" style={{ background: app.accent }}>{app.icon}</span>
              <div><strong>{app.name}</strong><em>{app.telugu}</em><p>{app.tagline}</p></div>
            </div>
            <div className="kgmAppMeta"><span>{app.maker}</span><span>{app.age}</span><span>{app.size}</span></div>
            <div className="kgmAppAction"><b>{app.href ? "Install Android" : app.status === "Beta" ? "Preview" : "Follow build"}</b><span>→</span></div>
          </>;
          return app.href ? <a className="kgmAppCard" key={app.id} href={app.href}>{body}</a> : <article className="kgmAppCard" key={app.id}>{body}</article>;
        })}
      </div>
      {!filtered.length ? <div className="kgmEmptyState"><strong>No apps match that filter.</strong><button type="button" onClick={() => { setQuery(""); setCategory("All"); setStatus("All"); }}>Show everything</button></div> : null}
    </section>
  );
}
