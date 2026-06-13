import {
  Apple,
  Beef,
  Candy,
  Droplets,
  Egg,
  FlaskConical,
  Grid,
  Leaf,
  Package,
  Sun,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export interface MaterialCardTheme {
  bg: string;
  icon: string;
  text: string;
}

export interface IngredientGroupStyle {
  bg: string;
  color: string;
  icon: LucideIcon;
}

export const GROUP_STYLES: Record<string, IngredientGroupStyle> = {
  group_water_liquids: {
    icon: Droplets,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/20",
  },
  group_dairy_eggs: {
    icon: Egg,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
  },
  group_grains_baked: {
    icon: Wheat,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 border-yellow-100 dark:bg-yellow-500/10 dark:border-yellow-500/20",
  },
  group_proteins_meats: {
    icon: Beef,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
  },
  group_fruits_vegetables: {
    icon: Apple,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  },
  group_fats_oils: {
    icon: Droplets,
    color: "text-yellow-500 dark:text-yellow-300",
    bg: "bg-yellow-50 border-yellow-100 dark:bg-yellow-500/10 dark:border-yellow-500/20",
  },
  group_sugars_sweeteners: {
    icon: Candy,
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 border-fuchsia-100 dark:bg-fuchsia-500/10 dark:border-fuchsia-500/20",
  },
  group_spices_seasonings: {
    icon: Leaf,
    color: "text-lime-600 dark:text-lime-400",
    bg: "bg-lime-50 border-lime-100 dark:bg-lime-500/10 dark:border-lime-500/20",
  },
  group_functional_additives: {
    icon: FlaskConical,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 border-cyan-100 dark:bg-cyan-500/10 dark:border-cyan-500/20",
  },
  group_other: {
    icon: Package,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700",
  },
};

export const CARD_THEMES: MaterialCardTheme[] = [
  {
    bg: "bg-[#F0F9FF] dark:bg-sky-900/20",
    text: "text-sky-900 dark:text-sky-100",
    icon: "bg-sky-200 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300",
  },
  {
    bg: "bg-[#FDF2F8] dark:bg-pink-900/20",
    text: "text-pink-900 dark:text-pink-100",
    icon: "bg-pink-200 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300",
  },
  {
    bg: "bg-[#F0FDF4] dark:bg-emerald-900/20",
    text: "text-emerald-900 dark:text-emerald-100",
    icon: "bg-emerald-200 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  {
    bg: "bg-[#FFFBEB] dark:bg-amber-900/20",
    text: "text-amber-900 dark:text-amber-100",
    icon: "bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
  {
    bg: "bg-[#F5F3FF] dark:bg-violet-900/20",
    text: "text-violet-900 dark:text-violet-100",
    icon: "bg-violet-200 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300",
  },
];

export const getIconForCategory = (category: string) => {
  switch (category) {
    case "Stabilizers": {
      return <Grid size={20} />;
    }
    case "Sweeteners": {
      return <Droplets size={20} />;
    }
    case "Bases": {
      return <Leaf size={20} />;
    }
    case "Cultures": {
      return <Sun size={20} />;
    }
    default: {
      return <Package size={20} />;
    }
  }
};
