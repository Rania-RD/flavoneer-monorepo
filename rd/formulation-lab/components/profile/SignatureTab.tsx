import {
  FileSignature,
  Image as ImageIcon,
  Loader2,
  type LucideIcon,
  Save,
  ShieldCheck,
  Type,
  Upload,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "../../context/SettingsContext";

type SignatureMode = "upload" | "text";

const SIGNATURE_FONTS = [
  { label: "dancing_script", value: "Dancing Script, cursive" },
  { label: "great_vibes", value: "Great Vibes, cursive" },
  { label: "caveat", value: "Caveat, cursive" },
  { label: "satisfy", value: "Satisfy, cursive" },
];

interface SignatureTabProps {
  handleSignatureUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  uploading: boolean;
}

const SigModeButton: React.FC<{
  mode: SignatureMode;
  currentMode: SignatureMode;
  setMode: (mode: SignatureMode) => void;
  label: string;
  icon: LucideIcon;
}> = ({ mode, currentMode, setMode, label, icon: Icon }) => (
  <button
    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-xs transition-all ${
      currentMode === mode
        ? "bg-blue-600 text-white shadow-md"
        : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
    }`}
    onClick={() => setMode(mode)}
  >
    <Icon size={14} />
    {label}
  </button>
);

const SignatureTab: React.FC<SignatureTabProps> = ({
  profile,
  updateProfile,
  uploading,
  handleSignatureUpload,
}) => {
  const { t } = useTranslation();
  const signatureFileRef = useRef<HTMLInputElement>(null);

  // Local state
  const [sigMode, setSigMode] = useState<SignatureMode>(
    profile.signatureType ?? "text"
  );
  const [sigText, setSigText] = useState(
    profile.signatureType === "text"
      ? (profile.signatureData ?? profile.name)
      : profile.name
  );
  const [sigFont, setSigFont] = useState(
    profile.signatureFont ?? SIGNATURE_FONTS[0].value
  );

  // NOTE: sigImageUrl is driven by profile.signatureData when in upload mode

  // Sync if profile changes externally
  useEffect(() => {
    // Only strictly sync if we haven't touched it? Or just sync always?
    // For now, let's just sync initial load to ensure we have data
    if (profile.signatureType) {
      setSigMode(profile.signatureType);
    }
  }, [profile.signatureType]);

  const handleSaveTextSignature = () => {
    updateProfile({
      signatureType: "text",
      signatureData: sigText,
      signatureFont: sigFont,
    });
  };

  const hasTextChanges =
    sigText !== profile.signatureData ||
    sigFont !== profile.signatureFont ||
    profile.signatureType !== "text";

  // Render preview of CURRENTLY SAVED signature
  const renderSignaturePreview = () => {
    const type = profile.signatureType;
    const data = profile.signatureData;

    if (!data) {
      return (
        <span className="text-gray-400 text-sm italic dark:text-slate-500">
          {t("no_signature_saved_yet")}
        </span>
      );
    }

    if (type === "upload") {
      return (
        <img alt={t("saved_signature")} className="h-12 object-contain" src={data} />
      );
    }
    // text
    return (
      <span
        className="text-gray-800 dark:text-white"
        style={{
          fontFamily: profile.signatureFont ?? SIGNATURE_FONTS[0].value,
          fontSize: "1.5rem",
        }}
      >
        {data}
      </span>
    );
  };

  return (
    <div className="fade-in slide-in-from-end-4 animate-in space-y-5 duration-300">
      {/* Info banner */}
      <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <ShieldCheck
          className="flex-shrink-0 text-blue-600 dark:text-blue-400"
          size={24}
        />
        <div>
          <h4 className="font-bold text-blue-900 text-sm dark:text-blue-100">
            {t("legally_binding")}
          </h4>
          <p className="mt-1 text-blue-700 text-xs dark:text-blue-300">
            {t("this_digital_signature_will_be_used_to_s")}
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <SigModeButton
          currentMode={sigMode}
          icon={Type}
          label={t("type")}
          mode="text"
          setMode={setSigMode}
        />
        <SigModeButton
          currentMode={sigMode}
          icon={ImageIcon}
          label={t("upload")}
          mode="upload"
          setMode={setSigMode}
        />
      </div>

      {/* ── Text mode ── */}
      {sigMode === "text" && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400">
              {t("signature_text")}
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onChange={(e) => setSigText(e.target.value)}
              placeholder={t("your_name")}
              value={sigText}
            />
          </div>
          <div>
            <label className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400">
              {t("font_style")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SIGNATURE_FONTS.map((f) => (
                <button
                  className={`rounded-xl border px-4 py-3 text-lg transition-all ${
                    sigFont === f.value
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/30 dark:bg-blue-900/30"
                      : "border-gray-200 bg-white hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                  key={f.value}
                  onClick={() => setSigFont(f.value)}
                  style={{ fontFamily: f.value }}
                >
                  {sigText || t("preview_text")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 font-bold text-sm text-white shadow-md transition-transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600"
              disabled={!hasTextChanges}
              onClick={handleSaveTextSignature}
            >
              <Save size={16} />

              {t("save_signature")}
            </button>
          </div>
        </div>
      )}

      {/* ── Upload mode ── */}
      {sigMode === "upload" && (
        <div className="space-y-3">
          <input
            accept="image/png,image/svg+xml,image/jpeg"
            className="hidden"
            onChange={handleSignatureUpload}
            ref={signatureFileRef}
            type="file"
          />
          {profile.signatureType === "upload" && profile.signatureData ? (
            <div className="group relative">
              <div className="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <img
                  alt={t("uploaded_signature")}
                  className="max-h-28 object-contain"
                  src={profile.signatureData}
                />
              </div>
              <button
                className="absolute end-2 top-2 rounded-xl border border-gray-200 bg-white p-2 opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:border-slate-600 dark:bg-slate-700"
                disabled={uploading}
                onClick={() => signatureFileRef.current?.click()}
              >
                <Upload
                  className="text-gray-600 dark:text-slate-300"
                  size={14}
                />
              </button>
            </div>
          ) : (
            <button
              className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-gray-300 border-dashed text-gray-400 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
              disabled={uploading}
              onClick={() => signatureFileRef.current?.click()}
            >
              {uploading ? (
                <Loader2
                  className="mb-2 animate-spin text-blue-500"
                  size={32}
                />
              ) : (
                <FileSignature className="mb-2" size={32} />
              )}
              <span className="font-medium text-sm">
                {uploading ? t("uploading") : t("click_to_upload_signature_image")}
              </span>
              <span className="text-xs opacity-70">
                {t("png_jpeg_or_svg_with_transparent_backgro")}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Current saved signature preview */}
      <div className="flex items-center justify-between border-gray-200 border-t pt-2 dark:border-slate-700">
        <span className="font-bold text-gray-500 text-sm dark:text-slate-400">
          {t("current_signature")}
        </span>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          {renderSignaturePreview()}
        </div>
      </div>
    </div>
  );
};

export default SignatureTab;
