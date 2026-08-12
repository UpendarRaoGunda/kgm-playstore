"use client";

import { useEffect } from "react";

const VIDEO_SELECTOR = ".kgm-upload-media > video";
const LANG_KEY = "kgm-language-v2";

function durationLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function frameTime(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0.2) return 0;
  return Math.min(1.0, Math.max(0.15, duration * 0.025));
}

function playLabel() {
  return localStorage.getItem(LANG_KEY) === "te" ? "వీడియో ప్లే చేయండి" : "Play video";
}

export default function KgmVideoThumbnailEnhancer() {
  useEffect(() => {
    const cleanups = new Map<HTMLVideoElement, () => void>();
    const pending = new Set<HTMLVideoElement>();

    const viewportObserver = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const video = entry.target as HTMLVideoElement;
            viewportObserver.unobserve(video);
            pending.delete(video);
            prime(video);
          });
        }, { rootMargin: "220px 0px", threshold: 0.01 })
      : null;

    const prime = (video: HTMLVideoElement) => {
      if (video.dataset.kgmVideoPrimed === "1") return;
      video.dataset.kgmVideoPrimed = "1";
      video.preload = "metadata";
      try { video.load(); } catch { /* browser will load on demand */ }
    };

    const setup = (video: HTMLVideoElement) => {
      const host = video.parentElement;
      if (!host || !host.classList.contains("kgm-upload-media")) return;

      if (video.dataset.kgmVideoThumb === "ready") {
        if (!host.classList.contains("kgm-video-is-playing") && video.controls) video.controls = false;
        return;
      }

      video.dataset.kgmVideoThumb = "ready";
      host.classList.add("kgm-video-thumb-host");
      video.classList.add("kgm-video-thumb-native");
      video.controls = false;
      video.preload = "none";
      video.playsInline = true;

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "kgm-video-thumb-play";
      trigger.setAttribute("aria-label", playLabel());
      trigger.innerHTML = '<span aria-hidden="true">▶</span><small></small>';
      host.appendChild(trigger);

      const meta = trigger.querySelector("small");
      let target = 0;
      let frameRequested = false;
      let intentionallyPlaying = false;

      const updateLanguage = () => trigger.setAttribute("aria-label", playLabel());

      const markFrameReady = () => {
        host.classList.add("kgm-video-frame-ready");
        const duration = durationLabel(video.duration);
        if (meta) meta.textContent = duration;
      };

      const requestFrame = () => {
        if (frameRequested || intentionallyPlaying) return;
        frameRequested = true;
        const duration = video.duration;
        target = frameTime(duration);
        const label = durationLabel(duration);
        if (meta) meta.textContent = label;
        if (!target) {
          markFrameReady();
          return;
        }
        try {
          if (Math.abs(video.currentTime - target) < 0.03) markFrameReady();
          else video.currentTime = target;
        } catch {
          markFrameReady();
        }
      };

      const onLoadedData = () => {
        if (!frameRequested) requestFrame();
        else if (Math.abs(video.currentTime - target) < 0.08) markFrameReady();
      };

      const onSeeked = () => {
        if (!intentionallyPlaying) markFrameReady();
      };

      const onError = () => {
        host.classList.add("kgm-video-frame-ready", "kgm-video-frame-failed");
        if (meta) meta.textContent = localStorage.getItem(LANG_KEY) === "te" ? "వీడియో" : "VIDEO";
      };

      const startPlayback = () => {
        intentionallyPlaying = true;
        pending.delete(video);
        viewportObserver?.unobserve(video);
        host.classList.add("kgm-video-is-playing");
        trigger.hidden = true;
        video.controls = true;
        video.preload = "auto";
        if (video.dataset.kgmVideoPrimed !== "1") prime(video);
        try { video.currentTime = 0; } catch { /* keep current frame */ }
        const playing = video.play();
        if (playing) playing.catch(() => {
          intentionallyPlaying = false;
          host.classList.remove("kgm-video-is-playing");
          trigger.hidden = false;
          video.controls = false;
        });
      };

      const onEnded = () => {
        intentionallyPlaying = false;
        host.classList.remove("kgm-video-is-playing");
        video.controls = false;
        trigger.hidden = false;
        try { video.currentTime = target; } catch { /* leave final frame */ }
      };

      trigger.addEventListener("click", startPlayback);
      video.addEventListener("loadedmetadata", requestFrame);
      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onError);
      video.addEventListener("ended", onEnded);
      window.addEventListener("kgm-language-changed", updateLanguage);

      if (viewportObserver) {
        pending.add(video);
        viewportObserver.observe(video);
      } else {
        prime(video);
      }

      cleanups.set(video, () => {
        pending.delete(video);
        viewportObserver?.unobserve(video);
        trigger.removeEventListener("click", startPlayback);
        video.removeEventListener("loadedmetadata", requestFrame);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        video.removeEventListener("ended", onEnded);
        window.removeEventListener("kgm-language-changed", updateLanguage);
        trigger.remove();
      });
    };

    const scan = () => document.querySelectorAll<HTMLVideoElement>(VIDEO_SELECTOR).forEach(setup);
    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      viewportObserver?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
      pending.clear();
    };
  }, []);

  return null;
}
