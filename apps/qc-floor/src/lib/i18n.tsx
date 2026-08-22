import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Language = "en" | "ar";

const messages = {
  en: {
    appName: "Flavoneer",
    qualityControl: "Quality control",
    hallTitle: "Production hall 1",
    hallSubtitle: "Live equipment map",
    overview: "Overview",
    records: "QC records",
    reports: "Reports",
    settings: "Settings",
    shift: "Morning shift",
    live: "Live",
    updated: "Updated 2 min ago",
    equipment: "Equipment",
    lines: "lines",
    normal: "Normal",
    pending: "Pending review",
    attention: "Out of limit",
    selectedEquipment: "Selected equipment",
    selectedLine: "Selected production line",
    hallOverview: "Hall overview",
    hallOverviewNote: "Select a production line to inspect its QC state.",
    line: "Production line",
    dimensions: "Metric envelope",
    latestInspection: "Latest inspection",
    latestInspectionValue: "Today, 09:42",
    openRecords: "Open QC records",
    resetView: "Reset view",
    topView: "Top view",
    dragHint: "Drag to pan · Shift + drag to orbit · Scroll to zoom",
    language: "العربية",
    theme: "Toggle color theme",
    hallStatus: "Hall status",
    hallStatusValue: "1 exception · 1 pending line",
    equipmentCount: "equipment units",
    productionLines: "Production lines",
    close: "Close inspector",
    facility: "Facility",
    machine: "Machine",
  },
  ar: {
    appName: "فلافونير",
    qualityControl: "مراقبة الجودة",
    hallTitle: "صالة الإنتاج 1",
    hallSubtitle: "خريطة المعدات المباشرة",
    overview: "نظرة عامة",
    records: "سجلات الجودة",
    reports: "التقارير",
    settings: "الإعدادات",
    shift: "الوردية الصباحية",
    live: "مباشر",
    updated: "حُدّث قبل دقيقتين",
    equipment: "المعدات",
    lines: "خطوط",
    normal: "طبيعي",
    pending: "بانتظار المراجعة",
    attention: "خارج الحدود",
    selectedEquipment: "المعدة المحددة",
    selectedLine: "خط الإنتاج المحدد",
    hallOverview: "نظرة عامة على الصالة",
    hallOverviewNote: "اختر خط إنتاج لمراجعة حالة الجودة.",
    line: "خط الإنتاج",
    dimensions: "الأبعاد المترية",
    latestInspection: "آخر فحص",
    latestInspectionValue: "اليوم، 09:42",
    openRecords: "فتح سجلات الجودة",
    resetView: "إعادة ضبط العرض",
    topView: "من الأعلى",
    dragHint: "اسحب للتحريك · Shift + اسحب للدوران · مرّر للتقريب",
    language: "English",
    theme: "تبديل ألوان الواجهة",
    hallStatus: "حالة الصالة",
    hallStatusValue: "استثناء واحد · خط واحد قيد المراجعة",
    equipmentCount: "وحدة معدات",
    productionLines: "خطوط الإنتاج",
    close: "إغلاق لوحة التفاصيل",
    facility: "مرافق",
    machine: "ماكينة",
  },
} as const;

type MessageKey = keyof (typeof messages)["en"];

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = window.localStorage.getItem("flavoneer.qc-floor-language");
    return saved === "ar" ? "ar" : "en";
  });

  useEffect(() => {
    window.localStorage.setItem("flavoneer.qc-floor-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = useCallback((key: MessageKey) => messages[language][key], [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
