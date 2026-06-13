import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { useToast } from "../hooks/useToast";

const ShareTarget: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const redeemLink = useMutation(api.sharedLinks.redeemLink);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const redeem = async () => {
      try {
        const result = await redeemLink({ token });
        if (result) {
          toast.success(t("shared_link_access_granted"));
          if (result.entityType === "project") {
            navigate(`/project/${result.entityId}?tab=formulation`, {
              replace: true,
            });
          } else {
            navigate(`/run/${result.entityId}`, { replace: true });
          }
        } else {
          setError("Link redemption failed.");
        }
      } catch (err: unknown) {
        console.error("Redemption error:", err);
        const message =
          err instanceof Error ? err.message : "Invalid or expired link";
        setError(message);
      }
    };

    redeem();
  }, [token, redeemLink, navigate, toast.success]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFCF6] px-4 text-center dark:bg-slate-900">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-900/50 dark:bg-red-900/20">
          <h2 className="mb-2 font-bold text-2xl text-red-700 dark:text-red-400">
            {t("access_denied")}
          </h2>
          <p className="mb-6 text-red-600 dark:text-red-300">{error}</p>
          <button
            className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
            onClick={() => navigate("/")}
            type="button"
          >
            {t("go_to_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFCF6] dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100/50 dark:bg-blue-900/30">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="font-bold text-slate-800 text-xl dark:text-white">
          {t("verifying_access")}
        </h2>
        <p className="font-medium text-slate-500 text-sm">
          {t("please_wait_while_we_validate_your_secur")}
        </p>
      </div>
    </div>
  );
};

export default ShareTarget;
