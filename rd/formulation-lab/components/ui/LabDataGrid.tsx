import {
  AG_GRID_LOCALE_EG,
  AG_GRID_LOCALE_EN,
} from "@ag-grid-community/locale";
import {
  type ColDef,
  type LocaleText,
  themeQuartz,
} from "ag-grid-community";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../context/SettingsContext";

const labGridTheme = themeQuartz
  .withParams(
    {
      accentColor: "#1c4a3c",
      autoHeightMinBodyHeight: 0,
      backgroundColor: "transparent",
      borderColor: "rgba(28, 74, 60, 0.14)",
      borderRadius: 0,
      browserColorScheme: "light",
      cellHorizontalPadding: 24,
      checkboxBorderRadius: 5,
      columnBorder: false,
      fontFamily: '"DM Sans", "Tajawal", "IBM Plex Sans Arabic", sans-serif',
      fontSize: 14,
      foregroundColor: "#173e33",
      headerBackgroundColor: "transparent",
      headerFontSize: 14,
      headerFontWeight: 600,
      headerTextColor: "#527568",
      oddRowBackgroundColor: "transparent",
      rowBorder: { color: "rgba(28, 74, 60, 0.1)" },
      selectedRowBackgroundColor: "rgba(210, 242, 212, 0.7)",
      spacing: 7,
      wrapperBorder: false,
    },
    "light"
  )
  .withParams(
    {
      accentColor: "#f5a623",
      autoHeightMinBodyHeight: 0,
      backgroundColor: "transparent",
      borderColor: "rgba(210, 242, 212, 0.12)",
      browserColorScheme: "dark",
      foregroundColor: "#f7f4df",
      headerBackgroundColor: "transparent",
      headerTextColor: "#a9cbbb",
      oddRowBackgroundColor: "transparent",
      rowBorder: { color: "rgba(210, 242, 212, 0.1)" },
      selectedRowBackgroundColor: "rgba(245, 166, 35, 0.18)",
    },
    "dark"
  );

type LabDataGridProps<TData> = AgGridReactProps<TData> & {
  className?: string;
};

export function LabDataGrid<TData>({
  className = "",
  defaultColDef,
  ...props
}: LabDataGridProps<TData>) {
  const { t } = useTranslation();
  const { isRTL } = useSettings();
  const localizedText = useMemo<LocaleText>(
    () => ({
      ...(isRTL ? AG_GRID_LOCALE_EG : AG_GRID_LOCALE_EN),
      andCondition: t("grid_and"),
      applyFilter: t("grid_apply"),
      autosizeAllColumns: t("grid_autosize_all"),
      autosizeThisColumn: t("grid_autosize_column"),
      blank: t("grid_blank"),
      cancelFilter: t("grid_cancel"),
      clearFilter: t("grid_clear"),
      columns: t("grid_columns"),
      contains: t("grid_contains"),
      endsWith: t("grid_ends_with"),
      equals: t("grid_equals"),
      filterOoo: t("grid_filter"),
      filters: t("grid_filters"),
      greaterThan: t("grid_greater_than"),
      greaterThanOrEqual: t("grid_greater_than_or_equal"),
      inRange: t("grid_in_range"),
      lessThan: t("grid_less_than"),
      lessThanOrEqual: t("grid_less_than_or_equal"),
      loadingOoo: t("loading"),
      noMatches: t("grid_no_matches"),
      noRowsToShow: t("no_data"),
      noSort: t("grid_clear_sort"),
      notBlank: t("grid_not_blank"),
      notContains: t("grid_not_contains"),
      notEqual: t("grid_not_equal"),
      orCondition: t("grid_or"),
      pinColumn: t("grid_pin_column"),
      resetFilter: t("reset"),
      searchOoo: t("grid_search"),
      selectAll: t("select_all"),
      sortAscending: t("grid_sort_ascending"),
      sortDescending: t("grid_sort_descending"),
      startsWith: t("grid_starts_with"),
    }),
    [isRTL, t]
  );
  const mergedDefaultColDef = useMemo<ColDef<TData>>(
    () => ({
      filter: true,
      minWidth: 120,
      resizable: true,
      sortable: true,
      suppressHeaderMenuButton: false,
      ...defaultColDef,
    }),
    [defaultColDef]
  );

  return (
    <div className={`lab-data-grid ${className}`}>
      <AgGridReact<TData>
        animateRows
        defaultColDef={mergedDefaultColDef}
        domLayout="autoHeight"
        enableRtl={isRTL}
        headerHeight={48}
        localeText={localizedText}
        rowHeight={52}
        theme={labGridTheme}
        {...props}
      />
    </div>
  );
}
