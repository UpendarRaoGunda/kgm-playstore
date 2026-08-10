"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type WatchOption = {
  provider: "JioHotstar" | "Netflix" | "Prime Video" | "Apple TV" | "ZEE5" | "National Geographic";
  mode: string;
  url?: string;
};

type LegalScienceMovie = {
  title: string;
  year: string;
  rating: string;
  hook: string;
  concepts: string;
  art: string;
  poster?: string;
  availability: string;
  watchUrl: string;
  options: WatchOption[];
};

const movies: LegalScienceMovie[] = [
  {
    title: "WALL-E",
    year: "2008",
    rating: "U",
    hook: "A small cleanup robot turns waste, ecology, automation and humanity's future into a story children can feel.",
    concepts: "ROBOTICS · ECOLOGY · SUSTAINABILITY",
    art: "🤖",
    poster: "https://image.tmdb.org/t/p/w500/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg",
    availability: "India: streaming on JioHotstar",
    watchUrl: "https://www.justwatch.com/in/movie/wall-e",
    options: [{ provider: "JioHotstar", mode: "Stream" }],
  },
  {
    title: "The Wild Robot",
    year: "2024",
    rating: "U",
    hook: "An intelligent robot learns survival, parenting and adaptation by living inside an animal ecosystem.",
    concepts: "AI · ANIMAL BIOLOGY · ADAPTATION",
    art: "🦦",
    poster: "https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg",
    availability: "India: Netflix · JioHotstar · VI Movies & TV; rentals also reported",
    watchUrl: "https://www.justwatch.com/in/movie/the-wild-robot",
    options: [
      { provider: "Netflix", mode: "Stream" },
      { provider: "JioHotstar", mode: "Stream" },
      { provider: "Prime Video", mode: "Rent" },
      { provider: "Apple TV", mode: "Rent / buy" },
      { provider: "ZEE5", mode: "Rent" },
    ],
  },
  {
    title: "Hoppers",
    year: "2026",
    rating: "UA7+",
    hook: "Technology lets a human mind inhabit a robotic animal body, opening questions about behavior, habitats and conservation.",
    concepts: "TECHNOLOGY · ANIMAL BIOLOGY · CONSERVATION",
    art: "🦫",
    availability: "India: streaming on JioHotstar",
    watchUrl: "https://www.justwatch.com/in/movie/hoppers",
    options: [{ provider: "JioHotstar", mode: "Stream" }],
  },
  {
    title: "Hidden Figures",
    year: "2016",
    rating: "UA",
    hook: "The mathematicians and programmers whose calculations helped NASA reach orbit.",
    concepts: "MATHEMATICS · NASA · COMPUTING",
    art: "🧮",
    poster: "https://image.tmdb.org/t/p/w500/9lfz2W2uGjyow3am00rsPJ8iOyq.jpg",
    availability: "India: JioHotstar · VI Movies & TV",
    watchUrl: "https://www.justwatch.com/in/movie/hidden-figures",
    options: [{ provider: "JioHotstar", mode: "Stream" }],
  },
  {
    title: "The Boy Who Harnessed the Wind",
    year: "2019",
    rating: "UA13+",
    hook: "A teenager uses books, scrap materials and engineering to build a wind turbine when his community needs it most.",
    concepts: "ENGINEERING · ENERGY · PROBLEM-SOLVING",
    art: "🌬️",
    availability: "India: streaming on Netflix",
    watchUrl: "https://www.justwatch.com/in/movie/the-boy-who-harnessed-the-wind",
    options: [{ provider: "Netflix", mode: "Stream" }],
  },
  {
    title: "October Sky",
    year: "1999",
    rating: "U",
    hook: "A teenager sees Sputnik, starts building rockets and learns that experimentation means failure, measurement and iteration.",
    concepts: "ROCKETS · PHYSICS · EXPERIMENTATION",
    art: "🚀",
    poster: "https://image.tmdb.org/t/p/w500/9tCU0Dplt26sgiChlOS01DlIMTA.jpg",
    availability: "India: JioHotstar; Amazon Video rental also reported",
    watchUrl: "https://www.justwatch.com/in/movie/october-sky",
    options: [
      { provider: "JioHotstar", mode: "Stream" },
      { provider: "Prime Video", mode: "Rent" },
    ],
  },
  {
    title: "Jurassic Park",
    year: "1993",
    rating: "UA",
    hook: "A spectacular doorway into DNA, genetic engineering, evolution, ecosystems and the limits of technological control.",
    concepts: "GENETICS · EVOLUTION · BIOETHICS",
    art: "🧬",
    poster: "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg",
    availability: "India: Netflix · Prime Video · JioHotstar; rentals also reported",
    watchUrl: "https://www.justwatch.com/in/movie/jurassic-park",
    options: [
      { provider: "Netflix", mode: "Stream" },
      { provider: "Prime Video", mode: "Stream / rent" },
      { provider: "JioHotstar", mode: "Stream" },
      { provider: "Apple TV", mode: "Rent / buy" },
      { provider: "ZEE5", mode: "Rent" },
    ],
  },
  {
    title: "Apollo 13",
    year: "1995",
    rating: "U",
    hook: "A real spacecraft crisis becomes a masterclass in systems engineering, teamwork, constraints and decisions under pressure.",
    concepts: "SPACEFLIGHT · ENGINEERING · SYSTEMS THINKING",
    art: "🛰️",
    poster: "https://image.tmdb.org/t/p/w500/oYUZHYMwNKnE1ef4WE5Hw2a9OAY.jpg",
    availability: "India: JioHotstar · VI Movies & TV; rentals also reported",
    watchUrl: "https://www.justwatch.com/in/movie/apollo-13",
    options: [
      { provider: "JioHotstar", mode: "Stream" },
      { provider: "Prime Video", mode: "Rent" },
      { provider: "Apple TV", mode: "Rent / buy" },
      { provider: "ZEE5", mode: "Rent" },
    ],
  },
  {
    title: "Big Hero 6",
    year: "2014",
    rating: "U",
    hook: "Soft robotics, healthcare technology and inventive engineering are wrapped inside an accessible superhero story.",
    concepts: "ROBOTICS · MEDICINE · ENGINEERING",
    art: "🩺",
    poster: "https://image.tmdb.org/t/p/w500/2mxS4wUimwlLmI1xp6QW6NSU361.jpg",
    availability: "India: streaming on JioHotstar",
    watchUrl: "https://www.justwatch.com/in/movie/big-hero-6",
    options: [{ provider: "JioHotstar", mode: "Stream" }],
  },
  {
    title: "Dolphin Tale",
    year: "2011",
    rating: "U",
    hook: "The rehabilitation of an injured dolphin introduces prosthetics, biomechanics, veterinary science and biomedical design.",
    concepts: "BIOMEDICAL ENGINEERING · PROSTHETICS · ANIMAL CARE",
    art: "🐬",
    availability: "India: Amazon Video rental reported",
    watchUrl: "https://www.justwatch.com/in/movie/dolphin-tale",
    options: [{ provider: "Prime Video", mode: "Rent" }],
  },
  {
    title: "Queen of Katwe",
    year: "2016",
    rating: "U",
    hook: "Chess becomes a laboratory for pattern recognition, planning, mathematical thinking and learning from mistakes.",
    concepts: "STRATEGY · PATTERNS · MATHEMATICAL THINKING",
    art: "♟️",
    availability: "India: Prime Video rent / buy listing available; check live subscription availability",
    watchUrl: "https://www.justwatch.com/in/movie/queen-of-katwe",
    options: [{ provider: "Prime Video", mode: "Rent / buy" }],
  },
  {
    title: "Interstellar",
    year: "2014",
    rating: "UA",
    hook: "A cinematic doorway into relativity, black holes, gravity, time dilation and the scale of the universe.",
    concepts: "RELATIVITY · COSMOLOGY · BLACK HOLES",
    art: "🕳️",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    availability: "India: Prime Video · JioHotstar; rentals also reported",
    watchUrl: "https://www.justwatch.com/in/movie/interstellar",
    options: [
      { provider: "Prime Video", mode: "Stream / rent" },
      { provider: "JioHotstar", mode: "Stream" },
      { provider: "Apple TV", mode: "Rent / buy" },
    ],
  },
  {
    title: "The Martian",
    year: "2015",
    rating: "UA",
    hook: "Survival on Mars becomes a multidisciplinary problem in botany, chemistry, physics, engineering and orbital mechanics.",
    concepts: "MARS · BOTANY · CHEMISTRY · ENGINEERING",
    art: "🪐",
    poster: "https://image.tmdb.org/t/p/w500/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg",
    availability: "India: streaming on JioHotstar",
    watchUrl: "https://www.justwatch.com/in/movie/the-martian",
    options: [{ provider: "JioHotstar", mode: "Stream" }],
  },
  {
    title: "Science Fair",
    year: "2018",
    rating: "8+ / PG",
    hook: "Real teenagers formulate questions, build projects, face setbacks and compete at the International Science and Engineering Fair.",
    concepts: "REAL STUDENT SCIENCE · RESEARCH · ISEF",
    art: "🔬",
    availability: "India streaming availability needs a live check; official National Geographic film page is linked",
    watchUrl: "https://www.justwatch.com/in/search?q=Science%20Fair",
    options: [{ provider: "National Geographic", mode: "Official film page", url: "https://films.nationalgeographic.com/science-fair" }],
  },
  {
    title: "The Biggest Little Farm",
    year: "2019",
    rating: "Family / PG",
    hook: "A farm behaves like a living system: soil, water, insects, predators, crops and people continuously affect one another.",
    concepts: "ECOLOGY · COMPLEX SYSTEMS · AGRICULTURE",
    art: "🌱",
    availability: "No India streaming option found in the latest availability check",
    watchUrl: "https://www.justwatch.com/in/movie/the-biggest-little-farm",
    options: [],
  },
];

function providerUrl(option: WatchOption, title: string) {
  if (option.url) return option.url;
  const q = encodeURIComponent(title);
  if (option.provider === "JioHotstar") return `https://www.jiohotstar.com/search?q=${q}`;
  if (option.provider === "Netflix") return `https://www.netflix.com/search?q=${q}`;
  if (option.provider === "Prime Video") return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`;
  if (option.provider === "Apple TV") return `https://tv.apple.com/in/search?term=${q}`;
  if (option.provider === "ZEE5") return `https://www.zee5.com/search?q=${q}`;
  return "#";
}

function googleTvUrl(title: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} Google TV movie`)}`;
}

function youtubeMoviesUrl(title: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} movie rent buy`)}`;
}

export default function CinemaLegalMovies() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<LegalScienceMovie | null>(null);

  useEffect(() => {
    let currentHost: HTMLElement | null = null;
    const syncHost = () => {
      const content = document.querySelector<HTMLElement>(".kgm-cinema-content");
      if (!content) {
        if (currentHost) {
          currentHost = null;
          setHost(null);
          setSelected(null);
        }
        return;
      }

      let nextHost = document.getElementById("kgm-cinema-legal-movies-root") as HTMLElement | null;
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.id = "kgm-cinema-legal-movies-root";
        const controls = content.querySelector(".kgm-cinema-controls");
        if (controls) controls.insertAdjacentElement("afterend", nextHost);
        else content.prepend(nextHost);
      }
      if (currentHost !== nextHost) {
        currentHost = nextHost;
        setHost(nextHost);
      }
    };

    syncHost();
    const observer = new MutationObserver(syncHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.getElementById("kgm-cinema-legal-movies-root")?.remove();
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const shelf = (
    <section className="kgm-legal-movies" aria-label="Science movies and legal watch options">
      <div className="kgm-legal-movies-head">
        <div>
          <span>🎞 BIG-SCREEN SCIENCE · WATCH LEGALLY</span>
          <h2>Great movies. Real science hooks. Legal places to watch.</h2>
          <p>KGM does not host these commercial films. Tap a title to see current India streaming or rental options, then continue to the official service. Availability can change, so every film also includes live availability, Google TV and YouTube Movies checks.</p>
        </div>
        <span className="kgm-legal-movies-badge">15 SCIENCE MOVIES</span>
      </div>

      <div className="kgm-legal-movies-grid">
        {movies.map((movie) => (
          <button type="button" className="kgm-legal-movies-card" key={movie.title} onClick={() => setSelected(movie)}>
            <span className="kgm-legal-movies-poster">
              <span className="kgm-legal-movies-placeholder" aria-hidden="true"><b>{movie.art}</b><em>{movie.title}</em></span>
              {movie.poster ? <img src={movie.poster} alt={`Poster artwork for ${movie.title}`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
              <span className="kgm-legal-movies-label">WATCH LEGALLY</span>
              <span className="kgm-legal-movies-tap">SEE WATCH OPTIONS →</span>
            </span>
            <span className="kgm-legal-movies-card-copy">
              <span className="kgm-legal-movies-meta">{movie.year} · {movie.rating}</span>
              <strong>{movie.title}</strong>
              <small>{movie.concepts}</small>
              <p>{movie.hook}</p>
              <span className="kgm-legal-movies-availability">{movie.availability}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="kgm-legal-movies-rights">
        <span>KGM is a discovery and learning layer only. It does not host, stream, download, sell or redistribute these commercial films.</span>
        <span>Availability is India-focused and may change. Poster imagery where shown is sourced via TMDB; rights remain with the respective studios and rights holders.</span>
      </div>
    </section>
  );

  return (
    <>
      {host ? createPortal(shelf, host) : null}
      {selected ? createPortal(
        <div className="kgm-legal-movies-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Where to watch ${selected.title}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <article className="kgm-legal-movies-modal">
            <button className="kgm-legal-movies-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <div className="kgm-legal-movies-modal-poster">
              <span className="kgm-legal-movies-placeholder" aria-hidden="true"><b>{selected.art}</b><em>{selected.title}</em></span>
              {selected.poster ? <img src={selected.poster} alt={`Poster artwork for ${selected.title}`} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
            </div>
            <div className="kgm-legal-movies-modal-copy">
              <span>🎬 KGM SCIENCE CINEMA</span>
              <h2>WHERE TO WATCH</h2>
              <h3>{selected.title}</h3>
              <small>{selected.year} · {selected.rating} · {selected.concepts}</small>
              <p>{selected.hook}</p>

              <div className="kgm-legal-movies-status">
                <strong>🇮🇳 India availability</strong>
                <p>{selected.availability}</p>
              </div>

              {selected.options.length ? <div className="kgm-legal-movies-options" aria-label="Reported watch services">
                {selected.options.map((option) => (
                  <a key={`${option.provider}-${option.mode}`} href={providerUrl(option, selected.title)} target="_blank" rel="noreferrer">
                    <strong>{option.provider}</strong><span>{option.mode} ↗</span>
                  </a>
                ))}
              </div> : <p className="kgm-legal-movies-no-provider">No verified India streaming provider is listed right now. Use the live checks below rather than an unofficial upload.</p>}

              <div className="kgm-legal-movies-checks">
                <a className="primary" href={selected.watchUrl} target="_blank" rel="noreferrer">Check live India availability ↗</a>
                <a href={googleTvUrl(selected.title)} target="_blank" rel="noreferrer">Google TV ↗</a>
                <a href={youtubeMoviesUrl(selected.title)} target="_blank" rel="noreferrer">YouTube Movies ↗</a>
              </div>

              <p className="kgm-legal-movies-note">KGM only points to legal discovery or provider pages. Subscription, rental and purchase terms belong to the provider. Avoid unofficial full-movie uploads.</p>
            </div>
          </article>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
