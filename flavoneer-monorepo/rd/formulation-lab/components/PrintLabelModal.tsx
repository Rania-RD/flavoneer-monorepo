import { AnimatePresence } from "framer-motion";
import JsBarcode from "jsbarcode";
import {
  Calendar,
  MapPin,
  Package,
  Printer,
  Thermometer,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { renderToString } from "react-dom/server";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import type { EnrichedInventoryItem } from "../types";

interface PrintLabelModalProps {
  item: EnrichedInventoryItem | null;
  onClose: () => void;
}

const PrintLabelModal: React.FC<PrintLabelModalProps> = ({ item, onClose }) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (item && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, item.batchId, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: false,
          margin: 0,
          background: "transparent",
        });
      } catch {
        // If barcode generation fails, leave SVG empty
      }
    }
  }, [item]);

  if (!item) {
    return null;
  }

  const handlePrint = () => {
    // Generate the barcode SVG into a hidden element to capture its markup
    const tempSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    try {
      JsBarcode(tempSvg, item.batchId, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
        background: "#ffffff",
      });
    } catch {
      // fallback: no barcode
    }
    const barcodeSvgMarkup = tempSvg.outerHTML;

    // Build detail rows
    const details: { label: string; value: string; icon?: string }[] = [
      { label: t("current_stock"), value: `${item.stock} ${item.unit}` },
      {
        label: t("expiry_date"),
        value: item.expiryDate,
        icon: renderToString(<Calendar size={12} strokeWidth={2.5} />),
      },
    ];
    if (item.description) {
      details.push({ label: t("description"), value: item.description });
    }
    if (item.supplier) {
      details.push({
        label: t("supplier"),
        value: item.supplier,
        icon: renderToString(<MapPin size={12} strokeWidth={2.5} />),
      });
    }
    if (item.storageConditions) {
      details.push({
        label: t("storage"),
        value: item.storageConditions,
        icon: renderToString(<Thermometer size={12} strokeWidth={2.5} />),
      });
    }

    const detailsHtml = details
      .map(
        (d) => `
      <div dir={isRTL ? "rtl" : "ltr"} style="background:#f9fafb;border-radius:12px;padding:10px 14px;">
        <div dir={isRTL ? "rtl" : "ltr"} style="display:flex;align-items:center;gap:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:2px;">
          ${d.icon ? d.icon : ""}${d.label}
        </div>
        <div dir={isRTL ? "rtl" : "ltr"} style="font-size:14px;font-weight:700;color:#111827;">${d.value}</div>
      </div>
    `
      )
      .join("");

    const usedInHtml =
      item.usedIn && item.usedIn.length > 0
        ? `
      <div dir={isRTL ? "rtl" : "ltr"} style="margin-top:12px;padding-top:12px;border-top:1px solid #f3f4f6;">
        <div dir={isRTL ? "rtl" : "ltr"} style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:6px;">Used In</div>
        <div dir={isRTL ? "rtl" : "ltr"} style="display:flex;flex-wrap:wrap;gap:6px;">
          ${item.usedIn
            .map(
              (p) =>
                `<span style="padding:3px 10px;background:#f3f4f6;border-radius:999px;font-size:11px;font-weight:500;color:#4b5563;">${p.name}</span>`
            )
            .join("")}
        </div>
      </div>
    `
        : "";

    const labelHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Label — ${item.name} (${item.batchId})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #ffffff;
      display: flex;
      justify-content: center;
      padding: 24px;
    }
    .label {
      width: 100%;
      max-width: 420px;
      border: 2px solid #e5e7eb;
      border-radius: 20px;
      padding: 24px;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .name {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      line-height: 1.2;
    }
    .category {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 12px;
      background: #f3f4f6;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #4b5563;
    }
    .icon-box {
      width: 36px;
      height: 36px;
      background: #f3f4f6;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      margin-left: 12px;
    }
    .barcode-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0;
      border-top: 1px solid #f3f4f6;
      border-bottom: 1px solid #f3f4f6;
    }
    .barcode-section svg {
      width: 100%;
      max-width: 260px;
      height: auto;
    }
    .batch-id {
      margin-top: 8px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      letter-spacing: 0.1em;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 16px;
    }
    .details-grid > div:only-child,
    .details-grid > div.full-width {
      grid-column: 1 / -1;
    }
    .no-print {
      text-align: center;
      margin-top: 20px;
    }
    .print-btn {
      padding: 10px 28px;
      background: #111827;
      color: white;
      border: none;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .print-btn:hover { background: #374151; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .label { border: 1px solid #d1d5db; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div>
    <div dir={isRTL ? "rtl" : "ltr"} class="label">
      <div dir={isRTL ? "rtl" : "ltr"} class="header">
        <div>
          <div dir={isRTL ? "rtl" : "ltr"} class="name">${item.name}</div>
          <span class="category">${item.category}</span>
        </div>
        <div dir={isRTL ? "rtl" : "ltr"} class="icon-box">${renderToString(<Package size={18} />)}</div>
      </div>
      <div dir={isRTL ? "rtl" : "ltr"} class="barcode-section">
        ${barcodeSvgMarkup}
        <div dir={isRTL ? "rtl" : "ltr"} class="batch-id">${item.batchId}</div>
      </div>
      <div dir={isRTL ? "rtl" : "ltr"} class="details-grid">
        ${detailsHtml}
      </div>
      ${usedInHtml}
    </div>
    <div dir={isRTL ? "rtl" : "ltr"} class="no-print">
      <br/>
      <button class="print-btn" onclick="window.print()" style="display:flex;align-items:center;gap:6px;margin:0 auto;">${renderToString(<Printer size={16} />)}<span>Print Label</span></button>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(labelHtml);
      printWindow.document.close();
    }
  };

  return createPortal(
    <AnimatePresence>
      {item && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
          onClick={onClose}
        >
          {/* Backdrop */}
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            variants={overlayVariants}
          />

          {/* Modal */}
          <MotionDiv
            animate="visible"
            className="relative z-[1000] w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-slate-800"
            exit="exit"
            initial="hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="font-bold text-gray-900 text-xl dark:text-white">
                {t("print_label")}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-colors hover:bg-gray-800 active:scale-95 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
                  onClick={handlePrint}
                >
                  <Printer size={16} />

                  {t("print")}
                </button>
                <button
                  className="rounded-full bg-gray-50 p-2 transition-colors hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600"
                  onClick={onClose}
                >
                  <X className="text-gray-500 dark:text-slate-300" size={18} />
                </button>
              </div>
            </div>

            {/* Label Preview */}
            <div className="p-6 pt-4">
              <div className="rounded-[1.5rem] border-2 border-gray-200 bg-white p-6 dark:border-slate-600 dark:bg-slate-800">
                {/* Top: Material name + category */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-2xl text-gray-900 leading-tight dark:text-white">
                      {item.name}
                    </h3>
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-600 text-xs uppercase tracking-wide dark:bg-slate-700 dark:text-gray-300">
                      {item.category}
                    </span>
                  </div>
                  <div className="ms-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                    <Package size={20} />
                  </div>
                </div>

                {/* Barcode */}
                <div className="flex flex-col items-center border-gray-100 border-y py-4 dark:border-slate-700">
                  <svg className="w-full max-w-[280px]" ref={barcodeRef} />
                  <span className="mt-2 font-bold font-mono text-gray-900 text-sm tracking-wider dark:text-white">
                    {item.batchId}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {/* Stock */}
                  <div className="rounded-[1rem] bg-gray-50 p-3 dark:bg-slate-700/50">
                    <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                      {t("current_stock")}
                    </span>
                    <p className="mt-0.5 font-bold text-gray-900 text-lg dark:text-white">
                      {item.stock}
                      <span className="ms-1 font-medium text-gray-500 text-sm dark:text-slate-400">
                        {item.unit}
                      </span>
                    </p>
                  </div>

                  {/* Expiry */}
                  <div className="rounded-[1rem] bg-gray-50 p-3 dark:bg-slate-700/50">
                    <span className="flex items-center gap-1 font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                      <Calendar size={10} />
                      {t("expiryDate")}
                    </span>
                    <p
                      className={`mt-0.5 font-bold text-lg ${
                        item.expiryStatus === "expiring"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {item.expiryDate}
                    </p>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <div className="col-span-2 rounded-[1rem] bg-gray-50 p-3 dark:bg-slate-700/50">
                      <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                        {t("description")}
                      </span>
                      <p className="mt-0.5 font-medium text-gray-700 text-sm dark:text-slate-300">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Supplier */}
                  {item.supplier && (
                    <div className="rounded-[1rem] bg-gray-50 p-3 dark:bg-slate-700/50">
                      <span className="flex items-center gap-1 font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                        <MapPin size={10} />

                        {t("supplier")}
                      </span>
                      <p className="mt-0.5 font-bold text-gray-900 text-sm dark:text-white">
                        {item.supplier}
                      </p>
                    </div>
                  )}

                  {/* Storage Conditions */}
                  {item.storageConditions && (
                    <div className="rounded-[1rem] bg-gray-50 p-3 dark:bg-slate-700/50">
                      <span className="flex items-center gap-1 font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                        <Thermometer size={10} />

                        {t("storage")}
                      </span>
                      <p className="mt-0.5 font-bold text-gray-900 text-sm dark:text-white">
                        {item.storageConditions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Used In */}
                {item.usedIn && item.usedIn.length > 0 && (
                  <div className="mt-3 border-gray-100 border-t pt-3 dark:border-slate-700">
                    <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                      {t("used_in")}
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.usedIn?.map((proj, i) => (
                        <span
                          className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-[11px] text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                          key={i}
                        >
                          {proj.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PrintLabelModal;
