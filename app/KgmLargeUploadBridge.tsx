"use client";

import { useEffect } from "react";

const MB = 1024 * 1024;
const LEGACY_LIMIT = 50 * MB;
const VIDEO_LIMIT = 500 * MB;
const APK_LIMIT = 200 * MB;

function isApk(file: File) {
  return file.name.toLowerCase().endsWith(".apk") || file.type === "application/vnd.android.package-archive";
}

function formatMb(value: number) {
  return `${Math.ceil(value / MB)} MB`;
}

export default function KgmLargeUploadBridge() {
  useEffect(() => {
    let previewUrl = "";

    const clearBridgePreview = () => {
      document.querySelector(".kgm-large-upload-preview")?.remove();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    };

    const patchCopy = () => {
      const helper = document.querySelector<HTMLElement>(".kgm-upload-file small");
      if (helper) {
        helper.textContent = "Phone camera videos are supported. Choose an existing recording from Photos/Gallery or Files. Images ≤10 MB · music ≤25 MB · videos ≤500 MB · APKs ≤200 MB.";
      }
    };

    const showLargeSelection = (input: HTMLInputElement, file: File, kind: "video" | "apk") => {
      clearBridgePreview();
      const label = input.closest(".kgm-upload-file");
      const form = input.closest("form");
      if (!label || !form) return;

      const preview = document.createElement("div");
      preview.className = `kgm-upload-selection kgm-large-upload-preview ${kind}`;

      const head = document.createElement("div");
      head.className = "kgm-upload-selection-head";
      const info = document.createElement("div");
      const type = document.createElement("span");
      type.textContent = `SELECTED ${kind.toUpperCase()}`;
      const name = document.createElement("strong");
      name.textContent = file.name || "Camera recording";
      const size = document.createElement("small");
      size.textContent = `${formatMb(file.size)}${file.type ? ` · ${file.type}` : ""}`;
      info.append(type, name, size);
      head.append(info);
      preview.append(head);

      if (kind === "video") {
        previewUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.src = previewUrl;
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        preview.append(video);
      } else {
        const apk = document.createElement("div");
        apk.className = "kgm-upload-apk-preview";
        apk.innerHTML = "<span>APK</span><p>Ready to upload this Android package.</p>";
        preview.append(apk);
      }

      label.insertAdjacentElement("afterend", preview);
      const submit = form.querySelector<HTMLButtonElement>(".kgm-upload-submit");
      if (submit) {
        submit.disabled = false;
        submit.textContent = `Publish ${kind} for everyone →`;
      }
    };

    const showLimitError = (input: HTMLInputElement, file: File, limit: number, label: string) => {
      const form = input.closest("form");
      clearBridgePreview();
      input.value = "";
      if (!form) return;
      form.querySelector(".kgm-large-upload-error")?.remove();
      const error = document.createElement("p");
      error.className = "kgm-gallery-error kgm-large-upload-error";
      error.textContent = `${label} is ${formatMb(file.size)}. Maximum allowed size is ${formatMb(limit)}.`;
      form.querySelector(".kgm-upload-file")?.insertAdjacentElement("afterend", error);
    };

    const onChange = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input || input.id !== "kgm-community-upload-file" || input.type !== "file") return;
      const file = input.files?.[0];
      if (!file) {
        clearBridgePreview();
        return;
      }

      const apk = isApk(file);
      const video = file.type.startsWith("video/") || /\.(mp4|mov|m4v|3gp|3gpp|webm|mpeg|mpg|avi)$/i.test(file.name);
      if (!apk && !video) return;

      const limit = apk ? APK_LIMIT : VIDEO_LIMIT;
      if (file.size <= LEGACY_LIMIT) return;

      // CommunityGallery's legacy React handler still has a 50 MB cap. Stop that
      // handler only for newly supported large video/APK files; the form itself
      // still submits the real File object to the authenticated backend endpoint.
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (file.size > limit) {
        showLimitError(input, file, limit, apk ? "APK" : "Video");
        return;
      }

      formCleanup(input);
      showLargeSelection(input, file, apk ? "apk" : "video");
    };

    const formCleanup = (input: HTMLInputElement) => {
      input.closest("form")?.querySelector(".kgm-large-upload-error")?.remove();
    };

    const observer = new MutationObserver(patchCopy);
    observer.observe(document.body, { childList: true, subtree: true });
    patchCopy();
    document.addEventListener("change", onChange, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", onChange, true);
      clearBridgePreview();
    };
  }, []);

  return null;
}
