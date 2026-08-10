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
    color: "text-brand-primary dark:text-brand-accent-hover",
    bg: "bg-brand-mint border-brand-primary/20 dark:bg-brand-accent/10 dark:border-brand-mint/20",
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
    color: "text-brand-primary dark:text-brand-accent-hover",
    bg: "bg-brand-mint border-brand-primary/20 dark:bg-brand-accent/10 dark:border-brand-mint/20",
  },
  group_other: {
    icon: Package,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700",
  },
};

export const CARD_THEMES: MaterialCardTheme[] = [
  {
    bg: "bg-[#dff4dc] dark:bg-[#214f40]",
    text: "text-[#173e33] dark:text-[#f7f4df]",
    icon: "bg-[#bfe6c0] text-[#1c4a3c] dark:bg-[#d2f2d4]/12 dark:text-[#d2f2d4]",
  },
  {
    bg: "bg-[#fff2cf] dark:bg-[#3e4a2f]",
    text: "text-[#644107] dark:text-[#fff5d4]",
    icon: "bg-[#f8d681] text-[#74480a] dark:bg-[#f5a623]/15 dark:text-[#ffc760]",
  },
  {
    bg: "bg-[#e8f1da] dark:bg-[#294b3b]",
    text: "text-[#294934] dark:text-[#f3f7e7]",
    icon: "bg-[#cfdfb5] text-[#315b3d] dark:bg-[#d2f2d4]/12 dark:text-[#d2f2d4]",
  },
  {
    bg: "bg-[#ffe1c8] dark:bg-[#4b3a2a]",
    text: "text-[#743f24] dark:text-[#fff0df]",
    icon: "bg-[#ffc190] text-[#a84417] dark:bg-[#ff7738]/15 dark:text-[#ffc5b2]",
  },
  {
    bg: "bg-[#d9f1e6] dark:bg-[#1d5044]",
    text: "text-[#18493d] dark:text-[#ecfff5]",
    icon: "bg-[#b4ddca] text-[#1c4a3c] dark:bg-[#d2f2d4]/12 dark:text-[#d2f2d4]",
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
