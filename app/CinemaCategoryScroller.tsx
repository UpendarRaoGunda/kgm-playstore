"use client";

import { useEffect } from "react";

export default function CinemaCategoryScroller() {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const mount = () => {
      const strip = document.querySelector(".kgm-cinema-categories") as HTMLElement | null;
      if (!strip || strip.parentElement?.querySelector(".kgm-cinema-category-nav")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "kgm-cinema-category-wrap";
      strip.parentElement?.insertBefore(wrapper, strip);
      wrapper.appendChild(strip);

      const controls = document.createElement("div");
      controls.className = "kgm-cinema-category-nav";
      controls.innerHTML = '<button type="button" class="prev" aria-label="Previous science categories">‹</button><button type="button" class="next" aria-label="More science categories">›</button>';
      wrapper.appendChild(controls);

      const prev = controls.querySelector(".prev") as HTMLButtonElement;
      const next = controls.querySelector(".next") as HTMLButtonElement;
      const move = (direction: number) => strip.scrollBy({ left: direction * Math.max(260, strip.clientWidth * .62), behavior: "smooth" });
      const refresh = () => {
        const max = Math.max(0, strip.scrollWidth - strip.clientWidth - 2);
        prev.disabled = strip.scrollLeft <= 2;
        next.disabled = strip.scrollLeft >= max;
        wrapper.classList.toggle("can-left", !prev.disabled);
        wrapper.classList.toggle("can-right", !next.disabled);
      };
      const onPrev = () => move(-1);
      const onNext = () => move(1);
      prev.addEventListener("click", onPrev);
      next.addEventListener("click", onNext);
      strip.addEventListener("scroll", refresh, { passive: true });
      window.addEventListener("resize", refresh);
      requestAnimationFrame(refresh);
      setTimeout(refresh, 250);

      cleanup = () => {
        prev.removeEventListener("click", onPrev);
        next.removeEventListener("click", onNext);
        strip.removeEventListener("scroll", refresh);
        window.removeEventListener("resize", refresh);
        if (wrapper.isConnected) wrapper.replaceWith(strip);
      };
    };

    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("kgm-open-cinema", mount);
    mount();
    return () => {
      observer.disconnect();
      window.removeEventListener("kgm-open-cinema", mount);
      cleanup?.();
    };
  }, []);

  return null;
}
