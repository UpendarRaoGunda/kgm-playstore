"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ComingSoonMovie = {
  title: string;
  year: string;
  rating: string;
  hook: string;
  concepts: string;
  poster: string;
};

const movies: ComingSoonMovie[] = [
  {
    title: "Interstellar",
    year: "2014",
    rating: "PG-13",
    hook: "A cinematic doorway into relativity, black holes, gravity and the scale of the universe.",
    concepts: "SPACE-TIME · GRAVITY · BLACK HOLES",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    title: "The Martian",
    year: "2015",
    rating: "PG-13",
    hook: "Survival on Mars becomes a lesson in engineering, botany, chemistry and stubborn problem-solving.",
    concepts: "MARS · ENGINEERING · BOTANY",
    poster: "https://image.tmdb.org/t/p/w500/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg",
  },
  {
    title: "Hidden Figures",
    year: "2016",
    rating: "PG",
    hook: "The mathematicians and programmers whose calculations helped NASA reach orbit.",
    concepts: "NASA · MATHEMATICS · COMPUTING",
    poster: "https://image.tmdb.org/t/p/w500/9lfz2W2uGjyow3am00rsPJ8iOyq.jpg",
  },
  {
    title: "Apollo 13",
    year: "1995",
    rating: "PG",
    hook: "A real mission crisis turned into one of history's greatest examples of systems thinking under pressure.",
    concepts: "SPACEFLIGHT · SYSTEMS · PROBLEM-SOLVING",
    poster: "https://image.tmdb.org/t/p/w500/oYUZHYMwNKnE1ef4WE5Hw2a9OAY.jpg",
  },
  {
    title: "October Sky",
    year: "1999",
    rating: "PG",
    hook: "A teenager sees Sputnik, starts building rockets and discovers how far curiosity can travel.",
    concepts: "ROCKETRY · PHYSICS · CURIOSITY",
    poster: "https://image.tmdb.org/t/p/w500/9tCU0Dplt26sgiChlOS01DlIMTA.jpg",
  },
  {
    title: "The Imitation Game",
    year: "2014",
    rating: "PG-13",
    hook: "Alan Turing, codebreaking and the early ideas that helped shape modern computing.",
    concepts: "COMPUTING · CRYPTOGRAPHY · LOGIC",
    poster: "https://image.tmdb.org/t/p/w500/zSqJ1qFq8NXFfi7JeIYMlzyR0dx.jpg",
  },
  {
    title: "The Theory of Everything",
    year: "2014",
    rating: "PG-13",
    hook: "A human story around Stephen Hawking's life, cosmology and the questions that reshape physics.",
    concepts: "COSMOLOGY · PHYSICS · HAWKING",
    poster: "https://image.tmdb.org/t/p/w500/kJuL37NTE51zVP3eG5aGMyKAIlh.jpg",
  },
  {
    title: "A Beautiful Mind",
    year: "2001",
    rating: "PG-13",
    hook: "A story inspired by mathematician John Nash and the strange power of patterns, strategy and ideas.",
    concepts: "MATHEMATICS · GAME THEORY · PATTERNS",
    poster: "https://image.tmdb.org/t/p/w500/zwzWCmH72OSC9NA0ipoqw5Zjya8.jpg",
  },
];

export default function CinemaComingSoon() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<ComingSoonMovie | null>(null);

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

      let nextHost = document.getElementById("kgm-cinema-coming-soon-root") as HTMLElement | null;
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.id = "kgm-cinema-coming-soon-root";
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
      document.getElementById("kgm-cinema-coming-soon-root")?.remove();
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
    <section className="kgm-coming-soon" aria-label="Science movies coming soon">
      <div className="kgm-coming-soon-head">
        <div>
          <span>🎞 BIG-SCREEN SCIENCE · COMING SOON</span>
          <h2>Movies that make curiosity feel cinematic.</h2>
          <p>Explore famous stories built around space, mathematics, computing, engineering and scientific lives. These are preview cards only — the movies are not currently hosted or playable by KGM.</p>
        </div>
        <span className="kgm-coming-soon-badge">PREVIEW SHELF</span>
      </div>

      <div className="kgm-coming-soon-grid">
        {movies.map((movie) => (
          <button type="button" className="kgm-coming-soon-card" key={movie.title} onClick={() => setSelected(movie)}>
            <span className="kgm-coming-soon-poster">
              <span className="kgm-coming-soon-placeholder" aria-hidden="true">KGM<br/>CINEMA</span>
              <img
                src={movie.poster}
                alt={`Poster artwork for ${movie.title}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(event) => { event.currentTarget.style.display = "none"; }}
              />
              <span className="kgm-coming-soon-label">COMING SOON</span>
              <span className="kgm-coming-soon-tap">TAP TO PREVIEW</span>
            </span>
            <span className="kgm-coming-soon-card-copy">
              <span className="kgm-coming-soon-meta">{movie.year} · {movie.rating}</span>
              <strong>{movie.title}</strong>
              <small>{movie.concepts}</small>
              <p>{movie.hook}</p>
            </span>
          </button>
        ))}
      </div>

      <div className="kgm-coming-soon-rights">
        <span>Discovery preview only. KGM does not host, stream, sell or distribute these commercial movies.</span>
        <span>Poster imagery via <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>. KGM is not endorsed or certified by TMDB.</span>
      </div>
    </section>
  );

  return (
    <>
      {host ? createPortal(shelf, host) : null}
      {selected ? createPortal(
        <div className="kgm-coming-soon-modal-backdrop" role="dialog" aria-modal="true" aria-label={`${selected.title} coming soon`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <article className="kgm-coming-soon-modal">
            <button className="kgm-coming-soon-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <div className="kgm-coming-soon-modal-poster">
              <img src={selected.poster} alt={`Poster artwork for ${selected.title}`} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            </div>
            <div className="kgm-coming-soon-modal-copy">
              <span>🎬 KGM SCIENCE CINEMA</span>
              <h2>COMING SOON</h2>
              <h3>{selected.title}</h3>
              <small>{selected.year} · {selected.rating} · {selected.concepts}</small>
              <p>{selected.hook}</p>
              <div className="kgm-coming-soon-message">
                <strong>Not playable yet.</strong>
                <p>We are building a rights-respecting way to bring more science cinema into KGM. For now, this card is here to spark curiosity and show what we want to add next.</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}>Got it ✓</button>
            </div>
          </article>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
