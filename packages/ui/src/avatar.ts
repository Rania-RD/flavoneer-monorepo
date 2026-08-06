export interface AvatarColors {
  backgroundColor: string;
  color: string;
}

export interface AvatarIdentity extends AvatarColors {
  initials: string;
}

const AVATAR_PALETTE: readonly AvatarColors[] = [
  { backgroundColor: "#D2F2D4", color: "#1C4A3C" },
  { backgroundColor: "#FFE3A8", color: "#6B3F05" },
  { backgroundColor: "#FFD9C5", color: "#7A2E0B" },
  { backgroundColor: "#CDE6D6", color: "#173E33" },
  { backgroundColor: "#F3E7C8", color: "#4F3A12" },
] as const;

const firstCharacters = (value: string, count: number) =>
  Array.from(value.normalize("NFC")).slice(0, count).join("");

export const getInitials = (name: string | null | undefined) => {
  const words = name?.trim().split(/\s+/u).filter(Boolean) ?? [];

  if (words.length === 0) {
    return "?";
  }

  const initials =
    words.length === 1
      ? firstCharacters(words[0], 2)
      : `${firstCharacters(words[0], 1)}${firstCharacters(words.at(-1) ?? "", 1)}`;

  return initials.toUpperCase();
};

const hashSeed = (seed: string) => {
  let hash = 2_166_136_261;

  for (const character of seed.trim().toLowerCase()) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
};

export const getAvatarIdentity = (
  name: string | null | undefined,
  seed: string | null | undefined = name,
): AvatarIdentity => {
  const paletteIndex = hashSeed(seed?.trim() || name?.trim() || "?") % AVATAR_PALETTE.length;

  return {
    initials: getInitials(name),
    ...AVATAR_PALETTE[paletteIndex],
  };
};
