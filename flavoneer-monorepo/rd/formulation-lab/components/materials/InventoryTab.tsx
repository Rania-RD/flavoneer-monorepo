import { type HTMLMotionProps, motion } from "framer-motion";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  CheckSquare,
  Pencil,
  Plus,
  Printer,
  Square,
} from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";
import { CARD_THEMES, getIconForCategory } from "../../lib/materials/materialStyles";
import type { EnrichedInventoryItem } from "../../types";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
  }
>;

interface InventoryTabProps {
  filteredItems: EnrichedInventoryItem[];
  onAddMaterial: () => void;
  onEditItem: (item: EnrichedInventoryItem) => void;
  onPrintItem: (item: EnrichedInventoryItem) => void;
  onShowHistory: (item: EnrichedInventoryItem) => void;
  onToggleAll: () => void;
  onToggleSelection: (id: string) => void;
  selectedItems: Set<string>;
  t: TFunction;
}

interface InventoryCardProps {
  index: number;
  isSelected: boolean;
  item: EnrichedInventoryItem;
  onEditItem: (item: EnrichedInventoryItem) => void;
  onPrintItem: (item: EnrichedInventoryItem) => void;
  onShowHistory: (item: EnrichedInventoryItem) => void;
  onToggleSelection: (id: string) => void;
  t: TFunction;
}

const SelectAllToggle = ({
  filteredCount,
  onToggleAll,
  selectedCount,
  t,
}: {
  filteredCount: number;
  onToggleAll: () => void;
  selectedCount: number;
  t: TFunction;
}) => (
  <div className="flex w-fit items-center gap-3 rounded-xl border border-gray-100 bg-white/50 px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-slate-800/30">
    <button
      className="flex items-center justify-center text-gray-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
      onClick={onToggleAll}
    >
      {selectedCount === filteredCount ? (
        <CheckSquare
          className="text-indigo-600 dark:text-indigo-400"
          size={20}
        />
      ) : selectedCount > 0 ? (
        <div className="relative flex items-center justify-center">
          <Square className="text-gray-400" size={20} />
          <div className="absolute h-2.5 w-2.5 rounded-sm bg-indigo-600" />
        </div>
      ) : (
        <Square size={20} />
      )}
    </button>
    <span className="font-semibold text-gray-700 text-sm dark:text-gray-300">
      {selectedCount > 0
        ? t("selected_count", { count: selectedCount })
        : t("select_all")}
    </span>
  </div>
);

const InventoryCard = ({
  index,
  isSelected,
  item,
  onEditItem,
  onPrintItem,
  onShowHistory,
  onToggleSelection,
  t,
}: InventoryCardProps) => {
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const displayStock = `${item.stock.toFixed(1)} ${item.unit}`;

  return (
    <div
      className={`${theme.bg} ${isSelected ? "scale-[1.02] shadow-xl ring-2 ring-indigo-500 dark:ring-indigo-400" : ""} group relative flex h-[320px] cursor-pointer flex-col justify-between rounded-[2.5rem] p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border dark:border-white/5 dark:hover:bg-opacity-30`}
      data-testid="inventory-card"
      onClick={() => onShowHistory(item)}
    >
      <div className="z-10 flex items-start justify-between">
        <div className="flex items-center justify-center gap-3">
          <button
            className="flex-shrink-0 text-gray-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelection(item._id);
            }}
          >
            {isSelected ? (
              <CheckSquare
                className="text-indigo-600 dark:text-indigo-400"
                size={22}
              />
            ) : (
              <Square
                className="opacity-0 transition-opacity group-hover:opacity-100"
                size={22}
              />
            )}
          </button>
          <div
            className={`h-12 w-12 rounded-[1rem] ${theme.icon} flex items-center justify-center`}
          >
            {getIconForCategory(item.category)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className={`rounded-full p-2 transition-colors hover:bg-white/40 dark:hover:bg-white/10 ${theme.text} opacity-0 group-hover:opacity-100`}
            onClick={(event) => {
              event.stopPropagation();
              onEditItem(item);
            }}
            title={t("editMaterial")}
          >
            <Pencil size={18} />
          </button>
          <button
            className={`rounded-full p-2 transition-colors hover:bg-white/40 dark:hover:bg-white/10 ${theme.text} opacity-0 group-hover:opacity-100`}
            onClick={(event) => {
              event.stopPropagation();
              onPrintItem(item);
            }}
            title={t("print_label")}
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div className="z-10 mt-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-full bg-white/60 px-2.5 py-1 font-bold text-[10px] text-gray-600 uppercase tracking-wide backdrop-blur-sm dark:bg-white/10 dark:text-gray-300">
            {t(`category_${item.category.toLowerCase().replace(/ /g, "_")}`)}
          </span>
          {item.stockStatus === "low" && (
            <span className="flex items-center gap-1 rounded-full bg-red-100/80 px-2.5 py-1 font-bold text-[10px] text-red-600 uppercase tracking-wide backdrop-blur-sm dark:bg-red-500/30 dark:text-red-200">
              <AlertTriangle size={10} /> {t("low")}
            </span>
          )}
        </div>
        <h3 className={`font-bold text-2xl ${theme.text} mb-1 leading-tight`}>
          {item.name}
        </h3>
        <p className={`font-medium text-sm ${theme.text} font-mono opacity-70`}>
          {item.batchId}
        </p>
      </div>

      <div className="z-10 mt-auto space-y-3 rounded-[1.5rem] bg-white/40 p-4 backdrop-blur-sm dark:bg-black/20">
        <div className="flex items-center justify-between">
          <span
            className={`font-bold text-xs uppercase tracking-wide ${theme.text} opacity-60`}
          >
            {t("current_stock")}
          </span>
          <span className={`font-bold text-lg ${theme.text}`}>
            {displayStock}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`font-bold text-xs uppercase tracking-wide ${theme.text} opacity-60`}
          >
            {t("expires")}
          </span>
          <span
            className={`font-bold text-sm ${item.expiryStatus === "expiring" ? "text-red-600 dark:text-red-300" : theme.text}`}
          >
            {item.expiryDate}
          </span>
        </div>

        {item.usedIn && item.usedIn.length > 0 && (
          <div className="flex items-center gap-2 overflow-hidden border-gray-900/5 border-t pt-2 dark:border-white/10">
            <span
              className={`text-[10px] ${theme.text} whitespace-nowrap opacity-60`}
            >
              {t("used_in")}
            </span>
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {item.usedIn?.map((project) => (
                <Link
                  className="whitespace-nowrap rounded-full bg-white/60 px-2 py-0.5 font-medium text-[10px] text-gray-700 transition-colors hover:bg-white dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
                  key={project.id}
                  to={`/project/${project.id}`}
                >
                  {project.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AddMaterialCard = ({
  onAddMaterial,
  t,
}: {
  onAddMaterial: () => void;
  t: TFunction;
}) => (
  <button
    className="group flex h-[320px] flex-col items-center justify-center gap-4 rounded-[2.5rem] border-2 border-gray-200 border-dashed text-gray-400 transition-all hover:border-gray-300 hover:bg-gray-50/50 hover:text-gray-500 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
    data-testid="add-material-card"
    onClick={onAddMaterial}
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-[1rem] bg-gray-100 shadow-sm transition-transform group-hover:scale-110 dark:bg-slate-800">
      <Plus size={32} />
    </div>
    <span className="font-medium text-lg">{t("addMaterial")}</span>
    <span className="font-bold text-sm">{t("addMaterial")}</span>
  </button>
);

export const InventoryTab = ({
  filteredItems,
  onAddMaterial,
  onEditItem,
  onPrintItem,
  onShowHistory,
  onToggleAll,
  onToggleSelection,
  selectedItems,
  t,
}: InventoryTabProps) => (
  <MotionDiv
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
    exit={{ opacity: 0, y: -10 }}
    initial={{ opacity: 0, y: 10 }}
    key="current-tab"
  >
    {filteredItems.length > 0 && (
      <SelectAllToggle
        filteredCount={filteredItems.length}
        onToggleAll={onToggleAll}
        selectedCount={selectedItems.size}
        t={t}
      />
    )}

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredItems.map((item, index) => (
        <InventoryCard
          index={index}
          isSelected={selectedItems.has(item._id)}
          item={item}
          key={item._id}
          onEditItem={onEditItem}
          onPrintItem={onPrintItem}
          onShowHistory={onShowHistory}
          onToggleSelection={onToggleSelection}
          t={t}
        />
      ))}
      <AddMaterialCard onAddMaterial={onAddMaterial} t={t} />
    </div>
  </MotionDiv>
);
