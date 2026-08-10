"use client";

export type KgmAvatarValue = {
  type: "preset" | "upload";
  preset?: string | null;
  url?: string | null;
};

export type KgmProfile = {
  id: string;
  email: string;
  nickname: string;
  role: "Child" | "Teen" | "Adult";
  avatar: KgmAvatarValue;
  created_at?: string;
  updated_at?: string;
};

export type KgmAvatarUpload = {
  id: string;
  title: string;
  description?: string;
  kind: string;
  file_url: string;
  created_at?: string;
};

export const KGM_AVATAR_UPLOAD_TITLE = "KGM Profile Avatar";
export const KGM_AVATAR_PRESET_PREFIX = "KGM avatar preset:";

export const KGM_AVATAR_PRESETS = [
  { id: "orbit-pop", emoji: "✦", name: "Orbit Pop", vibe: "KGM original", tone: "violet", colors: ["#8b5cff", "#5025d8"] },
  { id: "cosmic-cat", emoji: "😼", name: "Cosmic Cat", vibe: "chaos + curiosity", tone: "pink", colors: ["#ff5fc8", "#7d2cff"] },
  { id: "neon-alien", emoji: "👽", name: "Neon Alien", vibe: "different planet", tone: "lime", colors: ["#d8ff3e", "#16c784"] },
  { id: "astro-kid", emoji: "🚀", name: "Astro Kid", vibe: "always launching", tone: "cyan", colors: ["#4ff4ff", "#2878ff"] },
  { id: "robo-rave", emoji: "🤖", name: "Robo Rave", vibe: "code after dark", tone: "blue", colors: ["#6fa9ff", "#4546e8"] },
  { id: "dna-glow", emoji: "🧬", name: "DNA Glow", vibe: "bio energy", tone: "mint", colors: ["#65ffd1", "#0c9c8c"] },
  { id: "pixel-ghost", emoji: "👻", name: "Pixel Ghost", vibe: "online somehow", tone: "ice", colors: ["#eef8ff", "#7ac9ff"] },
  { id: "brainwave", emoji: "🧠", name: "Brainwave", vibe: "big idea mode", tone: "magenta", colors: ["#ff5ee7", "#ff4f79"] },
  { id: "frog-mode", emoji: "🐸", name: "Frog Mode", vibe: "unbothered genius", tone: "green", colors: ["#9aff65", "#19a96e"] },
  { id: "saturn-pop", emoji: "🪐", name: "Saturn Pop", vibe: "cosmic main character", tone: "purple", colors: ["#bd82ff", "#6937f0"] },
  { id: "lightning-lab", emoji: "⚡", name: "Lightning Lab", vibe: "fast experiment", tone: "yellow", colors: ["#fff25f", "#ff9b2e"] },
  { id: "fire-maker", emoji: "🔥", name: "Fire Maker", vibe: "shipping today", tone: "orange", colors: ["#ff994a", "#ff4a65"] },
  { id: "star-bloom", emoji: "🌟", name: "Star Bloom", vibe: "quietly iconic", tone: "sunset", colors: ["#ffd56a", "#ff66b8"] },
] as const;

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");

export function getAvatarPreset(id?: string | null) {
  return KGM_AVATAR_PRESETS.find((item) => item.id === id) || KGM_AVATAR_PRESETS[0];
}

export function isKgmAvatarUpload(item?: { title?: string } | null) {
  return item?.title === KGM_AVATAR_UPLOAD_TITLE;
}

export function presetFromAvatarUpload(item?: KgmAvatarUpload | null) {
  const description = item?.description || "";
  if (!description.startsWith(KGM_AVATAR_PRESET_PREFIX)) return null;
  const id = description.slice(KGM_AVATAR_PRESET_PREFIX.length).trim();
  return KGM_AVATAR_PRESETS.some((preset) => preset.id === id) ? id : null;
}

export function avatarFromUploads(items: KgmAvatarUpload[]) {
  const item = items.find((entry) => isKgmAvatarUpload(entry) && entry.kind === "image");
  if (!item) return { type: "preset" as const, preset: "orbit-pop", url: null };
  return { type: "upload" as const, preset: presetFromAvatarUpload(item), url: item.file_url };
}

export function avatarImageUrl(value?: KgmAvatarValue | null) {
  if (value?.type !== "upload" || !value.url) return "";
  return /^https?:\/\//i.test(value.url) ? value.url : `${API}${value.url.startsWith("/") ? value.url : `/${value.url}`}`;
}

export default function KgmAvatar({
  value,
  nickname,
  size = "md",
  className = "",
}: {
  value?: KgmAvatarValue | null;
  nickname?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const preset = getAvatarPreset(value?.preset);
  const uploaded = avatarImageUrl(value);
  const label = `${nickname || "KGM member"} avatar`;

  return (
    <span className={`kgm-avatar kgm-avatar-${size} kgm-avatar-${preset.tone} ${className}`.trim()} title={label}>
      {uploaded ? <img src={uploaded} alt={label} loading="lazy" /> : <span aria-hidden="true">{preset.emoji}</span>}
      <i aria-hidden="true" />
    </span>
  );
}
