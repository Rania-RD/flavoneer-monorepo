import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { CheckCircle2, Factory, Loader2, Save, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "../../context/OrganizationContext";
import { getUserTimezone } from "../../lib/timezones";
import {
  emptyLimits,
  type HallCode,
  type LimitDraft,
  type ReadingKey,
  readingKeys,
} from "./production-line-settings-model";
import { TimezoneSelect } from "./TimezoneSelect";

const messageKeys = {
  error: "production_setup_error",
  settings: "line_settings_saved",
  specification: "specification_published",
} as const;

export default function ProductionLineSettingsSection() {
  const { t, i18n } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const settings = useQuery(
    api.productionLineSettings.get,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );
  const { results: products } = usePaginatedQuery(
    api.projects.listByOrganization,
    activeOrganizationId
      ? { organizationId: activeOrganizationId, language: i18n.language === "ar" ? "ar" : "en" }
      : "skip",
    { initialNumItems: 100 }
  );
  const upsertSettings = useMutation(api.productionLineSettings.upsert);
  const initializeHallSerial = useMutation(
    api.productionLineSettings.initializeHallSerial
  );
  const createSpecificationDraft = useMutation(
    api.productionLineSpecifications.createDraft
  );
  const updateLimit = useMutation(api.productionLineSpecifications.updateLimit);
  const publishSpecification = useMutation(
    api.productionLineSpecifications.publish
  );
  const [timezone, setTimezone] = useState<string>(getUserTimezone);
  const [enabledHalls, setEnabledHalls] = useState<HallCode[]>(["A", "B"]);
  const [serials, setSerials] = useState({ A: "1126", B: "1233" });
  const [productId, setProductId] = useState<Id<"projects"> | null>(null);
  const [limits, setLimits] = useState(emptyLimits);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingSpecification, setIsSavingSpecification] = useState(false);
  const [message, setMessage] = useState<
    "settings" | "specification" | "error" | null
  >(null);

  useEffect(() => {
    if (settings) {
      setTimezone(settings.timezone);
      setEnabledHalls(settings.enabledHallCodes);
    }
  }, [settings]);

  useEffect(() => {
    if (!productId && products[0]) {
      setProductId(products[0]._id);
    }
  }, [productId, products]);

  const specifications = useQuery(
    api.productionLineSpecifications.listByProduct,
    activeOrganizationId && productId ? { organizationId: activeOrganizationId, productId } : "skip"
  );
  const draftSpecification = useQuery(
    api.productionLineSpecifications.getDraftForProduct,
    activeOrganizationId && productId ? { organizationId: activeOrganizationId, productId } : "skip"
  );
  const activeVersion = specifications?.find(
    (item) => item.status === "active"
  );

  useEffect(() => {
    if (!draftSpecification) {
      setLimits(emptyLimits());
      return;
    }
    const next = emptyLimits();
    for (const limit of draftSpecification.limits) {
      next[limit.readingKey] = {
        minimum: String(limit.minimum),
        maximum: String(limit.maximum),
        target: limit.target === undefined ? "" : String(limit.target),
        minimumReadingCount: String(limit.minimumReadingCount),
        unit: limit.unit,
      };
    }
    setLimits(next);
  }, [draftSpecification]);

  const counterByHall = useMemo(
    () =>
      new Map(
        settings?.hallCounters.map((counter) => [counter.hallCode, counter])
      ),
    [settings]
  );

  if (!activeOrganizationId) {
    return null;
  }

  const saveLineSettings = async () => {
    setIsSavingSettings(true);
    setMessage(null);
    try {
      await upsertSettings({
        organizationId: activeOrganizationId,
        timezone,
        enabledHallCodes: enabledHalls,
      });
      setMessage("settings");
    } catch {
      setMessage("error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const initializeCounter = async (hallCode: HallCode) => {
    setMessage(null);
    try {
      await initializeHallSerial({
        organizationId: activeOrganizationId,
        hallCode,
        nextSequence: Number(serials[hallCode]),
      });
      setMessage("settings");
    } catch {
      setMessage("error");
    }
  };

  const createDraft = async () => {
    if (!productId) {
      return;
    }
    setMessage(null);
    try {
      await createSpecificationDraft({ organizationId: activeOrganizationId, productId });
    } catch {
      setMessage("error");
    }
  };

  const saveAndPublish = async () => {
    if (!draftSpecification) {
      return;
    }
    setIsSavingSpecification(true);
    setMessage(null);
    try {
      for (const readingKey of readingKeys) {
        const limit = limits[readingKey];
        await updateLimit({
          specificationId: draftSpecification._id,
          readingKey,
          unit: limit.unit,
          minimum: Number(limit.minimum),
          maximum: Number(limit.maximum),
          target: limit.target === "" ? undefined : Number(limit.target),
          minimumReadingCount: Number(limit.minimumReadingCount),
        });
      }
      await publishSpecification({ specificationId: draftSpecification._id });
      setMessage("specification");
    } catch {
      setMessage("error");
    } finally {
      setIsSavingSpecification(false);
    }
  };

  const updateLimitField = (
    readingKey: ReadingKey,
    field: keyof LimitDraft,
    value: string
  ) => {
    setLimits((current) => ({
      ...current,
      [readingKey]: { ...current[readingKey], [field]: value },
    }));
  };

  return (
    <section className="mt-6 overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-sm dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
      <div className="border-[#1c4a3c]/10 border-b p-8 dark:border-[#d2f2d4]/10">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-xl bg-[#d2f2d4] p-2 dark:bg-[#285b4d]">
            <Factory
              aria-hidden="true"
              className="text-[#1c4a3c] dark:text-[#f5a623]"
              size={24}
            />
          </div>
          <h3 className="font-bold text-[#173e33] text-xl dark:text-[#f7f4df]">
            {t("production_line_settings")}
          </h3>
        </div>
        <p className="text-[#527568] text-sm dark:text-[#a9cbbb]">
          {t("production_line_settings_subtitle")}
        </p>
      </div>

      <div className="space-y-8 p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <TimezoneSelect onChange={setTimezone} value={timezone} />
          <div>
            <p className="mb-2 font-bold text-[#527568] text-xs uppercase tracking-wider dark:text-[#a9cbbb]">
              {t("enabled_halls")}
            </p>
            <div className="flex gap-2">
              {(["A", "B"] as HallCode[]).map((hall) => (
                <button
                  className={`min-h-12 flex-1 rounded-[1rem] border font-bold transition-all ${
                    enabledHalls.includes(hall)
                      ? "border-[#1c4a3c] bg-[#d2f2d4] text-[#173e33] dark:border-[#f5a623] dark:bg-[#f5a623]"
                      : "border-[#1c4a3c]/10 text-[#527568] dark:border-[#d2f2d4]/10 dark:text-[#a9cbbb]"
                  }`}
                  key={hall}
                  onClick={() =>
                    setEnabledHalls((current) =>
                      current.includes(hall)
                        ? current.filter((value) => value !== hall)
                        : [...current, hall]
                    )
                  }
                  type="button"
                >
                  {hall}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            className="production-primary-button"
            disabled={isSavingSettings}
            onClick={saveLineSettings}
            type="button"
          >
            {isSavingSettings ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            {t("save_line_settings")}
          </button>
        </div>

        <div className="grid gap-4 border-[#1c4a3c]/10 border-t pt-7 sm:grid-cols-2 dark:border-[#d2f2d4]/10">
          {(["A", "B"] as HallCode[]).map((hall) => {
            const counter = counterByHall.get(hall);
            return (
              <div
                className="rounded-[1.5rem] bg-[#eef8eb] p-5 dark:bg-[#285b4d]"
                key={hall}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
                      {t("production_hall")} {hall}
                    </p>
                    {counter?.nextSequence ? (
                      <p className="mt-1 text-[#527568] text-sm dark:text-[#a9cbbb]">
                        {t("next_sequence")}: {counter.nextSequence}
                      </p>
                    ) : null}
                  </div>
                  {counter?.nextSequence ? (
                    <CheckCircle2 className="text-[#247a51]" size={23} />
                  ) : null}
                </div>
                {counter?.nextSequence ? null : (
                  <div className="mt-4 flex gap-2">
                    <input
                      className="production-setting-input min-w-0 flex-1"
                      min="1"
                      onChange={(event) =>
                        setSerials((current) => ({
                          ...current,
                          [hall]: event.target.value,
                        }))
                      }
                      type="number"
                      value={serials[hall]}
                    />
                    <button
                      className="production-secondary-button"
                      onClick={() => initializeCounter(hall)}
                      type="button"
                    >
                      {t("initialize_serial")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-[#1c4a3c]/10 border-t pt-7 dark:border-[#d2f2d4]/10">
          <div className="mb-5 flex items-center gap-3">
            <Settings2 className="text-[#f5a623]" size={22} />
            <h4 className="font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
              {t("product_business_limits")}
            </h4>
          </div>
          {products.length === 0 ? (
            <p className="text-[#527568] text-sm dark:text-[#a9cbbb]">
              {t("no_products_for_specification")}
            </p>
          ) : (
            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="font-bold text-[#527568] text-xs uppercase tracking-wider dark:text-[#a9cbbb]">
                  {t("select_product")}
                </span>
                <select
                  className="production-setting-input"
                  onChange={(event) =>
                    setProductId(event.target.value as Id<"projects">)
                  }
                  value={productId ?? ""}
                >
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] bg-[#eef8eb] p-4 dark:bg-[#285b4d]">
                <span className="text-[#527568] text-sm dark:text-[#a9cbbb]">
                  {t("active_version")}: {activeVersion?.version ?? "—"}
                </span>
                {draftSpecification ? null : (
                  <button
                    className="production-secondary-button"
                    onClick={createDraft}
                    type="button"
                  >
                    {t("create_specification_draft")}
                  </button>
                )}
              </div>
              {draftSpecification ? (
                <>
                  <div className="space-y-3">
                    {readingKeys.map((readingKey) => (
                      <div
                        className="grid gap-3 rounded-[1.5rem] border border-[#1c4a3c]/10 p-4 md:grid-cols-[1.3fr_repeat(5,0.7fr)] md:items-end dark:border-[#d2f2d4]/10"
                        key={readingKey}
                      >
                        <p className="font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
                          {t(`production_reading_${readingKey}`)}
                        </p>
                        <LimitInput
                          label={t("minimum_value")}
                          onChange={(value) =>
                            updateLimitField(readingKey, "minimum", value)
                          }
                          value={limits[readingKey].minimum}
                        />
                        <LimitInput
                          label={t("maximum_value")}
                          onChange={(value) =>
                            updateLimitField(readingKey, "maximum", value)
                          }
                          value={limits[readingKey].maximum}
                        />
                        <LimitInput
                          label={t("target_optional")}
                          onChange={(value) =>
                            updateLimitField(readingKey, "target", value)
                          }
                          value={limits[readingKey].target}
                        />
                        <label className="space-y-1">
                          <span className="text-[#527568] text-[10px] dark:text-[#a9cbbb]">
                            {t("entry_unit")}
                          </span>
                          <select
                            className="production-setting-input !px-2 !py-2"
                            disabled={readingKey === "chocolate_temperature"}
                            onChange={(event) =>
                              updateLimitField(
                                readingKey,
                                "unit",
                                event.target.value
                              )
                            }
                            value={limits[readingKey].unit}
                          >
                            {(readingKey === "chocolate_temperature"
                              ? ["°C"]
                              : ["mg", "g", "kg"]
                            ).map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </label>
                        <LimitInput
                          label={t("reading_count")}
                          min="1"
                          onChange={(value) =>
                            updateLimitField(
                              readingKey,
                              "minimumReadingCount",
                              value
                            )
                          }
                          value={limits[readingKey].minimumReadingCount}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="production-primary-button"
                      disabled={isSavingSpecification}
                      onClick={saveAndPublish}
                      type="button"
                    >
                      {isSavingSpecification ? (
                        <Loader2 className="animate-spin" size={17} />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                      {t("publish_specification")}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {message ? (
          <p
            className={`rounded-[1rem] px-4 py-3 font-bold text-sm ${message === "error" ? "bg-[#fff0ed] text-[#a43434]" : "bg-[#e8f7ed] text-[#247a51]"}`}
          >
            {t(messageKeys[message])}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function LimitInput({
  label,
  min,
  onChange,
  value,
}: {
  label: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[#527568] text-[10px] dark:text-[#a9cbbb]">
        {label}
      </span>
      <input
        className="production-setting-input !px-2 !py-2"
        min={min}
        onChange={(event) => onChange(event.target.value)}
        step="any"
        type="number"
        value={value}
      />
    </label>
  );
}
