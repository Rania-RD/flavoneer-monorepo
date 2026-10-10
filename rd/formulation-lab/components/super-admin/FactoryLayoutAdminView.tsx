import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Boxes,
  Factory,
  Link2,
  Loader2,
  Map,
  RotateCcw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  cloneFactoryLayout,
  type FactoryLayoutConnection,
  type FactoryLayoutDefinition,
  type FactoryLayoutMachine,
  type FactoryLayoutZone,
  factoryAssetLabels,
  factoryMachineAssetKeys,
  referenceFactoryLayout,
} from "../../lib/factory-layout";

interface OrganizationOption {
  _id: Id<"organizations">;
  name: string;
}

const cardClass =
  "rounded-[2rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/95 shadow-[0_18px_45px_rgba(16,47,39,0.07)] dark:border-[#d2f2d4]/10 dark:bg-[#143d32]/95";
const inputClass =
  "w-full rounded-xl border border-[#1c4a3c]/12 bg-[#eef8eb]/75 px-3 py-2 text-[#173e33] text-sm outline-none focus:border-[#ff7738]/60 focus:ring-4 focus:ring-[#ff7738]/10 dark:border-[#d2f2d4]/10 dark:bg-[#102f27] dark:text-[#f7f4df]";

type SuperAdminLayoutResult = FunctionReturnType<
  typeof api.factoryLayouts.getForSuperAdmin
>;
type SavedFactoryLayout = NonNullable<SuperAdminLayoutResult["layout"]>;

function normalizeLayout(layout: SavedFactoryLayout): FactoryLayoutDefinition {
  return {
    name: layout.name,
    machines: layout.machines.map(
      ({
        machineKey,
        assetKey,
        label,
        color,
        positionX,
        positionY,
        positionZ,
        rotationY,
        scale,
        sortOrder,
        visible,
      }) => ({
        machineKey,
        assetKey,
        label,
        color,
        positionX,
        positionY,
        positionZ,
        rotationY,
        scale,
        sortOrder,
        visible,
      })
    ),
    connections: layout.connections.map(
      ({
        connectionKey,
        kind,
        fromMachineKey,
        toMachineKey,
        color,
        height,
        sortOrder,
        visible,
      }) => ({
        connectionKey,
        kind,
        fromMachineKey,
        toMachineKey,
        color,
        height,
        sortOrder,
        visible,
      })
    ),
    zones: layout.zones.map(
      ({
        zoneKey,
        label,
        color,
        positionX,
        positionZ,
        width,
        depth,
        sortOrder,
        visible,
      }) => ({
        zoneKey,
        label,
        color,
        positionX,
        positionZ,
        width,
        depth,
        sortOrder,
        visible,
      })
    ),
  };
}

export function FactoryLayoutAdminView({
  organizations,
}: {
  organizations: OrganizationOption[];
}) {
  const { t } = useTranslation();
  const [organizationId, setOrganizationId] =
    useState<Id<"organizations"> | null>(organizations[0]?._id ?? null);
  const [draft, setDraft] = useState<FactoryLayoutDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const current = useQuery(
    api.factoryLayouts.getForSuperAdmin,
    organizationId ? { organizationId } : "skip"
  );
  const saveLayout = useMutation(api.factoryLayouts.saveForOrganization);

  useEffect(() => {
    if (!organizationId && organizations[0]) {
      setOrganizationId(organizations[0]._id);
    }
  }, [organizationId, organizations]);

  useEffect(() => {
    if (current === undefined) {
      return;
    }
    setDraft(
      current.layout
        ? normalizeLayout(current.layout)
        : cloneFactoryLayout(referenceFactoryLayout)
    );
  }, [current]);

  const updateMachine = (
    index: number,
    updates: Partial<FactoryLayoutMachine>
  ) => {
    setDraft((value) =>
      value
        ? {
            ...value,
            machines: value.machines.map((machine, machineIndex) =>
              machineIndex === index ? { ...machine, ...updates } : machine
            ),
          }
        : value
    );
  };
  const updateConnection = (
    index: number,
    updates: Partial<FactoryLayoutConnection>
  ) => {
    setDraft((value) =>
      value
        ? {
            ...value,
            connections: value.connections.map((connection, connectionIndex) =>
              connectionIndex === index
                ? { ...connection, ...updates }
                : connection
            ),
          }
        : value
    );
  };
  const updateZone = (index: number, updates: Partial<FactoryLayoutZone>) => {
    setDraft((value) =>
      value
        ? {
            ...value,
            zones: value.zones.map((zone, zoneIndex) =>
              zoneIndex === index ? { ...zone, ...updates } : zone
            ),
          }
        : value
    );
  };

  const handleSave = async () => {
    if (!(organizationId && draft)) {
      return;
    }
    setSaving(true);
    try {
      await saveLayout({ organizationId, ...draft });
      toast.success(t("factory_layout_saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("factory_layout_save_failed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#1c4a3c] dark:text-[#f5a623]">
              <Factory size={20} />
              <h2 className="font-display font-semibold text-2xl">
                {t("factory_layout_admin_title")}
              </h2>
            </div>
            <p className="mt-2 max-w-3xl text-[#6f8e82] text-sm leading-6 dark:text-[#a9cbbb]">
              {t("factory_layout_admin_subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-64 text-start font-bold text-[#527568] text-xs dark:text-[#a9cbbb]">
              {t("organization")}
              <select
                className={`${inputClass} mt-1`}
                onChange={(event) =>
                  setOrganizationId(event.target.value as Id<"organizations">)
                }
                value={organizationId ?? ""}
              >
                {organizations.map((organization) => (
                  <option key={organization._id} value={organization._id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1c4a3c]/15 px-4 py-2.5 font-bold text-[#1c4a3c] text-sm dark:border-[#d2f2d4]/10 dark:text-[#d2f2d4]"
              onClick={() => setDraft(cloneFactoryLayout(referenceFactoryLayout))}
              type="button"
            >
              <RotateCcw size={16} />
              {t("factory_layout_load_reference")}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1c4a3c] px-5 py-2.5 font-bold text-sm text-white disabled:opacity-60 dark:bg-[#f5a623] dark:text-[#173e33]"
              disabled={!draft || saving}
              onClick={handleSave}
              type="button"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {t("factory_layout_assign")}
            </button>
          </div>
        </div>
      </div>

      {current === undefined || !draft ? (
        <div className={`${cardClass} grid min-h-72 place-items-center`}>
          <Loader2 className="animate-spin text-[#1c4a3c] dark:text-[#f5a623]" />
        </div>
      ) : (
        <>
          <div className={`${cardClass} p-5`}>
            <label className="block font-bold text-[#527568] text-xs dark:text-[#a9cbbb]">
              {t("factory_layout_name")}
              <input
                className={`${inputClass} mt-1 max-w-xl`}
                onChange={(event) =>
                  setDraft((value) =>
                    value ? { ...value, name: event.target.value } : value
                  )
                }
                value={draft.name}
              />
            </label>
          </div>

          <div className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center gap-3 border-[#1c4a3c]/10 border-b px-5 py-4 dark:border-[#d2f2d4]/10">
              <Boxes className="text-[#f5a623]" size={19} />
              <h3 className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                {t("factory_layout_machines")}
              </h3>
              <span className="rounded-full bg-[#eef8eb] px-2 py-1 font-mono text-[10px] dark:bg-[#102f27]">
                {draft.machines.length}
              </span>
            </div>
            <div className="divide-y divide-[#1c4a3c]/8 dark:divide-[#d2f2d4]/8">
              {draft.machines.map((machine, index) => (
                <div
                  className="grid gap-3 p-4 md:grid-cols-[auto_minmax(180px,1.3fr)_minmax(170px,1fr)_72px_repeat(4,minmax(78px,.55fr))] md:items-end"
                  key={machine.machineKey}
                >
                  <label className="flex items-center gap-2 self-center font-bold text-[#527568] text-xs dark:text-[#a9cbbb]">
                    <input
                      checked={machine.visible}
                      onChange={(event) =>
                        updateMachine(index, { visible: event.target.checked })
                      }
                      type="checkbox"
                    />
                    {t("visible")}
                  </label>
                  <label className="font-bold text-[#527568] text-[11px] dark:text-[#a9cbbb]">
                    {t("name")}
                    <input
                      className={`${inputClass} mt-1`}
                      onChange={(event) =>
                        updateMachine(index, { label: event.target.value })
                      }
                      value={machine.label}
                    />
                  </label>
                  <label className="font-bold text-[#527568] text-[11px] dark:text-[#a9cbbb]">
                    {t("factory_layout_model")}
                    <select
                      className={`${inputClass} mt-1`}
                      onChange={(event) =>
                        updateMachine(index, {
                          assetKey: event.target
                            .value as FactoryLayoutMachine["assetKey"],
                        })
                      }
                      value={machine.assetKey}
                    >
                      {factoryMachineAssetKeys.map((assetKey) => (
                        <option key={assetKey} value={assetKey}>
                          {factoryAssetLabels[assetKey]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="font-bold text-[#527568] text-[11px] dark:text-[#a9cbbb]">
                    {t("color")}
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-[#1c4a3c]/12 bg-transparent p-1"
                      onChange={(event) =>
                        updateMachine(index, { color: event.target.value })
                      }
                      type="color"
                      value={machine.color}
                    />
                  </label>
                  {([
                    ["X", "positionX", machine.positionX],
                    ["Z", "positionZ", machine.positionZ],
                    [t("scale"), "scale", machine.scale],
                    [t("rotation"), "rotationY", machine.rotationY],
                  ] as const).map(([label, key, value]) => (
                    <label
                      className="font-bold text-[#527568] text-[11px] dark:text-[#a9cbbb]"
                      key={key}
                    >
                      {label}
                      <input
                        className={`${inputClass} mt-1`}
                        onChange={(event) =>
                          updateMachine(index, {
                            [key]: Number(event.target.value),
                          })
                        }
                        step="0.1"
                        type="number"
                        value={value}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center gap-3 border-[#1c4a3c]/10 border-b px-5 py-4 dark:border-[#d2f2d4]/10">
                <Link2 className="text-[#ff7738]" size={19} />
                <h3 className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                  {t("factory_layout_connections")}
                </h3>
              </div>
              <div className="max-h-[34rem] divide-y divide-[#1c4a3c]/8 overflow-y-auto dark:divide-[#d2f2d4]/8">
                {draft.connections.map((connection, index) => (
                  <div className="grid grid-cols-2 gap-3 p-4" key={connection.connectionKey}>
                    <label className="col-span-2 flex items-center gap-2 font-bold text-[#527568] text-xs dark:text-[#a9cbbb]">
                      <input
                        checked={connection.visible}
                        onChange={(event) =>
                          updateConnection(index, { visible: event.target.checked })
                        }
                        type="checkbox"
                      />
                      {connection.connectionKey}
                    </label>
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        updateConnection(index, {
                          kind: event.target.value as FactoryLayoutConnection["kind"],
                        })
                      }
                      value={connection.kind}
                    >
                      <option value="pipe">{t("factory_connection_pipe")}</option>
                      <option value="conveyor">{t("factory_connection_conveyor")}</option>
                      <option value="materialFlow">{t("factory_connection_flow")}</option>
                    </select>
                    <input
                      className="h-10 w-full rounded-xl border border-[#1c4a3c]/12 bg-transparent p-1"
                      onChange={(event) =>
                        updateConnection(index, { color: event.target.value })
                      }
                      type="color"
                      value={connection.color}
                    />
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        updateConnection(index, {
                          fromMachineKey: event.target.value,
                        })
                      }
                      value={connection.fromMachineKey}
                    >
                      {draft.machines.map((machine) => (
                        <option key={machine.machineKey} value={machine.machineKey}>
                          {machine.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        updateConnection(index, {
                          toMachineKey: event.target.value,
                        })
                      }
                      value={connection.toMachineKey}
                    >
                      {draft.machines.map((machine) => (
                        <option key={machine.machineKey} value={machine.machineKey}>
                          {machine.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center gap-3 border-[#1c4a3c]/10 border-b px-5 py-4 dark:border-[#d2f2d4]/10">
                <Map className="text-[#73a9c2]" size={19} />
                <h3 className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                  {t("factory_layout_zones")}
                </h3>
              </div>
              <div className="divide-y divide-[#1c4a3c]/8 dark:divide-[#d2f2d4]/8">
                {draft.zones.map((zone, index) => (
                  <div className="grid grid-cols-[auto_1fr_72px] gap-3 p-4" key={zone.zoneKey}>
                    <input
                      checked={zone.visible}
                      className="self-center"
                      onChange={(event) =>
                        updateZone(index, { visible: event.target.checked })
                      }
                      type="checkbox"
                    />
                    <input
                      className={inputClass}
                      onChange={(event) =>
                        updateZone(index, { label: event.target.value })
                      }
                      value={zone.label}
                    />
                    <input
                      className="h-10 w-full rounded-xl border border-[#1c4a3c]/12 bg-transparent p-1"
                      onChange={(event) =>
                        updateZone(index, { color: event.target.value })
                      }
                      type="color"
                      value={zone.color}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
