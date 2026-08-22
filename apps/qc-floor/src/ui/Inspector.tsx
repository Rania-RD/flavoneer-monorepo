import { ArrowUpRight, ChevronDown, Cuboid, Factory, Ruler, ScanLine } from "lucide-react";
import { PRODUCTION_HALL_1 } from "../floor/factory-layout";
import { getMachineVisualScale } from "../floor/machine-catalog";
import type { EquipmentPlacement, EquipmentStatus } from "../floor/types";
import { useI18n } from "../lib/i18n";

const STATUS_ORDER: EquipmentStatus[] = ["attention", "pending", "normal"];

interface InspectorProps {
  onSelect: (line: string) => void;
  selected: EquipmentPlacement[];
}

const PRODUCTION_LINES = Array.from(
  PRODUCTION_HALL_1.equipment
    .filter((equipment) => equipment.selectable !== false)
    .reduce((groups, equipment) => {
      const group = groups.get(equipment.line) ?? [];
      group.push(equipment);
      groups.set(equipment.line, group);
      return groups;
    }, new Map<string, EquipmentPlacement[]>()),
  ([line, equipment]) => ({ line, equipment }),
);

function equipmentScale(equipment: EquipmentPlacement) {
  return equipment.kind === "machine"
    ? (equipment.visualScale ?? getMachineVisualScale(equipment.assetKey))
    : 1;
}

function groupStatus(equipment: EquipmentPlacement[]) {
  return (
    equipment
      .map((item) => item.status)
      .sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))[0] ?? "normal"
  );
}

function formatDimensions(equipment: EquipmentPlacement[]) {
  const bounds = equipment.reduce(
    (current, item) => {
      const scale = equipmentScale(item);
      const rotation = item.rotationY ?? 0;
      const length = item.dimensions.length * scale;
      const width = item.dimensions.width * scale;
      const halfX =
        (Math.abs(Math.cos(rotation)) * length + Math.abs(Math.sin(rotation)) * width) / 2;
      const halfZ =
        (Math.abs(Math.sin(rotation)) * length + Math.abs(Math.cos(rotation)) * width) / 2;
      return {
        height: Math.max(current.height, item.dimensions.height * scale),
        maxX: Math.max(current.maxX, item.position[0] + halfX),
        maxZ: Math.max(current.maxZ, item.position[2] + halfZ),
        minX: Math.min(current.minX, item.position[0] - halfX),
        minZ: Math.min(current.minZ, item.position[2] - halfZ),
      };
    },
    {
      height: 0,
      maxX: Number.NEGATIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
    },
  );
  return `${(bounds.maxX - bounds.minX).toFixed(2)} × ${(bounds.maxZ - bounds.minZ).toFixed(2)} × ${bounds.height.toFixed(2)} m`;
}

export function Inspector({ onSelect, selected }: InspectorProps) {
  const { t } = useI18n();
  const selectedLine = selected[0]?.line ?? null;
  const selectedStatus = groupStatus(selected);
  const labUrl = import.meta.env.VITE_FORMULATION_LAB_URL ?? "http://localhost:3001";
  const recordUrl = `${labUrl}/quality/production-line-records${
    selectedLine ? `?line=${encodeURIComponent(selectedLine)}` : ""
  }`;

  return (
    <aside className="inspector" aria-live="polite">
      <div className="inspector__eyebrow">
        <span>{selectedLine ? t("selectedLine") : t("hallStatus")}</span>
        <span className="live-dot" aria-hidden="true" />
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
                <Ruler aria-hidden="true" size={16} />
                {t("dimensions")}
              </dt>
              <dd className="mono">{formatDimensions(selected)}</dd>
            </div>
            <div>
              <dt>
                <ScanLine aria-hidden="true" size={16} />
                {t("latestInspection")}
              </dt>
              <dd>{t("latestInspectionValue")}</dd>
            </div>
          </dl>
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
              <strong>{PRODUCTION_HALL_1.lineZones.length}</strong>
              <span className="overview-metrics__label">{t("lines")}</span>
            </div>
            <div>
              <strong>{PRODUCTION_HALL_1.equipment.length}</strong>
              <span className="overview-metrics__label">{t("equipmentCount")}</span>
            </div>
          </div>
          <div className="hall-status-line">
            <span className="status-symbol" data-status="attention" aria-hidden="true" />
            <span>{t("hallStatusValue")}</span>
          </div>
        </>
      )}

      <a className="primary-action" href={recordUrl}>
        <span>{t("openRecords")}</span>
        <ArrowUpRight aria-hidden="true" size={18} />
      </a>

      <details className="equipment-list">
        <summary>
          <span>{t("productionLines")}</span>
          <span>{PRODUCTION_LINES.length}</span>
          <ChevronDown aria-hidden="true" size={16} />
        </summary>
        <div className="equipment-list__items">
          {[...PRODUCTION_LINES]
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
                      {group.equipment.length} {t("equipmentCount")}
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
