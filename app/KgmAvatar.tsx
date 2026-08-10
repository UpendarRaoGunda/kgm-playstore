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

export const KGM_AVATAR_PRESETS = [
  { id: "orbit-pop", emoji: "✦", name: "Orbit Pop", vibe: "KGM original", tone: "violet" },
  { id: "cosmic-cat", emoji: "😼", name: "Cosmic Cat", vibe: "chaos + curiosity", tone: "pink" },
  { id: "neon-alien", emoji: "👽", name: "Neon Alien", vibe: "different planet", tone: "lime" },
  { id: "astro-kid", emoji: "🚀", name: "Astro Kid", vibe: "always launching", tone: "cyan" },
  { id: "robo-rave", emoji: "🤖", name: "Robo Rave", vibe: "code after dark", tone: "blue" },
  { id: "dna-glow", emoji: "🧬", name: "DNA Glow", vibe: "bio energy", tone: "mint" },
  { id: "pixel-ghost", emoji: "👻", name: "Pixel Ghost", vibe: "online somehow", tone: "ice" },
  { id: "brainwave", emoji: "🧠", name: "Brainwave", vibe: "big idea mode", tone: "magenta" },
  { id: "frog-mode", emoji: "🐸", name: "Frog Mode", vibe: "unbothered genius", tone: "green" },
  { id: "saturn-pop", emoji: "🪐", name: "Saturn Pop", vibe: "cosmic main character", tone: "purple" },
  { id: "lightning-lab", emoji: "⚡", name: "Lightning Lab", vibe: "fast experiment", tone: "yellow" },
  { id: "fire-maker", emoji: "🔥", name: "Fire Maker", vibe: "shipping today", tone: "orange" },
  { id: "star-bloom", emoji: "🌟", name: "Star Bloom", vibe: "quietly iconic", tone: "sunset" },
] as const;

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");

export function getAvatarPreset(id?: string | null) {
  return KGM_AVATAR_PRESETS.find((item) => item.id === id) || KGM_AVATAR_PRESETS[0];
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
