import { type HTMLMotionProps, motion } from "framer-motion";
import type { TFunction } from "i18next";
import { AlertCircle, Copy, Package, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { GROUP_STYLES } from "../../lib/materials/materialStyles";
import type { IngredientListItem } from "../../types";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
  }
>;

interface IngredientLibraryTabProps {
  ingredients: IngredientListItem[];
  onAddIngredient: () => void;
  onDeleteIngredient: (ingredient: IngredientListItem) => void;
  onDuplicateIngredient: (ingredient: IngredientListItem) => void;
  onViewIngredient: (ingredient: IngredientListItem) => void;
  t: TFunction;
}

type IngredientCardProps = Omit<
  IngredientLibraryTabProps,
  "ingredients" | "onAddIngredient"
> & {
  ingredient: IngredientListItem;
};

const EmptyLibrary = ({
  onAddIngredient,
  t,
}: {
  onAddIngredient: () => void;
  t: TFunction;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center rounded-[2.5rem] border border-gray-200 border-dashed bg-gray-50/50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/30">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
      <Package size={32} strokeWidth={1.5} />
    </div>
    <h3 className="mb-2 font-bold text-gray-900 text-xl dark:text-white">
      {t("ingredient_library")}
    </h3>
    <p className="mb-6 max-w-md text-gray-500 text-sm dark:text-slate-400">
      {t("library_placeholder_desc")}
    </p>
    <button
      className="flex items-center gap-2 rounded-[1.2rem] bg-indigo-600 px-6 py-3 font-bold text-sm text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-95"
      onClick={onAddIngredient}
    >
      <Plus size={18} /> {t("add_ingredient")}
    </button>
  </div>
);

const IngredientCard = ({
  ingredient,
  onDeleteIngredient,
  onDuplicateIngredient,
  onViewIngredient,
  t,
}: IngredientCardProps) => {
  const style =
    GROUP_STYLES[ingredient.groupId || "group_other"] || GROUP_STYLES.group_other;
  const Icon = style.icon;

  return (
    <div
      className={`group relative flex h-[280px] cursor-pointer flex-col justify-between overflow-hidden rounded-[2.5rem] border ${ingredient.coverImageUrl ? "bg-white dark:bg-slate-800" : style.bg} transition-all hover:-translate-y-1 hover:shadow-lg`}
      onClick={() => onViewIngredient(ingredient)}
    >
      {ingredient.coverImageUrl && (
        <div className="absolute inset-x-0 top-0 z-0 h-[140px]">
          <img
            alt={ingredient.name}
            className="h-full w-full object-cover"
            src={ingredient.coverImageUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-80" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent dark:from-slate-800" />
        </div>
      )}

      <div className="z-10 flex w-full items-start justify-between p-7 pb-0">
        {!ingredient.coverImageUrl && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white shadow-sm dark:bg-slate-800 ${style.color}`}
          >
            <Icon size={24} />
          </div>
        )}
        <div className="ms-auto flex flex-col items-end gap-2 text-end">
          {ingredient.outOfSync && (
            <div
              className={`flex animate-pulse items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-600 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-400 ${ingredient.coverImageUrl ? "mt-2" : ""}`}
            >
              <AlertCircle size={14} />
              <span className="font-bold text-[10px] uppercase tracking-wider">
                {t("out_of_sync")}
              </span>
            </div>
          )}
          <div
            className={`flex items-center gap-2 ${ingredient.coverImageUrl && !ingredient.outOfSync ? "mt-2" : ""}`}
          >
            <button
              className="rounded-full bg-white/60 p-2 text-gray-500 opacity-0 backdrop-blur-sm transition-colors hover:bg-white group-hover:opacity-100 dark:bg-slate-800/60 dark:text-gray-300 dark:hover:bg-slate-700"
              onClick={(event) => {
                event.stopPropagation();
                onDuplicateIngredient(ingredient);
              }}
              title={t("duplicate")}
            >
              <Copy size={16} />
            </button>
            <button
              className="rounded-full bg-red-50/60 p-2 text-red-500 opacity-0 backdrop-blur-sm transition-colors hover:bg-red-100 group-hover:opacity-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteIngredient(ingredient);
              }}
              title={t("delete")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`z-10 h-full px-7 ${ingredient.coverImageUrl ? "mt-[100px]" : "mt-4"}`}
      >
        <h3 className="relative mb-1 truncate font-bold text-gray-900 text-xl leading-tight drop-shadow-sm dark:text-white">
          {ingredient.name}
        </h3>
        {ingredient.commonName && (
          <p className="truncate font-medium text-gray-500 text-sm dark:text-gray-400">
            {ingredient.commonName}
          </p>
        )}
        <span
          className={`mt-2 inline-block rounded ${ingredient.coverImageUrl ? "bg-gray-100 dark:bg-slate-700/60" : "bg-white/60 dark:bg-slate-800/60"} px-2 py-0.5 font-medium text-xs dark:text-slate-300`}
        >
          {t(ingredient.groupId || "group_other")}
        </span>
        {ingredient.code && (
          <span
            className={`ms-2 mt-2 inline-block rounded ${ingredient.coverImageUrl ? "bg-gray-100 dark:bg-slate-700/60" : "bg-white/60 dark:bg-slate-800/60"} px-2 py-0.5 font-mono text-gray-600 text-xs dark:text-slate-300`}
          >
            {ingredient.code}
          </span>
        )}
      </div>
      <div className="z-10 mx-7 mt-auto mb-7 flex items-center justify-between rounded-[1.5rem] bg-white/60 p-4 font-semibold text-sm dark:bg-slate-800/60">
        <span className="text-gray-500 dark:text-gray-400">
          {t("yield_percentage")}
        </span>
        <span className="text-gray-900 dark:text-gray-100">
          {ingredient.yieldAmount}%
        </span>
      </div>
    </div>
  );
};

const AddIngredientCard = ({
  onAddIngredient,
  t,
}: {
  onAddIngredient: () => void;
  t: TFunction;
}) => (
  <button
    className="group flex h-[280px] flex-col items-center justify-center gap-4 rounded-[2.5rem] border-2 border-gray-200 border-dashed text-gray-400 transition-all hover:border-gray-300 hover:bg-gray-50/50 hover:text-gray-500 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
    onClick={onAddIngredient}
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-[1rem] bg-gray-100 shadow-sm transition-transform group-hover:scale-110 dark:bg-slate-800">
      <Plus size={32} />
    </div>
    <span className="font-medium text-lg">{t("add_ingredient")}</span>
  </button>
);

export const IngredientLibraryTab = ({
  ingredients,
  onAddIngredient,
  onDeleteIngredient,
  onDuplicateIngredient,
  onViewIngredient,
  t,
}: IngredientLibraryTabProps) => (
  <MotionDiv
    animate={{ opacity: 1, y: 0 }}
    className="flex min-h-[400px] flex-col rounded-[2.5rem]"
    exit={{ opacity: 0, y: -10 }}
    initial={{ opacity: 0, y: 10 }}
    key="library-tab"
  >
    {ingredients.length === 0 ? (
      <EmptyLibrary onAddIngredient={onAddIngredient} t={t} />
    ) : (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ingredients.map((ingredient) => (
          <IngredientCard
            ingredient={ingredient}
            key={ingredient._id}
            onDeleteIngredient={onDeleteIngredient}
            onDuplicateIngredient={onDuplicateIngredient}
            onViewIngredient={onViewIngredient}
            t={t}
          />
        ))}
        <AddIngredientCard onAddIngredient={onAddIngredient} t={t} />
      </div>
    )}
  </MotionDiv>
);
