import { ArrowUpRight, ChevronDown, Clock3, Cuboid, Factory, Gauge, Package } from "lucide-react";
import { useMemo } from "react";
import {
  findLineOverview,
  normalizeLineName,
  type ProductionFloorOverview,
} from "../floor/live-data";
import type { EquipmentPlacement, EquipmentStatus, HallLayout } from "../floor/types";
import { useI18n } from "../lib/i18n";

const STATUS_ORDER: EquipmentStatus[] = ["attention", "pending", "normal", "unknown"];

type DataState = "loading" | "signedOut" | "noWorkspace" | "live";

interface InspectorProps {
  dataState: DataState;
  layout: HallLayout;
  onSelect: (line: string) => void;
  overview: ProductionFloorOverview | undefined;
  selected: EquipmentPlacement[];
}

function groupStatus(equipment: EquipmentPlacement[]) {
  return (
    equipment
      .map((item) => item.status)
      .sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))[0] ?? "normal"
  );
}

export function Inspector({ dataState, layout, onSelect, overview, selected }: InspectorProps) {
  const { language, t } = useI18n();
  const productionLines = useMemo(
    () =>
      Array.from(
        layout.equipment
          .filter((equipment) => equipment.selectable !== false)
          .reduce((groups, equipment) => {
            const group = groups.get(equipment.line) ?? [];
            group.push(equipment);
            groups.set(equipment.line, group);
            return groups;
          }, new Map<string, EquipmentPlacement[]>()),
        ([line, equipment]) => ({
          line,
          equipment,
          live: findLineOverview(overview, line),
        }),
      ),
    [layout, overview],
  );
  const selectedLine = selected[0]?.line ?? null;
  const selectedLineOverview = selectedLine ? findLineOverview(overview, selectedLine) : undefined;
  const selectedStatus = groupStatus(selected);
  const attentionCount = productionLines.filter(
    (group) => groupStatus(group.equipment) === "attention",
  ).length;
  const pendingCount = productionLines.filter(
    (group) => groupStatus(group.equipment) === "pending",
  ).length;
  const noDataCount = productionLines.filter(
    (group) => groupStatus(group.equipment) === "unknown",
  ).length;
  const visibleLineKeys = new Set(productionLines.map((group) => normalizeLineName(group.line)));
  const visibleLiveLines =
    overview?.lines.filter((line) => visibleLineKeys.has(normalizeLineName(line.departmentName))) ??
    [];
  const hallInspections = visibleLiveLines.reduce(
    (total, line) => total + line.statistics.inspections,
    0,
  );
  const hallApproved = visibleLiveLines.reduce(
    (total, line) => total + line.statistics.approved,
    0,
  );
  const hallOutOfLimit = visibleLiveLines.reduce(
    (total, line) => total + line.statistics.outOfLimit,
    0,
  );
  const hallConformance =
    hallInspections === 0
      ? 0
      : visibleLiveLines.reduce(
          (total, line) => total + line.statistics.conformanceRate * line.statistics.inspections,
          0,
        ) / hallInspections;
  const hallStatus =
    language === "ar"
      ? `${attentionCount} خارج الحدود · ${pendingCount} قيد المراجعة · ${noDataCount} بدون بيانات`
      : `${attentionCount} ${attentionCount === 1 ? "exception" : "exceptions"} · ${pendingCount} pending · ${noDataCount} without data`;
  const hallStatusTone: EquipmentStatus = attentionCount
    ? "attention"
    : pendingCount
      ? "pending"
      : noDataCount
        ? "unknown"
        : "normal";
  const labUrl = import.meta.env.VITE_FORMULATION_LAB_URL ?? "http://localhost:3001";
  const recordUrl = selectedLineOverview
    ? `${labUrl}/quality/production-line-records/${selectedLineOverview.latestInspection.recordId}`
    : dataState === "signedOut"
      ? `${labUrl}/quality/floor`
      : `${labUrl}/quality/production-line-records`;
  const actionLabel = selectedLineOverview
    ? t("openLatestRecord")
    : dataState === "signedOut"
      ? t("signInToLoad")
      : t("openRecords");
  const formatInspectionTime = (timestamp: number) =>
    new Intl.DateTimeFormat(language === "ar" ? "ar-PS" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(timestamp);

  return (
    <aside className="inspector" aria-live="polite">
      <div className="inspector__eyebrow">
        <span>{selectedLine ? t("selectedLine") : t("hallStatus")}</span>
        <span
          className="live-dot"
          data-live={dataState === "live" || undefined}
          aria-hidden="true"
        />
      </div>

      {selectedLine ? (
        <>
          <div className="inspector__title-row">
            <div className="inspector__icon">
              <Cuboid aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="inspector__type">{t("line")}</p>
              <h2>{selectedLine}</h2>
            </div>
          </div>

          <div className="status-banner" data-status={selectedStatus}>
            <span className="status-symbol" aria-hidden="true" />
            <span>{t(selectedStatus)}</span>
          </div>

          <dl className="inspector__facts">
            <div>
              <dt>
                <Factory aria-hidden="true" size={16} />
                {t("equipment")}
              </dt>
              <dd>
                {selected.length} {t("equipmentCount")}
              </dd>
            </div>
            <div>
              <dt>
                <Clock3 aria-hidden="true" size={16} />
                {t("latestInspection")}
              </dt>
              <dd>
                {selectedLineOverview
                  ? formatInspectionTime(selectedLineOverview.latestInspection.inspectionAt)
                  : t("noInspectionData")}
              </dd>
            </div>
            {selectedLineOverview ? (
              <>
                <div>
                  <dt>
                    <Package aria-hidden="true" size={16} />
                    {t("product")}
                  </dt>
                  <dd>{selectedLineOverview.latestInspection.productName}</dd>
                </div>
                <div>
                  <dt>
                    <Gauge aria-hidden="true" size={16} />
                    {t("inspectedBy")}
                  </dt>
                  <dd>{selectedLineOverview.latestInspection.qcUserName}</dd>
                </div>
              </>
            ) : null}
          </dl>
          <div className="overview-metrics overview-metrics--line">
            <div>
              <strong>{selectedLineOverview?.statistics.inspections ?? 0}</strong>
              <span className="overview-metrics__label">{t("inspections24h")}</span>
            </div>
            <div>
              <strong>
                {selectedLineOverview && selectedLineOverview.statistics.inspections > 0
                  ? `${Math.round(selectedLineOverview.statistics.conformanceRate * 100)}%`
                  : "—"}
              </strong>
              <span className="overview-metrics__label">{t("conformance")}</span>
            </div>
            <div>
              <strong>{selectedLineOverview?.statistics.pending ?? 0}</strong>
              <span className="overview-metrics__label">{t("pendingRecords")}</span>
            </div>
            <div>
              <strong>{selectedLineOverview?.statistics.outOfLimit ?? 0}</strong>
              <span className="overview-metrics__label">{t("outOfLimitRecords")}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="inspector__title-row">
            <div className="inspector__icon">
              <Factory aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="inspector__type">{t("qualityControl")}</p>
              <h2>{t("hallOverview")}</h2>
            </div>
          </div>
          <p className="inspector__note">{t("hallOverviewNote")}</p>
          <div className="overview-metrics">
            <div>
              <strong>{hallInspections}</strong>
              <span className="overview-metrics__label">{t("inspections24h")}</span>
            </div>
            <div>
              <strong>{hallInspections > 0 ? `${Math.round(hallConformance * 100)}%` : "—"}</strong>
              <span className="overview-metrics__label">{t("conformance")}</span>
            </div>
            <div>
              <strong>{hallApproved}</strong>
              <span className="overview-metrics__label">{t("approvedRecords")}</span>
            </div>
            <div>
              <strong>{hallOutOfLimit}</strong>
              <span className="overview-metrics__label">{t("outOfLimitRecords")}</span>
            </div>
          </div>
          <div className="hall-status-line">
            <span className="status-symbol" data-status={hallStatusTone} aria-hidden="true" />
            <span>{hallStatus}</span>
          </div>
        </>
      )}

      <a className="primary-action" href={recordUrl}>
        <span>{actionLabel}</span>
        <ArrowUpRight aria-hidden="true" size={18} />
      </a>

      <details className="equipment-list">
        <summary>
          <span>{t("productionLines")}</span>
          <span>{productionLines.length}</span>
          <ChevronDown aria-hidden="true" size={16} />
        </summary>
        <div className="equipment-list__items">
          {[...productionLines]
            .sort(
              (a, b) =>
                STATUS_ORDER.indexOf(groupStatus(a.equipment)) -
                STATUS_ORDER.indexOf(groupStatus(b.equipment)),
            )
            .map((group) => {
              const status = groupStatus(group.equipment);
              return (
                <button
                  aria-label={`${group.line}, ${group.equipment.length} ${t("equipmentCount")}, ${t(status)}`}
                  className="equipment-list__item"
                  data-selected={selectedLine === group.line || undefined}
                  key={group.line}
                  onClick={() => onSelect(group.line)}
                  type="button"
                >
                  <span className="status-symbol" data-status={status} aria-hidden="true" />
                  <span>
                    <strong>{group.line}</strong>
                    <small>
                      {group.live
                        ? `${group.live.statistics.inspections} ${t("inspections24h")}`
                        : t("noInspectionData")}
                    </small>
                  </span>
                </button>
              );
            })}
        </div>
      </details>
    </aside>
  );
}
