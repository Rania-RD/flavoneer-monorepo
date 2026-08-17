import { Save } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "../../context/SettingsContext";
import UserAvatar from "../user-avatar";

interface IdentityTabProps {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const IdentityTab: React.FC<IdentityTabProps> = ({
  profile,
  updateProfile,
}) => {
  const { t } = useTranslation();

  // Local state for editing
  const [name, setName] = useState(profile.name || "");
  const [title, setTitle] = useState(profile.title || "");

  // Sync if profile changes externally (e.g. initial load)
  useEffect(() => {
    setName(profile.name || "");
    setTitle(profile.title || "");
  }, [profile.name, profile.title]);

  const handleSave = () => {
    updateProfile({ name, title });
  };

  const hasChanges =
    name !== (profile.name || "") || title !== (profile.title || "");
  return (
    <div className="fade-in slide-in-from-end-4 animate-in space-y-6 duration-300">
      <div className="mb-8 flex items-center gap-6">
        <UserAvatar
          className="border-4 border-white shadow-md dark:border-slate-700"
          name={profile.name}
          seed={profile.email}
          size={96}
          testId="identity-profile-avatar"
        />
        <div>
          <h3 className="font-bold text-gray-900 text-lg dark:text-white">
            {profile.name}
          </h3>
          <p className="text-gray-500 text-sm dark:text-slate-400">
            {profile.title}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400"
            htmlFor="profile-full-name"
          >
            {t("fullName")}
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-brand-focus/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            id="profile-full-name"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>
        <div>
          <label
            className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400"
            htmlFor="profile-job-title"
          >
            {t("job_title")}
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-brand-focus/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            id="profile-job-title"
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
        </div>
        <div>
          <label
            className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400"
            htmlFor="profile-email"
          >
            {t("emailAddress")}
          </label>
          <input
            className="w-full cursor-not-allowed rounded-xl border border-transparent bg-gray-100 px-4 py-3 text-gray-500 dark:bg-slate-900 dark:text-slate-500"
            disabled
            id="profile-email"
            value={profile.email}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 font-bold text-sm text-white shadow-md transition-transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-accent"
          disabled={!hasChanges}
          onClick={handleSave}
          type="button"
        >
          <Save size={16} />
          {t("saveChanges")}
        </button>
      </div>
    </div>
  );
};

export default IdentityTab;
