import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "../context/OrganizationContext";
import { authClient } from "../lib/auth-client";
import { publicConfig } from "../lib/runtime-config";

export default function QcFloorHandoff() {
  const { t } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    if (!activeOrganizationId) {
      setError(true);
      return;
    }

    authClient.oneTimeToken
      .generate()
      .then(({ data, error: handoffError }) => {
        if (!active) {
          return;
        }
        if (handoffError || !data?.token) {
          throw new Error("Unable to create the QC floor session handoff");
        }
        const floorUrl = new URL(
          publicConfig.qcFloorUrl ?? "http://localhost:3002"
        );
        floorUrl.searchParams.set("ott", data.token);
        floorUrl.searchParams.set("organizationId", activeOrganizationId);
        window.location.replace(floorUrl.toString());
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [activeOrganizationId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef8eb] px-6 text-center dark:bg-[#0d2b24]">
      <div className="max-w-sm">
        {error ? (
          <p className="font-bold text-[#a43434] dark:text-[#ffb8ad]">
            {t("qc_floor_handoff_failed")}
          </p>
        ) : (
          <>
            <Loader2
              aria-hidden="true"
              className="mx-auto mb-4 animate-spin text-[#f5a623]"
              size={32}
            />
            <p className="font-bold text-[#173e33] dark:text-[#f7f4df]">
              {t("qc_floor_handoff_loading")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
