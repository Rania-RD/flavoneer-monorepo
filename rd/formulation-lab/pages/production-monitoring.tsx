import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import {
  ArrowUpRight,
  Boxes,
  Expand,
  Factory,
  Gauge,
  Loader2,
  Maximize2,
  Minimize2,
  MousePointer2,
  Orbit,
  Route,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FactoryDigitalTwin } from "../components/production-monitoring/FactoryDigitalTwin";
import { useOrganization } from "../context/OrganizationContext";
import {
  type FactoryLayoutDefinition,
  referenceFactoryLayout,
} from "../lib/factory-layout";

const panelClass =
  "rounded-[2rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/95 shadow-[0_22px_60px_rgba(16,47,39,0.09)] dark:border-[#d2f2d4]/10 dark:bg-[#143d32]/95";

export default function ProductionMonitoring() {
  const { t } = useTranslation();
  const { activeOrganizationId, organizations, organizationsLoading } =
    useOrganization();
  const layout = useQuery(
    api.factoryLayouts.getForOrganization,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );
  const [selectedMachineKey, setSelectedMachineKey] = useState<string | null>(
    null
  );
  const [isFullScreen, setIsFullScreen] = useState(false);
  const handleSelectMachine = useCallback((machineKey: string | null) => {
    setSelectedMachineKey(machineKey);
  }, []);

  const definition = useMemo<FactoryLayoutDefinition>(() => {
    if (!layout) {
      return referenceFactoryLayout;
    }
    return {
      name: layout.name,
      machines: layout.machines,
      connections: layout.connections,
      zones: layout.zones,
    };
  }, [layout]);
  const selectedMachine = definition.machines.find(
    (machine) => machine.machineKey === selectedMachineKey
  );
  const activeOrganization = organizations.find(
    (organization) => organization._id === activeOrganizationId
  );

  if (organizationsLoading || (activeOrganizationId && layout === undefined)) {
    return (
      <div className="grid min-h-[70dvh] place-items-center">
        <Loader2 className="animate-spin text-[#1c4a3c] dark:text-[#f5a623]" />
      </div>
    );
  }

  if (!activeOrganizationId) {
    return (
      <section className={`${panelClass} grid min-h-[28rem] place-items-center p-8 text-center`}>
        <div>
          <Factory className="mx-auto text-[#f5a623]" size={44} />
          <h1 className="mt-4 font-display font-semibold text-3xl text-[#173e33] dark:text-[#f7f4df]">
            {t("factory_layout_no_organization")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[#6f8e82] dark:text-[#a9cbbb]">
            {t("factory_layout_no_organization_help")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <div
      className={
        isFullScreen
          ? "fixed inset-0 z-[80] overflow-y-auto bg-[#eef8eb] p-3 dark:bg-[#0d2b24] sm:p-5"
          : "space-y-5"
      }
    >
      <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#173e33] px-3 py-1.5 font-bold text-[10px] text-white uppercase tracking-[0.15em] dark:bg-[#f5a623] dark:text-[#173e33]">
              <Factory size={13} />
              {t("production_digital_twin")}
            </span>
            <span className="rounded-full bg-[#d2f2d4] px-3 py-1.5 font-bold text-[#1c4a3c] text-[10px] uppercase tracking-[0.12em] dark:bg-[#285b4d] dark:text-[#d2f2d4]">
              {activeOrganization?.name}
            </span>
            {!layout && (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 font-bold text-[10px] text-amber-800 uppercase tracking-[0.12em] dark:bg-amber-900/35 dark:text-amber-200">
                {t("factory_layout_reference_preview")}
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display font-semibold text-3xl text-[#173e33] tracking-tight sm:text-4xl dark:text-[#f7f4df]">
            {definition.name}
          </h1>
          <p className="mt-2 max-w-3xl text-[#5f7c71] text-sm leading-6 dark:text-[#a9cbbb]">
            {t("production_monitoring_3d_subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center gap-2 rounded-2xl border border-[#1c4a3c]/15 bg-[#fffdf4] px-4 py-3 font-bold text-[#1c4a3c] text-sm transition hover:-translate-y-0.5 dark:border-[#d2f2d4]/10 dark:bg-[#143d32] dark:text-[#d2f2d4]"
            to="/quality/production-line-records"
          >
            <Gauge size={17} />
            {t("production_inspection_records")}
            <ArrowUpRight className="rtl:-scale-x-100" size={16} />
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1c4a3c] px-4 py-3 font-bold text-sm text-white transition hover:-translate-y-0.5 dark:bg-[#f5a623] dark:text-[#173e33]"
            onClick={() => setIsFullScreen((current) => !current)}
            type="button"
          >
            {isFullScreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            {t(isFullScreen ? "exit_full_screen" : "full_screen")}
          </button>
        </div>
      </header>

      <section
        className={`${panelClass} overflow-hidden ${isFullScreen ? "mt-5" : ""}`}
      >
        <div className="grid border-[#1c4a3c]/10 border-b bg-[#eef8eb]/75 sm:grid-cols-3 dark:border-[#d2f2d4]/10 dark:bg-[#102f27]/75">
          {[
            {
              icon: Boxes,
              label: t("factory_layout_machines"),
              value: definition.machines.filter((machine) => machine.visible)
                .length,
            },
            {
              icon: Route,
              label: t("factory_layout_connections"),
              value: definition.connections.filter(
                (connection) => connection.visible
              ).length,
            },
            {
              icon: Expand,
              label: t("factory_layout_zones"),
              value: definition.zones.filter((zone) => zone.visible).length,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              className="flex items-center gap-3 border-[#1c4a3c]/10 border-b px-5 py-3 last:border-b-0 sm:border-e sm:border-b-0 sm:last:border-e-0 rtl:sm:border-e-0 rtl:sm:border-s dark:border-[#d2f2d4]/10"
              key={label}
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[#d2f2d4] text-[#1c4a3c] dark:bg-[#285b4d] dark:text-[#d2f2d4]">
                <Icon size={17} />
              </span>
              <div>
                <p className="font-bold text-[#173e33] text-lg leading-none dark:text-[#f7f4df]">
                  {value}
                </p>
                <p className="mt-1 text-[#6f8e82] text-xs dark:text-[#a9cbbb]">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`relative overflow-hidden bg-[#102f27] ${
            isFullScreen ? "h-[calc(100dvh-15rem)] min-h-[34rem]" : "h-[68dvh] min-h-[34rem] max-h-[52rem]"
          }`}
        >
          <FactoryDigitalTwin
            connections={definition.connections}
            machines={definition.machines}
            onSelectMachine={handleSelectMachine}
            selectedMachineKey={selectedMachineKey}
            zones={definition.zones}
          />

          <div className="pointer-events-none absolute start-4 top-4 flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-[#0d2b24]/80 px-3 py-2 font-bold text-[11px] text-white shadow-lg backdrop-blur-md">
              <Orbit size={14} />
              {t("factory_layout_orbit_hint")}
            </span>
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-[#0d2b24]/80 px-3 py-2 font-bold text-[11px] text-white shadow-lg backdrop-blur-md">
              <MousePointer2 size={14} />
              {t("factory_layout_select_hint")}
            </span>
          </div>

          <div className="absolute end-4 bottom-4 max-w-[20rem] rounded-[1.35rem] border border-white/10 bg-[#0d2b24]/88 p-4 text-white shadow-2xl backdrop-blur-lg">
            {selectedMachine ? (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 rounded-full shadow-[0_0_18px_currentColor]"
                    style={{ backgroundColor: selectedMachine.color }}
                  />
                  <p className="font-bold text-sm">{selectedMachine.label}</p>
                </div>
                <p className="mt-2 text-white/60 text-xs">
                  {t("factory_layout_asset_type")}: {selectedMachine.assetKey}
                </p>
              </>
            ) : (
              <p className="text-white/70 text-xs leading-5">
                {t("factory_layout_select_machine_help")}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
