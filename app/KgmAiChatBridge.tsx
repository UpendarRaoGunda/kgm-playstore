"use client";

import { useEffect } from "react";

export default function KgmAiChatBridge() {
  useEffect(() => {
    const signalVillageOpen = () => {
      window.dispatchEvent(new CustomEvent("kgm-village-chat-state", { detail: { open: true } }));
    };

    const openVillage = () => {
      const launcher = document.querySelector<HTMLButtonElement>(".village-chat-launcher");
      if (!launcher) return;
      signalVillageOpen();
      window.setTimeout(() => launcher.click(), 0);
    };

    const onCaptureClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest(".village-chat-launcher,.kgm-chat-nav-link,.kgm-account-nav-link,.kgm-youth-chat-link,.yv-chat-dock")) {
        signalVillageOpen();
      }
    };

    window.addEventListener("kgm-open-village-chat", openVillage);
    document.addEventListener("click", onCaptureClick, true);
    return () => {
      window.removeEventListener("kgm-open-village-chat", openVillage);
      document.removeEventListener("click", onCaptureClick, true);
    };
  }, []);

  return null;
}
