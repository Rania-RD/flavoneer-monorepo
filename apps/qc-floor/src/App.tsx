import { Box, Languages, Moon, PanelTopOpen, RotateCcw, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PRODUCTION_HALL_1 } from "./floor/factory-layout";
import { useI18n } from "./lib/i18n";
import {
  type CameraMode,
  type CameraRequest,
  ProductionHallScene,
} from "./scene/ProductionHallScene";
import { Inspector } from "./ui/Inspector";
import { SideRail } from "./ui/SideRail";

type Theme = "light" | "dark";

function App() {
  const { language, setLanguage, t } = useI18n();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem("flavoneer.qc-floor-theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest>({
    mode: "overview",
    nonce: 0,
    selectedLine: null,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("flavoneer.qc-floor-theme", theme);
  }, [theme]);

  const selectedEquipment = useMemo(
    () =>
      selectedLine
        ? PRODUCTION_HALL_1.equipment.filter(
            (equipment) => equipment.line === selectedLine && equipment.selectable !== false,
          )
        : [],
    [selectedLine],
  );

  const requestCamera = (mode: CameraMode, line = selectedLine) => {
    setCameraRequest((current) => ({
      mode,
      nonce: current.nonce + 1,
      selectedLine: line,
    }));
  };

  const selectLine = (line: string) => {
    const nextLine = line || null;
    setSelectedLine(nextLine);
    if (nextLine) {
      requestCamera("selected", nextLine);
    }
  };

  return (
    <div className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <SideRail />

      <main className="workspace">
        <header className="topbar">
          <div className="topbar__identity">
            <p>
              {t("qualityControl")} <span className="topbar__separator">/</span> {t("hallTitle")}
            </p>
            <h1>{t("hallSubtitle")}</h1>
          </div>
          <div className="topbar__actions">
            <div className="shift-state">
              <span className="live-dot" aria-hidden="true" />
              <span>
                <strong>{t("shift")}</strong>
                <small>{t("updated")}</small>
              </span>
            </div>
            <button
              aria-label={t("language")}
              className="icon-button language-button"
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              type="button"
            >
              <Languages aria-hidden="true" size={18} />
              <span className="language-button__label">{t("language")}</span>
            </button>
            <button
              aria-label={t("theme")}
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              type="button"
            >
              {theme === "light" ? (
                <Moon aria-hidden="true" size={18} />
              ) : (
                <Sun aria-hidden="true" size={18} />
              )}
            </button>
          </div>
        </header>

        <section className="hall-workspace" aria-label={t("hallTitle")}>
          <div className="canvas-panel">
            <ProductionHallScene
              cameraRequest={cameraRequest}
              onSelect={selectLine}
              selectedLine={selectedLine}
            />

            <div className="canvas-heading">
              <span className="canvas-heading__icon">
                <Box aria-hidden="true" size={20} />
              </span>
              <span>
                <strong>{t("hallTitle")}</strong>
              </span>
            </div>

            <div className="view-controls" aria-label={t("overview")} role="toolbar">
              <button onClick={() => requestCamera("overview", null)} type="button">
                <RotateCcw aria-hidden="true" size={17} />
                <span>{t("resetView")}</span>
              </button>
              <button onClick={() => requestCamera("top", null)} type="button">
                <PanelTopOpen aria-hidden="true" size={17} />
                <span>{t("topView")}</span>
              </button>
            </div>

            <div className="canvas-footer">
              <span className="canvas-footer__hint">{t("dragHint")}</span>
            </div>
          </div>

          <Inspector onSelect={selectLine} selected={selectedEquipment} />
        </section>
      </main>
    </div>
  );
}

export default App;
