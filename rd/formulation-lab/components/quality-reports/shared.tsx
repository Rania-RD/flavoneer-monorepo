import type { AgChartOptions } from "ag-charts-community";
import { AgCharts } from "ag-charts-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Loader2 } from "lucide-react";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";
import { useSettings } from "../../context/SettingsContext";
import { LabDataGrid } from "../ui/LabDataGrid";

export const REPORT_COLORS = {
  forest: "#1c4a3c",
  mint: "#7eb98b",
  amber: "#f5a623",
  red: "#a43434",
  cream: "#fffdf4",
};

export function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatReading(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDuration(value: number | null, locale: string) {
  if (value === null) {
    return "—";
  }
  const totalMinutes = Math.round(value / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(hours)}:${new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(minutes)}`;
}

export function formatDateTime(value: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function ReportLoading() {
  return (
    <div className="flex min-h-72 items-center justify-center">
      <Loader2 className="animate-spin text-[#f5a623]" size={30} />
    </div>
  );
}

export function EmptyReport({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-56 items-center justify-center border-[#1c4a3c]/10 border-y px-6 text-center text-[#527568] text-sm dark:border-[#d2f2d4]/10 dark:text-[#a9cbbb]">
      {children}
    </div>
  );
}

export function MetricStrip({
  items,
}: {
  items: {
    label: string;
    value: ReactNode;
    tone?: "default" | "warning" | "danger";
  }[];
}) {
  return (
    <div className="grid border-[#1c4a3c]/10 border-y sm:grid-cols-2 lg:grid-cols-4 dark:border-[#d2f2d4]/10">
      {items.map((item) => (
        <div
          className="border-[#1c4a3c]/10 px-5 py-5 sm:border-e last:sm:border-e-0 dark:border-[#d2f2d4]/10"
          key={item.label}
        >
          <p className="font-bold text-[#527568] text-[10px] uppercase tracking-[0.14em] dark:text-[#a9cbbb]">
            {item.label}
          </p>
          <p
            className={`mt-2 font-bold font-display text-3xl tracking-tight ${
              item.tone === "danger"
                ? "text-[#a43434] dark:text-[#ffb8ad]"
                : item.tone === "warning"
                  ? "text-[#9b6515] dark:text-[#ffc760]"
                  : "text-[#173e33] dark:text-[#f7f4df]"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ReportHeading({
  description,
  title,
  action,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-bold font-display text-2xl text-[#173e33] tracking-tight sm:text-3xl dark:text-[#f7f4df]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-[#527568] text-sm dark:text-[#a9cbbb]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function ReportChart({
  className = "h-72",
  options,
}: {
  className?: string;
  options: AgChartOptions;
}) {
  const { darkMode, isRTL } = useSettings();
  const chartOptions = useMemo<AgChartOptions>(
    () => ({
      ...options,
      background: { fill: "transparent" },
      enableRtl: isRTL,
      theme: darkMode ? "ag-default-dark" : "ag-default",
    }),
    [darkMode, isRTL, options]
  );

  return (
    <div className={className}>
      <AgCharts options={chartOptions} />
    </div>
  );
}

interface ReportGridCell {
  className: string;
  content: ReactNode;
  text: string;
}

interface ReportGridRow {
  cells: ReportGridCell[];
  id: string;
  onClick?: () => void;
}

interface LegacyCellProps {
  children?: ReactNode;
  className?: string;
}

interface LegacyRowProps {
  children?: ReactNode;
  onClick?: () => void;
}

function reactNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(reactNodeText).join(" ");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return reactNodeText(node.props.children);
  }
  return "";
}

function reportCellClassName(className = "") {
  return className
    .replace(cellClassName, "")
    .replaceAll("align-top", "")
    .trim();
}

export function ReportTable({
  children,
  headers,
}: {
  children: ReactNode;
  headers: string[];
}) {
  const rowData = useMemo<ReportGridRow[]>(
    () =>
      Children.toArray(children).flatMap((child, rowIndex) => {
        if (!isValidElement<LegacyRowProps>(child)) {
          return [];
        }
        const row = child as ReactElement<LegacyRowProps>;
        const cells = Children.toArray(row.props.children).flatMap((cell) => {
          if (!isValidElement<LegacyCellProps>(cell)) {
            return [];
          }
          return [
            {
              className: reportCellClassName(cell.props.className),
              content: cell.props.children,
              text: reactNodeText(cell.props.children),
            },
          ];
        });
        return [
          {
            cells,
            id: String(row.key ?? rowIndex),
            onClick: row.props.onClick,
          },
        ];
      }),
    [children]
  );
  const columnDefs = useMemo<ColDef<ReportGridRow>[]>(
    () =>
      headers.map((header, columnIndex) => ({
        autoHeight: true,
        cellRenderer: ({ data }: ICellRendererParams<ReportGridRow>) => {
          const cell = data?.cells[columnIndex];
          return cell ? (
            <div className={`w-full py-3 ${cell.className}`}>
              {cell.content}
            </div>
          ) : null;
        },
        colId: `report-column-${columnIndex}`,
        flex: 1,
        headerName: header,
        minWidth: columnIndex === 0 ? 160 : 140,
        valueGetter: ({ data }) => data?.cells[columnIndex]?.text ?? "",
        wrapText: true,
      })),
    [headers]
  );

  return (
    <LabDataGrid<ReportGridRow>
      className="lab-data-grid--report border-[#1c4a3c]/10 border-y dark:border-[#d2f2d4]/10"
      columnDefs={columnDefs}
      getRowClass={({ data }) =>
        data?.onClick ? "lab-data-grid__clickable-row" : undefined
      }
      getRowId={({ data }) => data.id}
      onRowClicked={({ data }) => data?.onClick?.()}
      rowData={rowData}
    />
  );
}

export const rowClassName =
  "border-[#1c4a3c]/10 border-b last:border-b-0 hover:bg-[#eef8eb]/45 dark:border-[#d2f2d4]/10 dark:hover:bg-[#285b4d]/30";

export const cellClassName =
  "px-5 py-4 align-top text-[#173e33] dark:text-[#f7f4df]";

export function StatusDot({ danger = false }: { danger?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 rounded-full ${danger ? "bg-[#a43434]" : "bg-[#247a51]"}`}
    />
  );
}
