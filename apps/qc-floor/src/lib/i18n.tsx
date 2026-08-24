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
    hall1: "Production hall 1",
    hall2: "Production hall 2",
    hallSubtitle: "Live equipment map",
    overview: "Overview",
    records: "QC records",
    reports: "Reports",
    settings: "Settings",
    shift: "Morning shift",
    live: "Live",
    loading: "Connecting to QC data",
    signedOut: "Sign in required",
    noWorkspace: "No production workspace",
    liveData: "Live QC data",
    equipment: "Equipment",
    lines: "lines",
    normal: "Normal",
    pending: "Pending review",
    attention: "Out of limit",
    unknown: "No inspection data",
    selectedEquipment: "Selected equipment",
    selectedLine: "Selected production line",
    hallOverview: "Hall overview",
    hallOverviewNote: "Select a production line to inspect its QC state.",
    line: "Production line",
    dimensions: "Metric envelope",
    latestInspection: "Latest inspection",
    noInspectionData: "No inspection in the last 30 days",
    product: "Product",
    inspectedBy: "QC inspector",
    inspections24h: "Inspections · 24h",
    conformance: "Conformance",
    pendingRecords: "Pending records",
    approvedRecords: "Approved records",
    outOfLimitRecords: "Out of limit",
    openRecords: "Open QC records",
    openLatestRecord: "Open latest QC record",
    signInToLoad: "Sign in to load QC data",
    resetView: "Reset view",
    topView: "Top view",
    dragHint: "Drag to pan · Shift + drag to orbit · Scroll to zoom",
    language: "العربية",
    theme: "Toggle color theme",
    hallStatus: "Hall status",
    equipmentCount: "equipment units",
    productionLines: "Production lines",
    switchHall: "Switch production hall",
    close: "Close inspector",
    facility: "Facility",
    machine: "Machine",
  },
  ar: {
    appName: "فلافونير",
    qualityControl: "مراقبة الجودة",
    hall1: "صالة الإنتاج 1",
    hall2: "صالة الإنتاج 2",
    hallSubtitle: "خريطة المعدات المباشرة",
    overview: "نظرة عامة",
    records: "سجلات الجودة",
    reports: "التقارير",
    settings: "الإعدادات",
    shift: "الوردية الصباحية",
    live: "مباشر",
    loading: "جارٍ الاتصال ببيانات الجودة",
    signedOut: "تسجيل الدخول مطلوب",
    noWorkspace: "لا توجد مساحة عمل للإنتاج",
    liveData: "بيانات جودة مباشرة",
    equipment: "المعدات",
    lines: "خطوط",
    normal: "طبيعي",
    pending: "بانتظار المراجعة",
    attention: "خارج الحدود",
    unknown: "لا توجد بيانات فحص",
    selectedEquipment: "المعدة المحددة",
    selectedLine: "خط الإنتاج المحدد",
    hallOverview: "نظرة عامة على الصالة",
    hallOverviewNote: "اختر خط إنتاج لمراجعة حالة الجودة.",
    line: "خط الإنتاج",
    dimensions: "الأبعاد المترية",
    latestInspection: "آخر فحص",
    noInspectionData: "لا يوجد فحص خلال آخر 30 يومًا",
    product: "المنتج",
    inspectedBy: "مفتش الجودة",
    inspections24h: "فحوصات · 24 ساعة",
    conformance: "المطابقة",
    pendingRecords: "سجلات معلّقة",
    approvedRecords: "سجلات معتمدة",
    outOfLimitRecords: "خارج الحدود",
    openRecords: "فتح سجلات الجودة",
    openLatestRecord: "فتح أحدث سجل جودة",
    signInToLoad: "سجّل الدخول لتحميل بيانات الجودة",
    resetView: "إعادة ضبط العرض",
    topView: "من الأعلى",
    dragHint: "اسحب للتحريك · Shift + اسحب للدوران · مرّر للتقريب",
    language: "English",
    theme: "تبديل ألوان الواجهة",
    hallStatus: "حالة الصالة",
    equipmentCount: "وحدة معدات",
    productionLines: "خطوط الإنتاج",
    switchHall: "تبديل صالة الإنتاج",
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
