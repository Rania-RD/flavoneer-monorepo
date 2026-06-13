import { Plus, Search } from "lucide-react";
import type { TFunction } from "i18next";

interface MaterialsHeaderProps {
  activeTab: "current" | "library";
  onAddMaterial: () => void;
  onSearchChange: (value: string) => void;
  searchTerm: string;
  t: TFunction;
}

export const MaterialsHeader = ({
  activeTab,
  onAddMaterial,
  onSearchChange,
  searchTerm,
  t,
}: MaterialsHeaderProps) => (
  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
    <div>
      <h1
        className="font-bold text-4xl text-gray-900 tracking-tight dark:text-white"
        data-testid="materials-page-title"
      >
        {t("materials")}
      </h1>
      <p className="mt-2 font-medium text-gray-500 dark:text-slate-400">
        {t("manage_stock_levels_and_batch_expiry")}
      </p>
    </div>

    <div className="flex w-full items-center gap-4 md:w-auto">
      {activeTab === "current" && (
        <>
          <div className="group relative flex-1 md:flex-none">
            <Search
              className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-900 dark:text-slate-500 dark:group-focus-within:text-white"
              size={20}
            />
            <input
              className="w-full rounded-full bg-white py-3 ps-11 pe-6 font-medium text-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 md:w-64 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:ring-indigo-500/50"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("search_inventory_placeholder")}
              type="text"
              value={searchTerm}
            />
          </div>
          <button
            className="flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded-full bg-gray-900 px-5 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-colors hover:bg-gray-800 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
            data-testid="add-material-button"
            onClick={onAddMaterial}
            title={t("add_material")}
          >
            <Plus size={20} />
            <span>{t("add_material")}</span>
          </button>
        </>
      )}
    </div>
  </div>
);
