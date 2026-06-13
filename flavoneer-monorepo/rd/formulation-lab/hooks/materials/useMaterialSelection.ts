import { useState } from "react";
import type { EnrichedInventoryItem } from "../../types";

export const useMaterialSelection = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = (items: EnrichedInventoryItem[]) => {
    setSelectedItems((current) => {
      if (current.size === items.length && items.length > 0) {
        return new Set();
      }
      return new Set(items.map((item) => item._id));
    });
  };

  const clearSelection = () => setSelectedItems(new Set());

  return {
    clearSelection,
    selectedItems,
    setSelectedItems,
    toggleAll,
    toggleSelection,
  };
};
