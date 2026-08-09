import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import type { ColDef } from "ag-grid-community";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  CheckCircle2,
  Factory,
  FileCheck2,
  Hash,
  Loader2,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { LabDataGrid } from "../components/ui/LabDataGrid";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../hooks/useToast";

const statusClasses: Record<string, string> = {
  draft: "bg-[#eef8eb] text-[#1c4a3c] dark:bg-[#285b4d] dark:text-[#d2f2d4]",
  pending_production_review:
    "bg-[#fff4d9] text-[#8a5811] dark:bg-[#f5a623]/20 dark:text-[#ffc760]",
  returned:
    "bg-[#fff0ed] text-[#a43434] dark:bg-[#a43434]/20 dark:text-[#ffb8ad]",
  approved:
    "bg-[#e8f7ed] text-[#247a51] dark:bg-[#247a51]/20 dark:text-[#9be0b8]",
};

interface SpecificationLimit {
  maximum: number;
  minimum: number;
  minimumReadingCount: number;
  readingKey: string;
  unit: string;
}

const SpecificationLimitsGrid = ({
  limits,
}: {
  limits: SpecificationLimit[];
}) => {
  const { t } = useTranslation();
  const columnDefs = useMemo<ColDef<SpecificationLimit>[]>(
    () => [
      {
        cellClass: "font-bold",
        flex: 1.4,
        headerName: t("configured_range"),
        minWidth: 190,
        valueGetter: ({ data }) =>
          data ? t(`production_reading_${data.readingKey}`) : "",
      },
      {
        cellClass: "lab-grid-muted",
        field: "minimum",
        filter: "agNumberColumnFilter",
        headerName: t("acceptable_minimum"),
        minWidth: 160,
      },
      {
        cellClass: "lab-grid-muted",
        field: "maximum",
        filter: "agNumberColumnFilter",
        headerName: t("acceptable_maximum"),
        minWidth: 160,
      },
      {
        cellClass: "font-mono",
        field: "unit",
        headerName: t("entry_unit"),
        minWidth: 130,
      },
      {
        cellClass: "lab-grid-muted",
        field: "minimumReadingCount",
        filter: "agNumberColumnFilter",
        headerName: t("required_count"),
        minWidth: 150,
      },
    ],
    [t]
  );

  return (
    <LabDataGrid<SpecificationLimit>
      className="lab-data-grid--production lab-data-grid--production-spec"
      columnDefs={columnDefs}
      getRowId={({ data }) => data.readingKey}
      headerHeight={48}
      rowData={limits}
      rowHeight={60}
    />
  );
};

export default function ProductionLineRecordDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canViewProductionChecks = hasPermission("view_production_checks");
  const canReviewProductionChecks = hasPermission("review_production_checks");
  const reviewRecord = useMutation(api.productionLineRecords.review);
  const { toast } = useToast();
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingDecision, setReviewingDecision] = useState<
    "approved" | "returned" | null
  >(null);
  const record = useQuery(
    api.productionLineRecords.get,
    id && canViewProductionChecks
      ? { recordId: id as Id<"productionLineRecords"> }
      : "skip"
  );
  const formatDate = (value: number) =>
    new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-PS" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);

  const handleReview = async (decision: "approved" | "returned") => {
    if (!record) {
      return;
    }
    const note = reviewNote.trim();
    if (decision === "returned" && !note) {
      toast.error(t("production_return_note_required"));
      return;
    }

    setReviewingDecision(decision);
    try {
      await reviewRecord({
        recordId: record._id,
        decision,
        note: note || undefined,
      });
      setReviewNote("");
      toast.success(
        t(
          decision === "approved"
            ? "production_record_approved"
            : "production_record_returned"
        )
      );
    } catch (error) {
      console.error("Failed to review production-line record", error);
      toast.error(t("production_review_failed"));
    } finally {
      setReviewingDecision(null);
    }
  };

  if (permissionsLoading || (canViewProductionChecks && record === undefined)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5a623]" size={30} />
      </div>
    );
  }

  if (!canViewProductionChecks) {
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

  if (!record) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#d2f2d4] text-[#173e33]">
          <Factory aria-hidden="true" size={28} />
        </div>
        <h1 className="font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
          {t("production_record_not_found")}
        </h1>
        <Link
          className="rounded-full bg-[#1c4a3c] px-6 py-3 font-bold text-sm text-white dark:bg-[#f5a623] dark:text-[#173e33]"
          to="/quality/production-line-records"
        >
          {t("back_to_records")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 rounded-full bg-[#fffdf4] px-4 py-2.5 font-bold text-[#527568] text-sm shadow-sm transition-transform hover:-translate-y-0.5 dark:bg-[#173e33] dark:text-[#a9cbbb]"
        to="/quality/production-line-records"
      >
        <ArrowLeft aria-hidden="true" className="rtl:-scale-x-100" size={17} />
        {t("back_to_records")}
      </Link>

      <header className="relative overflow-hidden rounded-[2.5rem] bg-[#173e33] px-6 py-8 text-white shadow-[0_22px_65px_rgba(16,47,39,0.2)] sm:px-10 sm:py-10 dark:bg-[#102f27]">
        <div className="absolute -end-28 -top-28 h-80 w-80 rounded-full border-[#f5a623]/12 border-[56px]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#f5a623] text-[#173e33]">
              <Factory aria-hidden="true" size={27} />
            </div>
            <p className="font-bold text-[#baddc9] text-xs uppercase tracking-[0.18em]">
              {t("form_serial")}
            </p>
            <h1 className="mt-2 font-bold font-display text-4xl tracking-tight sm:text-5xl">
              {record.displaySerial}
            </h1>
            <p className="mt-3 text-[#d7eadf] text-sm">
              {record.productName} · {record.departmentName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-4 py-2 font-bold text-xs ${statusClasses[record.status]}`}
            >
              {t(`production_status_${record.status}`)}
            </span>
          </div>
        </div>
      </header>

      {canReviewProductionChecks &&
      record.status === "pending_production_review" ? (
        <section
          className="flex flex-col gap-5 rounded-[2rem] border border-[#1c4a3c]/10 bg-[#fffdf4] p-5 shadow-[0_18px_55px_rgba(16,47,39,0.07)] lg:flex-row lg:items-end dark:border-[#d2f2d4]/10 dark:bg-[#173e33]"
          data-testid="production-review-controls"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#527568] text-xs uppercase tracking-[0.16em] dark:text-[#a9cbbb]">
              {t("production_review_decision")}
            </p>
            <p className="mt-2 text-[#527568] text-sm dark:text-[#a9cbbb]">
              {t("production_review_help")}
            </p>
            <textarea
              className="mt-4 min-h-24 w-full resize-y rounded-[1.25rem] border border-[#1c4a3c]/10 bg-[#eef8eb] px-4 py-3 text-[#173e33] text-sm outline-none transition-colors placeholder:text-[#6f8e82] focus:border-[#1c4a3c]/35 dark:border-[#d2f2d4]/10 dark:bg-[#102f27] dark:text-[#f7f4df] dark:focus:border-[#d2f2d4]/30 dark:placeholder:text-[#7fa393]"
              maxLength={1000}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder={t("production_review_note_placeholder")}
              value={reviewNote}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#a43434]/20 bg-[#fff0ed] px-5 font-bold text-[#a43434] text-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 dark:bg-[#a43434]/15 dark:text-[#ffb8ad]"
              disabled={Boolean(reviewingDecision) || !reviewNote.trim()}
              onClick={() => handleReview("returned")}
              type="button"
            >
              {reviewingDecision === "returned" ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <RotateCcw aria-hidden="true" size={17} />
              )}
              {t("return_to_qc")}
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1c4a3c] px-5 font-bold text-sm text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:bg-[#f5a623] dark:text-[#173e33]"
              disabled={Boolean(reviewingDecision)}
              onClick={() => handleReview("approved")}
              type="button"
            >
              {reviewingDecision === "approved" ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <CheckCircle2 aria-hidden="true" size={17} />
              )}
              {t("approve_production_record")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RecordDatum
          icon={<MapPin aria-hidden="true" size={19} />}
          label={t("production_hall")}
          value={record.productionHallCode}
        />
        <RecordDatum
          icon={<CalendarClock aria-hidden="true" size={19} />}
          label={t("inspection_time")}
          value={formatDate(record.inspectionAt)}
        />
        <RecordDatum
          icon={<UserRoundCheck aria-hidden="true" size={19} />}
          label={t("qc_inspector")}
          value={record.qcUserName}
        />
        <RecordDatum
          icon={<FileCheck2 aria-hidden="true" size={19} />}
          label={t("record_revision")}
          value={String(record.recordRevision)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] p-6 shadow-[0_18px_55px_rgba(16,47,39,0.07)] sm:p-8 dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-[#527568] text-xs uppercase tracking-[0.16em] dark:text-[#a9cbbb]">
                {t("record_evidence")}
              </p>
              <h2 className="mt-2 font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
                {record.printedBatchCode ?? t("evidence_not_captured")}
              </h2>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[#d2f2d4] text-[#173e33]">
              <Camera aria-hidden="true" size={22} />
            </div>
          </div>

          {record.batchLabelPhotoUrl ? (
            <img
              alt={t("record_evidence")}
              className="aspect-[4/3] w-full rounded-[1.75rem] bg-[#102f27] object-cover"
              height="900"
              src={record.batchLabelPhotoUrl}
              width="1200"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-[1.75rem] border-2 border-[#1c4a3c]/15 border-dashed bg-[#eef8eb] px-8 text-center text-[#527568] text-sm dark:border-[#d2f2d4]/15 dark:bg-[#285b4d] dark:text-[#a9cbbb]">
              {t("evidence_not_captured")}
            </div>
          )}

          {record.batchLabelConfirmedAt ? (
            <div className="mt-5 flex items-center gap-3 rounded-[1.25rem] bg-[#e8f7ed] p-4 text-[#247a51] dark:bg-[#247a51]/15 dark:text-[#9be0b8]">
              <CheckCircle2 aria-hidden="true" className="shrink-0" size={20} />
              <p className="font-bold text-sm">
                {t("evidence_confirmed_by_qc")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] p-6 shadow-[0_18px_55px_rgba(16,47,39,0.07)] sm:p-8 dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
          <p className="font-bold text-[#527568] text-xs uppercase tracking-[0.16em] dark:text-[#a9cbbb]">
            {t("parsed_batch_data")}
          </p>
          <div className="mt-6 divide-y divide-[#1c4a3c]/10 dark:divide-[#d2f2d4]/10">
            <DetailRow
              icon={<Hash aria-hidden="true" size={18} />}
              label={t("printed_batch_code")}
              value={record.printedBatchCode ?? "—"}
            />
            <DetailRow
              icon={<CalendarClock aria-hidden="true" size={18} />}
              label={t("production_date")}
              value={record.labelProductionDate ?? "—"}
            />
            <DetailRow
              icon={<PackageCheck aria-hidden="true" size={18} />}
              label={t("daily_batch_sequence")}
              value={String(record.dailyBatchSequence ?? "—")}
            />
          </div>
          <div className="mt-7 rounded-[1.5rem] bg-[#eef8eb] p-5 dark:bg-[#285b4d]">
            <p className="font-bold text-[#527568] text-[10px] uppercase tracking-wider dark:text-[#a9cbbb]">
              {t("specification_version")}
            </p>
            <p className="mt-1 font-bold font-display text-3xl text-[#173e33] dark:text-[#f7f4df]">
              {record.specificationVersion}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-[0_18px_55px_rgba(16,47,39,0.07)] dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
        <div className="border-[#1c4a3c]/10 border-b px-6 py-6 sm:px-8 dark:border-[#d2f2d4]/10">
          <p className="font-bold text-[#527568] text-xs uppercase tracking-[0.16em] dark:text-[#a9cbbb]">
            {t("production_line_specification")}
          </p>
          <h2 className="mt-2 font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
            {record.productName}
          </h2>
        </div>
        <SpecificationLimitsGrid limits={record.specificationLimits} />
      </section>

      <footer className="flex flex-wrap gap-4 px-2 pb-2 text-[#527568] text-xs dark:text-[#a9cbbb]">
        <span>
          {t("created_at")}: {formatDate(record.createdAt)}
        </span>
        <span>
          {t("last_updated")}: {formatDate(record.updatedAt)}
        </span>
      </footer>
    </div>
  );
}

function RecordDatum({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[2rem] border border-[#1c4a3c]/10 bg-[#fffdf4] p-5 shadow-sm dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[#d2f2d4] text-[#173e33]">
        {icon}
      </div>
      <p className="font-bold text-[#527568] text-[10px] uppercase tracking-wider dark:text-[#a9cbbb]">
        {label}
      </p>
      <p className="mt-1 truncate font-bold text-[#173e33] dark:text-[#f7f4df]">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 py-5 first:pt-0 last:pb-0">
      <span className="text-[#527568] dark:text-[#a9cbbb]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[#527568] text-xs dark:text-[#a9cbbb]">{label}</p>
        <p className="mt-1 truncate font-bold text-[#173e33] dark:text-[#f7f4df]">
          {value}
        </p>
      </div>
    </div>
  );
}
