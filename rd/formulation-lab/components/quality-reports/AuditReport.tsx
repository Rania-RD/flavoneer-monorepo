import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { usePaginatedQuery, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileDown, Search, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { downloadCsv } from "../../lib/quality-report-export";
import { downloadAuditPdf } from "./audit-pdf";
import {
  cellClassName,
  EmptyReport,
  formatDateTime,
  formatReading,
  ReportHeading,
  ReportLoading,
  ReportTable,
  rowClassName,
  StatusDot,
} from "./shared";
import type { QualityReportArgs } from "./types";

export function AuditReport({ args }: { args: QualityReportArgs }) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] =
    useState<Id<"productionLineRecords"> | null>(null);
  const { results, status, loadMore } = usePaginatedQuery(
    api.qualityManagerReports.listAuditRecords,
    { ...args, search: search || undefined },
    { initialNumItems: 30 }
  );
  const selectedRecord = useQuery(
    api.qualityManagerReports.getAuditRecord,
    selectedRecordId ? { recordId: selectedRecordId } : "skip"
  );
  const locale = i18n.language === "ar" ? "ar-PS" : "en";
  const eventLabel = (action: string) =>
    t(`qc_reports_event_${action.replaceAll(".", "_")}`);

  const exportRegister = () => {
    downloadCsv(
      t("qc_reports_audit_csv_filename"),
      [
        t("form_serial"),
        t("batch_number"),
        t("product_label"),
        t("production_hall"),
        t("department_or_line"),
        t("qc_inspector"),
        t("inspection_time"),
        t("status"),
        t("qc_reports_out_of_limit"),
      ],
      results.map((row) => [
        row.displaySerial,
        row.printedBatchCode,
        row.productName,
        row.productionHallCode,
        row.departmentName,
        row.qcUserName,
        formatDateTime(row.inspectionAt, locale),
        t(`production_status_${row.status}`),
        row.outOfLimitReadingCount,
      ])
    );
  };

  const exportSelectedPdf = async () => {
    if (!selectedRecord) {
      return;
    }
    await downloadAuditPdf(
      {
        ...selectedRecord,
        events: selectedRecord.events.map((event) => ({
          ...event,
          action: eventLabel(event.action),
        })),
        readings: selectedRecord.readings.map((reading) => ({
          ...reading,
          readingKey: t(`production_reading_${reading.readingKey}`),
        })),
        status: t(`production_status_${selectedRecord.status}`),
      },
      {
        title: t("qc_reports_audit_packet"),
        serial: t("form_serial"),
        batch: t("batch_number"),
        product: t("product_label"),
        hall: t("production_hall"),
        department: t("department_or_line"),
        inspector: t("qc_inspector"),
        inspectionTime: t("inspection_time"),
        specification: t("qc_reports_specification_version"),
        status: t("status"),
        readings: t("measurements"),
        parameter: t("qc_reports_parameter"),
        actual: t("qc_reports_actual_value"),
        limits: t("qc_reports_stored_limits"),
        result: t("qc_reports_result"),
        withinLimit: t("within_range"),
        outsideLimit: t("outside_range"),
        eventHistory: t("qc_reports_event_history"),
        actor: t("qc_reports_actor"),
        revision: t("qc_reports_revision"),
      },
      locale
    );
  };

  return (
    <div className="space-y-7">
      <ReportHeading
        action={
          <button
            className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#1c4a3c] px-4 font-bold text-sm text-white dark:bg-[#f5a623] dark:text-[#173e33]"
            onClick={exportRegister}
            type="button"
          >
            <Download aria-hidden="true" size={16} />
            {t("qc_reports_export_csv")}
          </button>
        }
        description={t("qc_reports_audit_description")}
        title={t("qc_reports_audit")}
      />
      <label className="relative block max-w-lg">
        <Search
          aria-hidden="true"
          className="absolute start-4 top-1/2 -translate-y-1/2 text-[#527568]"
          size={17}
        />
        <input
          className="min-h-12 w-full rounded-full border border-[#1c4a3c]/10 bg-[#fffdf4] ps-11 pe-5 text-[#173e33] text-sm outline-none focus:border-[#f5a623] dark:border-[#d2f2d4]/10 dark:bg-[#173e33] dark:text-[#f7f4df]"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("qc_reports_search_audit")}
          value={search}
        />
      </label>

      {status === "LoadingFirstPage" ? (
        <ReportLoading />
      ) : results.length === 0 ? (
        <EmptyReport>{t("qc_reports_no_data")}</EmptyReport>
      ) : (
        <ReportTable
          headers={[
            t("form_serial"),
            t("product_label"),
            t("batch_number"),
            t("inspection_time"),
            t("qc_reports_evidence"),
            t("qc_reports_out_of_limit"),
            t("status"),
          ]}
        >
          {results.map((row) => (
            <tr
              className={`${rowClassName} cursor-pointer`}
              key={row.recordId}
              onClick={() => setSelectedRecordId(row.recordId)}
            >
              <td className={`${cellClassName} font-bold font-mono`}>
                {row.displaySerial}
              </td>
              <td className={cellClassName}>{row.productName}</td>
              <td className={`${cellClassName} font-mono`}>
                {row.printedBatchCode ?? "—"}
              </td>
              <td className={cellClassName}>
                {formatDateTime(row.inspectionAt, locale)}
              </td>
              <td className={cellClassName}>
                <div className="flex flex-wrap gap-3 text-xs">
                  {[
                    [t("qc_reports_photo_short"), row.hasBatchLabelPhoto],
                    [t("qc_reports_code_short"), row.hasConfirmedBatchCode],
                    [t("qc_reports_readings_short"), row.readingsComplete],
                    [t("qc_reports_checks_short"), row.checksComplete],
                  ].map(([label, complete]) => (
                    <span
                      className="inline-flex items-center gap-1.5"
                      key={String(label)}
                    >
                      <StatusDot danger={!complete} /> {label}
                    </span>
                  ))}
                </div>
              </td>
              <td
                className={`${cellClassName} ${row.outOfLimitReadingCount ? "font-bold text-[#a43434] dark:text-[#ffb8ad]" : ""}`}
              >
                {row.outOfLimitReadingCount}
              </td>
              <td className={cellClassName}>
                {t(`production_status_${row.status}`)}
              </td>
            </tr>
          ))}
        </ReportTable>
      )}
      {status === "CanLoadMore" ? (
        <button
          className="mx-auto block rounded-full bg-[#eef8eb] px-5 py-2.5 font-bold text-[#173e33] text-sm dark:bg-[#285b4d] dark:text-[#f7f4df]"
          onClick={() => loadMore(30)}
          type="button"
        >
          {t("load_more")}
        </button>
      ) : null}

      <AnimatePresence>
        {selectedRecordId ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[999] bg-[#102f27]/35 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            role="presentation"
          >
            <motion.aside
              animate={{ x: 0 }}
              className="absolute inset-y-0 end-0 w-full max-w-2xl overflow-y-auto bg-[#fffdf4] p-6 shadow-2xl sm:p-8 dark:bg-[#173e33]"
              exit={{ x: "100%" }}
              initial={{ x: "100%" }}
              transition={{ damping: 28, stiffness: 260, type: "spring" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[#527568] text-[10px] uppercase tracking-[0.14em] dark:text-[#a9cbbb]">
                    {t("qc_reports_audit_packet")}
                  </p>
                  <h3 className="mt-2 font-bold font-display text-3xl text-[#173e33] dark:text-[#f7f4df]">
                    {selectedRecord?.displaySerial ?? t("loading")}
                  </h3>
                </div>
                <button
                  aria-label={t("close")}
                  className="flex size-10 items-center justify-center rounded-full bg-[#eef8eb] text-[#173e33] dark:bg-[#285b4d] dark:text-[#f7f4df]"
                  onClick={() => setSelectedRecordId(null)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              {selectedRecord === undefined ? (
                <ReportLoading />
              ) : selectedRecord ? (
                <div className="mt-8 space-y-8">
                  <button
                    className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#1c4a3c] px-4 font-bold text-sm text-white dark:bg-[#f5a623] dark:text-[#173e33]"
                    onClick={exportSelectedPdf}
                    type="button"
                  >
                    <FileDown aria-hidden="true" size={16} />
                    {t("qc_reports_export_pdf")}
                  </button>
                  {selectedRecord.batchLabelPhotoUrl ? (
                    <img
                      alt={t("batch_label_photo")}
                      className="max-h-72 w-full rounded-[2rem] object-cover"
                      height={288}
                      src={selectedRecord.batchLabelPhotoUrl}
                      width={640}
                    />
                  ) : null}
                  <div>
                    <h4 className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                      {t("measurements")}
                    </h4>
                    <div className="mt-3 divide-y divide-[#1c4a3c]/10 dark:divide-[#d2f2d4]/10">
                      {selectedRecord.readings.map((reading) => (
                        <div
                          className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm"
                          key={`${reading.readingKey}-${reading.readingIndex}`}
                        >
                          <span>
                            {t(`production_reading_${reading.readingKey}`)}
                          </span>
                          <span
                            className={
                              reading.withinLimit
                                ? ""
                                : "font-bold text-[#a43434] dark:text-[#ffb8ad]"
                            }
                          >
                            {formatReading(reading.value, locale)}{" "}
                            {reading.unit} ·{" "}
                            {formatReading(reading.minimum, locale)}–
                            {formatReading(reading.maximum, locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                      {t("qc_reports_event_history")}
                    </h4>
                    <ol className="mt-3 border-[#1c4a3c]/10 border-s dark:border-[#d2f2d4]/10">
                      {selectedRecord.events.map((event) => (
                        <li
                          className="relative ms-5 pb-5 text-sm"
                          key={`${event.recordRevision}-${event.createdAt}`}
                        >
                          <span className="absolute -start-[1.45rem] top-1 size-2 rounded-full bg-[#f5a623]" />
                          <p className="font-bold">
                            {eventLabel(event.action)}
                          </p>
                          <p className="mt-1 text-[#527568] text-xs dark:text-[#a9cbbb]">
                            {event.actorName} ·{" "}
                            {formatDateTime(event.createdAt, locale)} ·{" "}
                            {t("qc_reports_revision")} {event.recordRevision}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
