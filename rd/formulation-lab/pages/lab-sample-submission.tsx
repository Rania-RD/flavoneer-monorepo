import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Hash,
  Loader2,
  MapPin,
  PackageCheck,
  Send,
  ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "../context/OrganizationContext";
import { useSettings } from "../context/SettingsContext";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../hooks/useToast";

type SampleType = "raw_material" | "final_product";

function toLocalDateTimeInputValue(date: Date): string {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
  return offsetDate.toISOString().slice(0, 16);
}

const inputClasses =
  "w-full rounded-2xl border border-[#1c4a3c]/15 bg-[#fffdf4] px-4 py-3.5 text-sm text-[#173e33] outline-none transition focus:border-[#f5a623] focus:ring-4 focus:ring-[#f5a623]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#d2f2d4]/10 dark:bg-[#102f27] dark:text-[#f7f4df] dark:focus:border-[#f5a623]";

export default function LabSampleSubmission() {
  const { t, i18n } = useTranslation();
  const { language } = useSettings();
  const { activeOrganizationId } = useOrganization();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  const canCreate = hasPermission("record_production_checks");
  const canView = hasPermission("view_production_checks");
  const [sampleType, setSampleType] = useState<SampleType>("raw_material");
  const [productId, setProductId] = useState("");
  const [productionNumber, setProductionNumber] = useState("");
  const [sampleLocation, setSampleLocation] = useState("");
  const [sampledAt, setSampledAt] = useState(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSampleNumber, setLastSampleNumber] = useState<string | null>(null);
  const createSample = useMutation(api.labSamples.create);
  const referenceData = useQuery(
    api.labSamples.getReferenceData,
    activeOrganizationId && canCreate
      ? { language, organizationId: activeOrganizationId }
      : "skip"
  );
  const recentSamples = useQuery(
    api.labSamples.listRecent,
    activeOrganizationId && canView
      ? { organizationId: activeOrganizationId }
      : "skip"
  );
  const products = useMemo(
    () =>
      sampleType === "raw_material"
        ? (referenceData?.rawMaterials ?? [])
        : (referenceData?.finishedProducts ?? []),
    [referenceData, sampleType]
  );
  const numberPattern = sampleType === "raw_material" ? "RYYXXX" : "FYYXXXX";
  const isFormComplete =
    Boolean(activeOrganizationId) &&
    Boolean(productId) &&
    productionNumber.length === 7 &&
    Boolean(sampleLocation.trim()) &&
    Boolean(sampledAt);

  const handleSampleTypeChange = (nextType: SampleType) => {
    setSampleType(nextType);
    setProductId("");
    setLastSampleNumber(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(activeOrganizationId && isFormComplete)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const product =
        sampleType === "raw_material"
          ? {
              ingredientId: productId as Id<"ingredients">,
              sampleType,
            }
          : {
              projectId: productId as Id<"projects">,
              sampleType,
            };
      const result = await createSample({
        organizationId: activeOrganizationId,
        product,
        productionNumber,
        sampleLocation,
        sampledAt: new Date(sampledAt).getTime(),
        notes: notes.trim() || undefined,
      });
      setLastSampleNumber(result.sampleNumber);
      setProductId("");
      setProductionNumber("");
      setSampleLocation("");
      setSampledAt(toLocalDateTimeInputValue(new Date()));
      setNotes("");
      toast.success(
        t("lab_sample_submitted", { sampleNumber: result.sampleNumber })
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("lab_sample_submit_failed")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5a623]" size={30} />
      </div>
    );
  }

  if (!(canCreate || canView)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#d2f2d4] text-[#173e33] dark:bg-[#285b4d] dark:text-[#d2f2d4]">
          <ShieldCheck aria-hidden="true" size={28} />
        </div>
        <h1 className="font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
          {t("access_denied")}
        </h1>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="px-1 pt-2">
        <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-[1.2rem] bg-[#f5a623] text-[#173e33] shadow-[#102f27]/10 shadow-lg">
          <FlaskConical aria-hidden="true" size={25} />
        </div>
        <p className="mb-2 font-bold text-[#527568] text-xs uppercase tracking-[0.18em] dark:text-[#a9cbbb]">
          {t("quality_control")}
        </p>
        <h1 className="font-bold font-display text-3xl text-[#173e33] tracking-tight sm:text-4xl dark:text-[#f7f4df]">
          {t("lab_sample_submission")}
        </h1>
        <p className="mt-2 max-w-2xl text-[#527568] text-sm dark:text-[#a9cbbb]">
          {t("lab_sample_submission_subtitle")}
        </p>
      </header>

      {lastSampleNumber ? (
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-[#247a51]/15 bg-[#e8f7ed] px-5 py-4 text-[#185f3e] dark:border-[#9be0b8]/15 dark:bg-[#247a51]/20 dark:text-[#9be0b8]">
          <CheckCircle2 aria-hidden="true" className="shrink-0" size={21} />
          <p className="text-sm">
            {t("lab_sample_assigned_number")}{" "}
            <span className="font-bold font-mono">{lastSampleNumber}</span>
          </p>
        </div>
      ) : null}

      {canCreate ? (
        <form
          className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-[0_18px_55px_rgba(16,47,39,0.08)] dark:border-[#d2f2d4]/10 dark:bg-[#173e33]"
          onSubmit={handleSubmit}
        >
          <div className="border-[#1c4a3c]/10 border-b px-6 py-5 sm:px-8 dark:border-[#d2f2d4]/10">
            <div className="flex items-center gap-3">
              <PackageCheck
                aria-hidden="true"
                className="text-[#f5a623]"
                size={22}
              />
              <div>
                <h2 className="font-bold text-[#173e33] text-lg dark:text-[#f7f4df]">
                  {t("sample_details")}
                </h2>
                <p className="text-[#6f8e82] text-xs dark:text-[#a9cbbb]">
                  {t("sample_number_assigned_automatically")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="mb-2 font-bold text-[#285b4d] text-sm dark:text-[#d2e7dc]">
                {t("sample_type")}
              </legend>
              <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] bg-[#eef8eb] p-1.5 dark:bg-[#102f27]">
                {(["raw_material", "final_product"] as const).map((type) => (
                  <button
                    aria-pressed={sampleType === type}
                    className={`rounded-2xl px-4 py-3 font-bold text-sm transition-all ${
                      sampleType === type
                        ? "bg-[#1c4a3c] text-white shadow-md dark:bg-[#f5a623] dark:text-[#173e33]"
                        : "text-[#527568] hover:bg-white/60 dark:text-[#a9cbbb] dark:hover:bg-[#285b4d]"
                    }`}
                    key={type}
                    onClick={() => handleSampleTypeChange(type)}
                    type="button"
                  >
                    {t(
                      type === "raw_material"
                        ? "sample_raw_material"
                        : "sample_finished_product"
                    )}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="space-y-2 sm:col-span-2">
              <span className="font-bold text-[#285b4d] text-sm dark:text-[#d2e7dc]">
                {t("product_name")}
              </span>
              <select
                className={inputClasses}
                disabled={referenceData === undefined}
                onChange={(event) => setProductId(event.target.value)}
                required
                value={productId}
              >
                <option value="">{t("select_product")}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {referenceData !== undefined && products.length === 0 ? (
                <span className="block text-[#a43434] text-xs dark:text-[#ffb8ad]">
                  {t(
                    sampleType === "raw_material"
                      ? "no_raw_materials_available"
                      : "no_finished_products_available"
                  )}
                </span>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 font-bold text-[#285b4d] text-sm dark:text-[#d2e7dc]">
                <Hash aria-hidden="true" size={15} />
                {t("sample_number")}
              </span>
              <input
                className={`${inputClasses} font-bold font-mono tracking-wider`}
                readOnly
                value={numberPattern}
              />
              <span className="block text-[#6f8e82] text-xs dark:text-[#a9cbbb]">
                {t("sample_number_format_help")}
              </span>
            </label>

            <label className="space-y-2">
              <span className="font-bold text-[#285b4d] text-sm dark:text-[#d2e7dc]">
                {t("production_number")}
              </span>
              <input
                className={`${inputClasses} font-mono`}
                inputMode="numeric"
                maxLength={7}
                onChange={(event) =>
                  setProductionNumber(
                    event.target.value.replace(/\D/g, "").slice(0, 7)
                  )
                }
                placeholder={t("production_number_placeholder")}
                required
                value={productionNumber}
              />
              <span className="block text-[#6f8e82] text-xs dark:text-[#a9cbbb]">
                {t("production_number_help")}
              </span>
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 font-bold text-[#285b4d] text-sm dark:text-[#d2e7dc]">
                <MapPin aria-hidden="true" size={15} />
                {t("sample_location")}
              </span>
              <input
                className={inputClasses}
                maxLength={160}
                onChange={(event) => setSampleLocation(event.target.value)}
                placeholder={t("sample_location_placeholder")}
                required
                value={sampleLocation}
              />
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 font-bold text-[#285b4d] text-sm dark:text-[#d2e7dc]">
                <CalendarClock aria-hidden="true" size={15} />
                {t("sample_date_time")}
              </span>
              <input
                className={inputClasses}
                onChange={(event) => setSampledAt(event.target.value)}
                required
                type="datetime-local"
                value={sampledAt}
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="font-bold text-[#285b4d] text-sm dark:text-[#d2e7dc]">
                {t("notes")}
              </span>
              <textarea
                className={`${inputClasses} min-h-28 resize-y`}
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("sample_notes_placeholder")}
                value={notes}
              />
            </label>
          </div>

          <div className="flex justify-end border-[#1c4a3c]/10 border-t bg-[#eef8eb]/55 px-6 py-5 sm:px-8 dark:border-[#d2f2d4]/10 dark:bg-[#102f27]/50">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#1c4a3c] px-6 py-3 font-bold text-sm text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:bg-[#f5a623] dark:text-[#173e33]"
              disabled={!isFormComplete || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={18}
                />
              ) : (
                <Send aria-hidden="true" size={18} />
              )}
              {t(isSubmitting ? "submitting_sample" : "submit_sample")}
            </button>
          </div>
        </form>
      ) : null}

      {canView ? (
        <section className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-[0_18px_55px_rgba(16,47,39,0.08)] dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
          <div className="flex items-center gap-3 border-[#1c4a3c]/10 border-b px-6 py-5 sm:px-8 dark:border-[#d2f2d4]/10">
            <ClipboardList
              aria-hidden="true"
              className="text-[#f5a623]"
              size={22}
            />
            <h2 className="font-bold text-[#173e33] text-lg dark:text-[#f7f4df]">
              {t("recent_sample_submissions")}
            </h2>
          </div>

          {recentSamples === undefined ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="animate-spin text-[#f5a623]" size={26} />
            </div>
          ) : null}

          {recentSamples?.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center">
              <FlaskConical
                className="text-[#6f8e82] dark:text-[#a9cbbb]"
                size={28}
              />
              <p className="text-[#6f8e82] text-sm dark:text-[#a9cbbb]">
                {t("no_sample_submissions")}
              </p>
            </div>
          ) : null}

          {recentSamples && recentSamples.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-start text-sm">
                <thead>
                  <tr className="bg-[#eef8eb]/70 text-[#527568] text-xs uppercase tracking-wider dark:bg-[#102f27]/55 dark:text-[#a9cbbb]">
                    <th className="px-6 py-4 text-start font-bold">
                      {t("sample_number")}
                    </th>
                    <th className="px-6 py-4 text-start font-bold">
                      {t("product_name")}
                    </th>
                    <th className="px-6 py-4 text-start font-bold">
                      {t("production_number")}
                    </th>
                    <th className="px-6 py-4 text-start font-bold">
                      {t("sample_location")}
                    </th>
                    <th className="px-6 py-4 text-start font-bold">
                      {t("sample_date_time")}
                    </th>
                    <th className="px-6 py-4 text-start font-bold">
                      {t("submitted_by")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSamples.map((sample) => (
                    <tr
                      className="border-[#1c4a3c]/8 border-t text-[#285b4d] dark:border-[#d2f2d4]/8 dark:text-[#d2e7dc]"
                      key={sample._id}
                    >
                      <td className="px-6 py-4 font-bold font-mono text-[#173e33] dark:text-[#f7f4df]">
                        {sample.sampleNumber}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                          {sample.productName}
                        </p>
                        <p className="mt-1 text-[#6f8e82] text-xs dark:text-[#a9cbbb]">
                          {t(
                            sample.sampleType === "raw_material"
                              ? "sample_raw_material"
                              : "sample_finished_product"
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {sample.productionNumber}
                      </td>
                      <td className="px-6 py-4">{sample.sampleLocation}</td>
                      <td className="px-6 py-4">
                        {new Intl.DateTimeFormat(
                          i18n.language === "ar" ? "ar-PS" : "en",
                          { dateStyle: "medium", timeStyle: "short" }
                        ).format(sample.sampledAt)}
                      </td>
                      <td className="px-6 py-4">{sample.submittedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
