"use client";

import { useEffect } from "react";

type CoverMeta = {
  icon: string;
  accent: string;
  sourceLabel: string;
  sourceUrl?: string;
};

const COVER_META: Record<string, CoverMeta> = {
  "WALL-E": { icon: "🤖", accent: "#D6A72A", sourceLabel: "Poster image via TMDB · rights remain with Disney/Pixar and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/10681-wall-e" },
  "The Wild Robot": { icon: "🤖", accent: "#61A789", sourceLabel: "Poster image via TMDB · rights remain with DreamWorks/Universal and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/1184918-the-wild-robot" },
  "Hoppers": { icon: "🦫", accent: "#62A857", sourceLabel: "KGM learning thumbnail · film artwork/title rights remain with Disney/Pixar", sourceUrl: "https://www.pixar.com/hoppers/" },
  "Hidden Figures": { icon: "🧮", accent: "#D1914B", sourceLabel: "Poster image via TMDB · rights remain with the film's respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/381284-hidden-figures" },
  "The Boy Who Harnessed the Wind": { icon: "🌬️", accent: "#B78B55", sourceLabel: "KGM learning thumbnail · film/title rights remain with Netflix and respective rights holders", sourceUrl: "https://www.netflix.com/title/80200047" },
  "October Sky": { icon: "🚀", accent: "#9272D8", sourceLabel: "Poster image via TMDB · rights remain with Universal and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/13466-october-sky" },
  "Jurassic Park": { icon: "🦖", accent: "#B5483F", sourceLabel: "Poster image via TMDB · rights remain with Universal/Amblin and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/329-jurassic-park" },
  "Apollo 13": { icon: "🛰️", accent: "#4B79A8", sourceLabel: "Poster image via TMDB · rights remain with Universal and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/568-apollo-13" },
  "Big Hero 6": { icon: "🩺", accent: "#D65353", sourceLabel: "Poster image via TMDB · rights remain with Disney and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/177572-big-hero-6" },
  "Dolphin Tale": { icon: "🐬", accent: "#2E9EC4", sourceLabel: "KGM learning thumbnail · film/title rights remain with Warner Bros. and respective rights holders", sourceUrl: "https://www.imdb.com/title/tt1564349/" },
  "Queen of Katwe": { icon: "♟️", accent: "#D0783F", sourceLabel: "KGM learning thumbnail · film/title rights remain with Disney and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/317557-queen-of-katwe" },
  "Interstellar": { icon: "🕳️", accent: "#557E9A", sourceLabel: "Poster image via TMDB · rights remain with Paramount/Warner Bros. and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/157336-interstellar" },
  "The Martian": { icon: "🪐", accent: "#C0633A", sourceLabel: "Poster image via TMDB · rights remain with 20th Century Studios and respective rights holders", sourceUrl: "https://www.themoviedb.org/movie/286217-the-martian" },
  "Science Fair": { icon: "🔬", accent: "#5E65C4", sourceLabel: "KGM learning thumbnail · film/title rights remain with National Geographic and respective rights holders", sourceUrl: "https://films.nationalgeographic.com/science-fair" },
  "The Biggest Little Farm": { icon: "🌱", accent: "#6D9D55", sourceLabel: "KGM learning thumbnail · film/title rights remain with the film's respective rights holders", sourceUrl: "https://www.imdb.com/title/tt8969332/" },
};

const GENERATED_COVER_TITLES = new Set([
  "Hoppers",
  "The Boy Who Harnessed the Wind",
  "Dolphin Tale",
  "Queen of Katwe",
  "Science Fair",
  "The Biggest Little Farm",
]);

function escapeXml(value: string) {
  return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] || char));
}

function splitTitle(title: string, max = 18) {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function generatedCover(title: string, icon: string, accent: string) {
  const lines = splitTitle(title);
  const titleSvg = lines.map((line, index) => `<text x="50%" y="${58 + index * 9}%" text-anchor="middle" fill="white" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="800">${escapeXml(line)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1125" viewBox="0 0 750 1125"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#090B13"/><stop offset="1" stop-color="${accent}"/></linearGradient><radialGradient id="r"><stop stop-color="white" stop-opacity=".18"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="750" height="1125" rx="36" fill="url(#g)"/><circle cx="600" cy="160" r="250" fill="url(#r)"/><text x="50%" y="32%" text-anchor="middle" font-size="150">${icon}</text><text x="50%" y="45%" text-anchor="middle" fill="${accent}" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="800" letter-spacing="5">KGM SCIENCE CINEMA</text>${titleSvg}<text x="50%" y="90%" text-anchor="middle" fill="white" fill-opacity=".72" font-family="Arial,Helvetica,sans-serif" font-size="20" letter-spacing="3">LEARNING COVER · WATCH LEGALLY</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function enhance() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".kgm-legal-movies-card"));
  for (const card of cards) {
    const title = card.querySelector<HTMLElement>(".kgm-legal-movies-card-copy > strong")?.textContent?.trim();
    if (!title) continue;
    const meta = COVER_META[title];
    if (!meta) continue;

    const poster = card.querySelector<HTMLElement>(".kgm-legal-movies-poster");
    if (poster && GENERATED_COVER_TITLES.has(title) && !poster.querySelector("img")) {
      const img = document.createElement("img");
      img.src = generatedCover(title, meta.icon, meta.accent);
      img.alt = `Learning cover for ${title}`;
      img.loading = "lazy";
      img.dataset.kgmGeneratedCover = "true";
      poster.appendChild(img);
    }

    const copy = card.querySelector<HTMLElement>(".kgm-legal-movies-card-copy");
    if (copy && !copy.querySelector(".kgm-cinema-poster-source")) {
      const source = document.createElement("span");
      source.className = "kgm-cinema-poster-source";
      source.textContent = `ⓘ ${meta.sourceLabel}`;
      copy.appendChild(source);
    }
  }

  const modal = document.querySelector<HTMLElement>(".kgm-legal-movies-modal");
  const modalTitle = modal?.querySelector<HTMLElement>(".kgm-legal-movies-modal-copy h3")?.textContent?.trim();
  if (modal && modalTitle) {
    const meta = COVER_META[modalTitle];
    const poster = modal.querySelector<HTMLElement>(".kgm-legal-movies-modal-poster");
    if (meta && poster && GENERATED_COVER_TITLES.has(modalTitle) && !poster.querySelector("img")) {
      const img = document.createElement("img");
      img.src = generatedCover(modalTitle, meta.icon, meta.accent);
      img.alt = `Learning cover for ${modalTitle}`;
      img.dataset.kgmGeneratedCover = "true";
      poster.appendChild(img);
    }
    const copy = modal.querySelector<HTMLElement>(".kgm-legal-movies-modal-copy");
    if (meta && copy && !copy.querySelector(".kgm-cinema-modal-source")) {
      const source = document.createElement(meta.sourceUrl ? "a" : "p");
      source.className = "kgm-cinema-modal-source";
      source.textContent = `Artwork/source note: ${meta.sourceLabel}${meta.sourceUrl ? " ↗" : ""}`;
      if (source instanceof HTMLAnchorElement && meta.sourceUrl) {
        source.href = meta.sourceUrl;
        source.target = "_blank";
        source.rel = "noreferrer";
      }
      copy.appendChild(source);
    }
  }
}

export default function CinemaPosterSourceEnhancer() {
  useEffect(() => {
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <style>{`
    .kgm-cinema-poster-source{display:block;margin-top:.72rem;font-size:.68rem;line-height:1.35;color:rgba(255,255,255,.5)}
    .kgm-cinema-modal-source{display:block;margin-top:.85rem;font-size:.76rem;line-height:1.45;color:rgba(255,255,255,.62);text-decoration:none}
    .kgm-cinema-modal-source:hover{color:#fff}
    .kgm-legal-movies-poster img[data-kgm-generated-cover=true],.kgm-legal-movies-modal-poster img[data-kgm-generated-cover=true]{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
    .kgm-legal-movies-poster .kgm-legal-movies-label,.kgm-legal-movies-poster .kgm-legal-movies-tap{z-index:2}
  `}</style>;
}
