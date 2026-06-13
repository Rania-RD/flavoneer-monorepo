import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../convex/_generated/api";

interface GsfaCategoryValue {
  code?: string;
  name?: string;
}

interface GsfaCategorySelectProps {
  inputClassName: string;
  labelClassName?: string;
  onChange: (value: GsfaCategoryValue) => void;
  value: GsfaCategoryValue;
}

export const GsfaCategorySelect: React.FC<GsfaCategorySelectProps> = ({
  inputClassName,
  labelClassName,
  onChange,
  value,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const categories = useQuery(api.regulatory.searchFoodCategories, {
    search,
    limit: 80,
  });

  const selectedValue = value.code
    ? `${value.code} ${value.name ?? ""}`.trim()
    : "";

  const options = useMemo(() => {
    const base = (categories ?? []).map((category) => ({
      code: category.code,
      name: category.name,
    }));
    if (
      value.code &&
      !base.some((category) => category.code === value.code)
    ) {
      return [
        {
          code: value.code,
          name: value.name ?? value.code,
        },
        ...base,
      ];
    }
    return base;
  }, [categories, value.code, value.name]);

  return (
    <div className="space-y-2">
      <label className={labelClassName}>{t("gsfa_category")}</label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <input
          className={`${inputClassName} ps-10`}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search_gsfa_category")}
          value={search || selectedValue}
        />
      </div>
      <select
        className={inputClassName}
        onChange={(event) => {
          const selected = options.find(
            (category) => category.code === event.target.value
          );
          onChange({
            code: selected?.code,
            name: selected?.name,
          });
          if (selected) {
            setSearch("");
          }
        }}
        value={value.code ?? ""}
      >
        <option value="">{t("select_gsfa_category")}</option>
        {options.map((category) => (
          <option key={category.code} value={category.code}>
            {category.code} · {category.name}
          </option>
        ))}
      </select>
      {categories?.length === 0 && (
        <p className="text-gray-500 text-xs dark:text-slate-400">
          {t("no_gsfa_categories_found")}
        </p>
      )}
    </div>
  );
};
