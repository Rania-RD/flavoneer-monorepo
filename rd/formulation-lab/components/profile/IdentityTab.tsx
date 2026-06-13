import { ChevronDown, Loader2, Save, Upload } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type UserProfile } from "../../context/SettingsContext";
import { useTeam } from "../../context/TeamContext";
import type { Id } from "../../convex/_generated/dataModel";

interface IdentityTabProps {
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  uploading: boolean;
}

const IdentityTab: React.FC<IdentityTabProps> = ({
  profile,
  updateProfile,
  uploading,
  handleAvatarUpload,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { teams, activeTeamId, setActiveTeamId } = useTeam();

  // Local state for editing
  const [name, setName] = useState(profile.name || "");
  const [title, setTitle] = useState(profile.title || "");
  const [selectedTeamId, setSelectedTeamId] = useState(activeTeamId ?? "");

  // Sync if profile changes externally (e.g. initial load)
  useEffect(() => {
    setName(profile.name || "");
    setTitle(profile.title || "");
  }, [profile.name, profile.title]);

  // Sync team selection with context
  useEffect(() => {
    setSelectedTeamId(activeTeamId ?? "");
  }, [activeTeamId]);

  const handleSave = () => {
    updateProfile({ name, title });
    if (selectedTeamId && selectedTeamId !== (activeTeamId ?? "")) {
      setActiveTeamId(selectedTeamId as Id<"teams">);
    }
  };

  const hasChanges =
    name !== (profile.name || "") ||
    title !== (profile.title || "") ||
    selectedTeamId !== (activeTeamId ?? "");
  return (
    <div className="fade-in slide-in-from-end-4 animate-in space-y-6 duration-300">
      <div className="mb-8 flex items-center gap-6">
        <div className="relative">
          {uploading ? (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-100 shadow-md dark:border-slate-700 dark:bg-slate-800">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : (
            <img
              alt={t("profile")}
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-700"
              src={
                profile.avatarUrl ||
                `https://api.dicebear.com/9.x/thumbs/svg?seed=${profile.name}`
              }
            />
          )}
          <button
            className="absolute end-0 bottom-0 rounded-full bg-blue-600 p-1.5 text-white shadow-lg transition-transform hover:scale-110 disabled:opacity-50"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload size={14} />
          </button>
          <input
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            ref={fileInputRef}
            type="file"
          />
        </div>
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
          <label className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400">
            {t("fullName")}
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>
        <div>
          <label className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400">
            {t("job_title")}
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
        </div>
        <div>
          <label className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400">
            {t("teamName")}
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pe-10 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onChange={(e) => setSelectedTeamId(e.target.value)}
              value={selectedTeamId}
            >
              <option value="">{t("no_team_selected")}</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
              size={16}
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400">
            {t("emailAddress")}
          </label>
          <input
            className="w-full cursor-not-allowed rounded-xl border border-transparent bg-gray-100 px-4 py-3 text-gray-500 dark:bg-slate-900 dark:text-slate-500"
            disabled
            value={profile.email}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 font-bold text-sm text-white shadow-md transition-transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600"
          disabled={!hasChanges}
          onClick={handleSave}
        >
          <Save size={16} />
          {t("saveChanges")}
        </button>
      </div>
    </div>
  );
};

export default IdentityTab;
