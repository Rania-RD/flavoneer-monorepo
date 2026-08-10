import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isSupportedProjectPhoto,
  PROJECT_PHOTO_ACCEPT,
} from "../lib/projectPhoto";

interface ProjectPhotoFieldProps {
  disabled?: boolean;
  existingPhotoUrl?: string;
  file: File | null;
  isRemoved?: boolean;
  language?: "ar" | "en";
  onChange: (file: File) => void;
  onRemove: () => void;
}

const ProjectPhotoField: React.FC<ProjectPhotoFieldProps> = ({
  disabled = false,
  existingPhotoUrl,
  file,
  isRemoved = false,
  language,
  onChange,
  onRemove,
}) => {
  const { i18n } = useTranslation();
  const t = language ? i18n.getFixedT(language) : i18n.t.bind(i18n);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const displayedPhotoUrl =
    previewUrl || (isRemoved ? undefined : existingPhotoUrl);

  return (
    <div className="space-y-2">
      <span className="block font-semibold text-gray-700 text-sm dark:text-slate-300">
        {t("project_photo")}
      </span>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 p-3 sm:flex-row sm:items-center dark:border-slate-600 dark:bg-slate-800/60">
        {displayedPhotoUrl ? (
          <img
            alt={t("project_photo_preview")}
            className="h-24 w-full rounded-xl object-cover sm:w-32"
            data-testid="project-photo-preview"
            height={96}
            src={displayedPhotoUrl}
            width={128}
          />
        ) : (
          <div className="flex h-24 w-full items-center justify-center rounded-xl border border-gray-200 border-dashed bg-white text-gray-400 sm:w-32 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-500">
            <ImageIcon aria-hidden="true" size={28} />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-mint px-4 py-2 font-bold text-brand-primary text-sm transition-colors focus-within:ring-2 focus-within:ring-brand-focus/50 hover:bg-[#bfe8c3] dark:bg-brand-accent/20 dark:text-brand-cream">
              <Upload aria-hidden="true" size={16} />
              {t(displayedPhotoUrl ? "replace_photo" : "upload_photo")}
              <input
                accept={PROJECT_PHOTO_ACCEPT}
                className="sr-only"
                data-testid="project-photo-input"
                disabled={disabled}
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  event.target.value = "";
                  if (!selectedFile) {
                    return;
                  }
                  if (!isSupportedProjectPhoto(selectedFile)) {
                    setError(t("project_photo_requirements"));
                    return;
                  }
                  setError(undefined);
                  onChange(selectedFile);
                }}
                type="file"
              />
            </label>
            {displayedPhotoUrl && (
              <button
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-bold text-rose-600 text-sm transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                disabled={disabled}
                onClick={() => {
                  setError(undefined);
                  onRemove();
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
                {t("remove_photo")}
              </button>
            )}
          </div>
          <p className="text-gray-500 text-xs dark:text-slate-400">
            {t("project_photo_requirements")}
          </p>
          {error && (
            <p
              aria-live="polite"
              className="font-medium text-rose-600 text-xs dark:text-rose-300"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPhotoField;
