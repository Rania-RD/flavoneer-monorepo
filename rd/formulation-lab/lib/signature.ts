export const SIGNATURE_FONT_FAMILY = "Satisfy, cursive";
export const SIGNATURE_TYPE = "text" as const;

export const getSignatureName = (
  profileName?: string,
  authenticatedName?: string
) => profileName?.trim() || authenticatedName?.trim() || "";
