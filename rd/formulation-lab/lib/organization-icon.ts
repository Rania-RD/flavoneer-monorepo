import type { Id } from "@flavoneer/backend/data-model";
import { compressImage } from "./imageUtils";

export const ORGANIZATION_ICON_ACCEPT = "image/jpeg,image/png,image/webp";
export const ORGANIZATION_ICON_MAX_BYTES = 5 * 1024 * 1024;

export function getOrganizationInitials(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

export function isSupportedOrganizationIcon(file: File) {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size <= ORGANIZATION_ICON_MAX_BYTES
  );
}

export async function uploadOrganizationIcon(
  file: File,
  generateUploadUrl: () => Promise<string>
): Promise<Id<"_storage">> {
  const uploadFile = await compressImage(file, 512);
  const postUrl = await generateUploadUrl();
  const response = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": uploadFile.type },
    body: uploadFile,
  });

  if (!response.ok) {
    throw new Error(
      `Organization icon upload failed with status ${response.status}`
    );
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("storageId" in result) ||
    typeof result.storageId !== "string"
  ) {
    throw new Error("Organization icon upload returned no storage ID");
  }

  return result.storageId as Id<"_storage">;
}
