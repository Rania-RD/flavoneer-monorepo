import { useMutation } from "convex/react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@flavoneer/backend/api";

const Invite = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const acceptInvite = useMutation(api.organizationInvites.accept);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    if (!token) {
      setError(t("inviteInvalid"));
      return;
    }

    setIsAccepting(true);
    setError("");
    try {
      await acceptInvite({ token });
      setAccepted(true);
    } catch {
      setError(t("inviteAcceptFailed"));
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-950/10 bg-white p-8 text-center shadow-xl shadow-emerald-950/5 dark:border-white/10 dark:bg-slate-800">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          {accepted ? (
            <CheckCircle2
              className="text-emerald-700 dark:text-emerald-300"
              size={28}
            />
          ) : (
            <Mail
              className="text-emerald-700 dark:text-emerald-300"
              size={28}
            />
          )}
        </div>
        <h1 className="font-bold text-2xl text-gray-900 dark:text-slate-100">
          {accepted ? t("inviteAcceptedTitle") : t("workspaceInvitation")}
        </h1>
        <p className="mt-2 text-gray-500 text-sm dark:text-slate-400">
          {accepted ? t("inviteAcceptedBody") : t("workspaceInvitationBody")}
        </p>

        {error ? (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-red-700 text-sm dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {accepted ? (
          <button
            className="mt-6 w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-sm text-white transition-colors hover:bg-emerald-700"
            onClick={() => navigate("/")}
          >
            {t("openWorkspace")}
          </button>
        ) : (
          <button
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-sm text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isAccepting || !token}
            onClick={handleAccept}
          >
            {isAccepting ? <Loader2 className="animate-spin" size={17} /> : null}
            {isAccepting ? t("acceptingInvite") : t("acceptInvitation")}
          </button>
        )}
      </div>
    </div>
  );
};

export default Invite;
