import { DateTime } from "luxon";
import type { EnrichedInventoryItem } from "../../types";

const quoteCsvValue = (value: string | number) => `"${value}"`;

export const exportInventoryCsv = (
  items: EnrichedInventoryItem[],
  selectedItems: Set<string>
) => {
  const selectedData = items.filter((item) => selectedItems.has(item._id));
  if (selectedData.length === 0) {
    return;
  }

  const headers = [
    "Name",
    "Batch ID",
    "Category",
    "Stock",
    "Unit",
    "Status",
    "Expiry",
  ];
  const rows = selectedData.map((item) => [
    quoteCsvValue(item.name),
    quoteCsvValue(item.batchId),
    quoteCsvValue(item.category),
    item.stock,
    quoteCsvValue(item.unit),
    quoteCsvValue(item.stockStatus),
    quoteCsvValue(item.expiryDate || "N/A"),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `inventory_export_${DateTime.now().toISODate()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
