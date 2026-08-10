import type { Id } from "@flavoneer/backend/data-model";
import { compressImage } from "./imageUtils";

export const PROJECT_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const PROJECT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function isSupportedProjectPhoto(file: File) {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size <= PROJECT_PHOTO_MAX_BYTES
  );
}

export async function uploadProjectPhoto(
  file: File,
  generateUploadUrl: () => Promise<string>
): Promise<Id<"_storage">> {
  const uploadFile = await compressImage(file, 1200);
  const postUrl = await generateUploadUrl();
  const response = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": uploadFile.type },
    body: uploadFile,
  });

  if (!response.ok) {
    throw new Error(
      `Project photo upload failed with status ${response.status}`
    );
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("storageId" in result) ||
    typeof result.storageId !== "string"
  ) {
    throw new Error("Project photo upload returned no storage ID");
  }

  return result.storageId as Id<"_storage">;
}
