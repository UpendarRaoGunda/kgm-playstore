"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstallButton({ onInteraction }: { onInteraction?: () => void }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const dialogTitle = "kgm-pc-install-title";

  useEffect(() => {
    queueMicrotask(() => setInstalled(isStandalone()));

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showHelp) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHelp(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showHelp]);

  async function requestInstall() {
    onInteraction?.();
    if (installed || isStandalone()) {
      setInstalled(true);
      return;
    }
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setInstalled(true);
  }

  const installHelp = showHelp && typeof document !== "undefined" ? createPortal(
    <div className="kgm-pwa-dialog-backdrop" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&setShowHelp(false)}>
      <section className="kgm-pwa-dialog" role="dialog" aria-modal="true" aria-labelledby={dialogTitle}>
        <button className="kgm-pwa-dialog-close" type="button" onClick={()=>setShowHelp(false)} aria-label="Close install instructions">×</button>
        <span className="kgm-pwa-dialog-icon" aria-hidden="true">K</span>
        <p className="kgm-pwa-kicker">KGM DESKTOP APP</p>
        <h2 id={dialogTitle}>Install KGM on this computer</h2>
        <p>KGM opens in its own window and appears in your Start menu and taskbar. There is no installer file to download.</p>
        <ol>
          <li><span>1</span><div><strong>Open this page in Chrome or Microsoft Edge</strong><p>Use the current, secure KGM website on Render.</p></div></li>
          <li><span>2</span><div><strong>Open the browser menu</strong><p>Choose <b>Apps</b>, then <b>Install KGM · Koratlagudem Community Hub</b>. You may also see an install icon in the address bar.</p></div></li>
          <li><span>3</span><div><strong>Confirm Install</strong><p>Pin KGM to the taskbar or Start menu if your browser offers those options.</p></div></li>
        </ol>
        <button className="kgm-pwa-dialog-done" type="button" onClick={()=>setShowHelp(false)}>Got it</button>
        <small>If the Install option is missing, refresh once after this update finishes deploying.</small>
      </section>
    </div>,
    document.body,
  ) : null;

  return <>
    <button
      className={`kgm-pwa-nav-link${installed ? " installed" : ""}`}
      type="button"
      onClick={requestInstall}
      aria-haspopup={installed ? undefined : "dialog"}
      title={installed ? "KGM is running as an installed app" : "Install KGM as a desktop app"}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {installed
          ? <><path d="m5 12 4 4L19 6"/><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2V5a2 2 0 0 1 2-2Z"/></>
          : <><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 18v2h14v-2"/></>}
      </svg>
      {installed ? "PC app installed" : "Install on PC"}
    </button>

    {installHelp}
  </>;
}

export default function PwaManager() {
  const [online, setOnline] = useState(true);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const refreshForUpdate = useRef(false);

  useEffect(() => {
    queueMicrotask(() => setOnline(navigator.onLine));
    const showOnline = () => setOnline(true);
    const showOffline = () => setOnline(false);
    window.addEventListener("online", showOnline);
    window.addEventListener("offline", showOffline);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("online", showOnline);
        window.removeEventListener("offline", showOffline);
      };
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    const activateWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      refreshForUpdate.current = true;
      setUpdateWorker(worker);
      worker.postMessage({ type: "SKIP_WAITING" });
    };

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) activateWorker(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) activateWorker(worker);
        });
      });
      void registration.update().catch(() => undefined);
    };

    const register = () => navigator.serviceWorker.register("/service-worker.js", { scope: "/", updateViaCache: "none" })
      .then(watchRegistration)
      .catch((error) => console.warn("KGM offline support could not start", error));
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    const reloadAfterUpdate = () => {
      // Existing mobile/PWA/WebView clients should immediately load the new JS bundle.
      // Avoid reloading only on the very first service-worker installation.
      if (hadController || refreshForUpdate.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", reloadAfterUpdate);

    return () => {
      window.removeEventListener("online", showOnline);
      window.removeEventListener("offline", showOffline);
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", reloadAfterUpdate);
    };
  }, []);

  function applyUpdate() {
    if (!updateWorker) return;
    refreshForUpdate.current = true;
    updateWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return <div className="kgm-pwa-status" aria-live="polite" aria-atomic="true">
    {!online && <div className="kgm-pwa-notice offline"><span aria-hidden="true">○</span><div><strong>You are offline</strong><small>KGM’s saved app shell remains available. Chat, gallery and downloads reconnect when the network returns.</small></div></div>}
    {updateWorker && <div className="kgm-pwa-notice update"><span aria-hidden="true">↑</span><div><strong>Updating KGM…</strong><small>The latest mobile improvements are being activated automatically.</small></div><button type="button" onClick={applyUpdate}>Update now</button></div>}
  </div>;
}
