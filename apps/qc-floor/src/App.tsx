import { api } from "@flavoneer/backend/api";
import { useConvexAuth, useQuery } from "convex/react";
import { Box, Languages, Moon, PanelTopOpen, RotateCcw, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PRODUCTION_HALLS, type ProductionHallId } from "./floor/factory-layout";
import { applyLiveStatuses } from "./floor/live-data";
import { useI18n } from "./lib/i18n";
import {
  type CameraMode,
  type CameraRequest,
  ProductionHallScene,
} from "./scene/ProductionHallScene";
import { Inspector } from "./ui/Inspector";
import { SideRail } from "./ui/SideRail";

type Theme = "light" | "dark";
const ACTIVE_ORGANIZATION_STORAGE_KEY = "food-rd-lab-active-organization";

function App() {
  const { language, setLanguage, t } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const organizations = useQuery(api.organizations.list, isAuthenticated ? {} : "skip");
  const [now, setNow] = useState(() => Date.now());
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem("flavoneer.qc-floor-theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [activeHallId, setActiveHallId] = useState<ProductionHallId>("hall1");
  const [cameraRequest, setCameraRequest] = useState<CameraRequest>({
    mode: "overview",
    nonce: 0,
    selectedLine: null,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("flavoneer.qc-floor-theme", theme);
  }, [theme]);

  const storedOrganizationId = window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  const requestedOrganizationId = new URLSearchParams(window.location.search).get("organizationId");
  const activeOrganization =
    organizations?.find((organization) => organization._id === requestedOrganizationId) ??
    organizations?.find((organization) => organization._id === storedOrganizationId) ??
    organizations?.[0];
  const overview = useQuery(
    api.productionFloor.getOverview,
    activeOrganization ? { organizationId: activeOrganization._id, now } : "skip",
  );

  useEffect(() => {
    if (activeOrganization) {
      window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, activeOrganization._id);
      if (requestedOrganizationId) {
        const url = new URL(window.location.href);
        url.searchParams.delete("organizationId");
        window.history.replaceState({}, "", url);
      }
    }
  }, [activeOrganization, requestedOrganizationId]);

  const activeLayout = useMemo(
    () => applyLiveStatuses(PRODUCTION_HALLS[activeHallId], overview),
    [activeHallId, overview],
  );
  const hallName = t(activeHallId);
  const dataState = authLoading
    ? ("loading" as const)
    : !isAuthenticated
      ? ("signedOut" as const)
      : organizations === undefined || (activeOrganization && overview === undefined)
        ? ("loading" as const)
        : !activeOrganization
          ? ("noWorkspace" as const)
          : ("live" as const);
  const updatedLabel =
    dataState === "live" && overview
      ? new Intl.DateTimeFormat(language === "ar" ? "ar-PS" : "en", {
          hour: "numeric",
          minute: "2-digit",
        }).format(overview.generatedAt)
      : t(dataState);

  useEffect(() => {
    document.title = `${hallName} | Flavoneer QC`;
  }, [hallName]);

  const selectedEquipment = useMemo(
    () =>
      selectedLine
        ? activeLayout.equipment.filter(
            (equipment) => equipment.line === selectedLine && equipment.selectable !== false,
          )
        : [],
    [activeLayout, selectedLine],
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

  const selectHall = (hallId: ProductionHallId) => {
    if (hallId === activeHallId) {
      return;
    }
    setActiveHallId(hallId);
    setSelectedLine(null);
    setCameraRequest((current) => ({
      mode: "overview",
      nonce: current.nonce + 1,
      selectedLine: null,
    }));
  };

  return (
    <div className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <SideRail />

      <main className="workspace">
        <header className="topbar">
          <div className="topbar__identity">
            <p>
              {t("qualityControl")} <span className="topbar__separator">/</span> {hallName}
            </p>
            <h1>{t("hallSubtitle")}</h1>
          </div>
          <div className="topbar__actions">
            <div className="shift-state">
              <span
                className="live-dot"
                data-live={dataState === "live" || undefined}
                aria-hidden="true"
              />
              <span>
                <strong>{activeOrganization?.name ?? t("shift")}</strong>
                <small>{updatedLabel}</small>
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

        <section className="hall-workspace" aria-label={hallName}>
          <div className="canvas-panel">
            <ProductionHallScene
              cameraRequest={cameraRequest}
              layout={activeLayout}
              onSelect={selectLine}
              selectedLine={selectedLine}
            />

            <div className="canvas-heading">
              <span className="canvas-heading__icon">
                <Box aria-hidden="true" size={20} />
              </span>
              <span>
                <strong>{hallName}</strong>
              </span>
            </div>

            <fieldset className="hall-switcher">
              <legend className="visually-hidden">{t("switchHall")}</legend>
              {(["hall1", "hall2"] as const).map((hallId, index) => (
                <button
                  aria-label={t(hallId)}
                  aria-pressed={activeHallId === hallId}
                  data-active={activeHallId === hallId || undefined}
                  key={hallId}
                  onClick={() => selectHall(hallId)}
                  type="button"
                >
                  {index + 1}
                </button>
              ))}
            </fieldset>

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

          <Inspector
            dataState={dataState}
            layout={activeLayout}
            onSelect={selectLine}
            overview={overview}
            selected={selectedEquipment}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
