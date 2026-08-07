import { Loader2, Trash2, Upload } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isSupportedOrganizationIcon,
  ORGANIZATION_ICON_ACCEPT,
} from "../lib/organization-icon";

interface OrganizationIconFieldProps {
  disabled?: boolean;
  iconUrl?: string;
  isUpdating?: boolean;
  name: string;
  onRemove: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
}

const OrganizationIconField: React.FC<OrganizationIconFieldProps> = ({
  disabled = false,
  iconUrl,
  isUpdating = false,
  name,
  onRemove,
  onUpload,
}) => {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const displayedIconUrl = previewUrl ?? iconUrl;
  const controlsDisabled = disabled || isUpdating;
  let uploadLabel = "upload_icon";
  if (displayedIconUrl) {
    uploadLabel = "replace_icon";
  }
  if (isUpdating) {
    uploadLabel = "uploading";
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {displayedIconUrl ? (
        <img
          alt={t("organization_icon_for", { name })}
          className="h-24 w-24 rounded-2xl border border-gray-200 object-cover shadow-sm dark:border-slate-600"
          data-testid="organization-icon-preview"
          height={96}
          src={displayedIconUrl}
          width={96}
        />
      ) : (
        <div
          aria-label={t("organization_icon_placeholder", { name })}
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#FF85A1] font-bold text-2xl text-white shadow-md shadow-pink-500/20"
          data-testid="organization-icon-placeholder"
          role="img"
        >
          {initials}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-gray-900 text-lg dark:text-slate-100">
          {t("organization_icon")}
        </h4>
        <p className="mt-1 text-gray-500 text-sm dark:text-slate-400">
          {t("organization_icon_description")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className={`inline-flex items-center gap-2 rounded-xl bg-brand-mint px-4 py-2 font-bold text-brand-primary text-sm transition-colors focus-within:ring-2 focus-within:ring-brand-focus/50 dark:bg-brand-accent/20 dark:text-brand-cream ${
              controlsDisabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-[#bfe8c3]"
            }`}
          >
            {isUpdating ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Upload aria-hidden="true" size={16} />
            )}
            {t(uploadLabel)}
            <input
              accept={ORGANIZATION_ICON_ACCEPT}
              className="sr-only"
              data-testid="organization-icon-input"
              disabled={controlsDisabled}
              onChange={async (event) => {
                const selectedFile = event.target.files?.[0];
                event.target.value = "";
                if (!selectedFile) {
                  return;
                }
                if (!isSupportedOrganizationIcon(selectedFile)) {
                  setError(t("organization_icon_requirements"));
                  return;
                }

                const objectUrl = URL.createObjectURL(selectedFile);
                setPreviewUrl(objectUrl);
                setError(undefined);
                try {
                  await onUpload(selectedFile);
                  setPreviewUrl(undefined);
                } catch {
                  setPreviewUrl(undefined);
                }
              }}
              type="file"
            />
          </label>

          {displayedIconUrl && (
            <button
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-bold text-rose-600 text-sm transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
              disabled={controlsDisabled}
              onClick={async () => {
                setError(undefined);
                try {
                  await onRemove();
                  setPreviewUrl(undefined);
                } catch {
                  // The page reports the save error and keeps the current icon.
                }
              }}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              {t("remove_icon")}
            </button>
          )}
        </div>
        <p className="mt-2 text-gray-500 text-xs dark:text-slate-400">
          {t("organization_icon_requirements")}
        </p>
        {error && (
          <p
            aria-live="polite"
            className="mt-1 font-medium text-rose-600 text-xs dark:text-rose-300"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default OrganizationIconField;
