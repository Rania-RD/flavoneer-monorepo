import { useMutation, useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AddIngredientModal from "../components/AddIngredientModal";
import AddMaterialModal from "../components/AddMaterialModal";
import ConfirmationModal from "../components/ConfirmationModal";
import EditMaterialModal from "../components/EditMaterialModal";
import { BulkActionsToolbar } from "../components/materials/BulkActionsToolbar";
import { IngredientLibraryTab } from "../components/materials/IngredientLibraryTab";
import { InventoryTab } from "../components/materials/InventoryTab";
import { MaterialsHeader } from "../components/materials/MaterialsHeader";
import { MaterialsTabs } from "../components/materials/MaterialsTabs";
import PrintLabelModal from "../components/PrintLabelModal";
import StockUsageHistoryModal from "../components/StockUsageHistoryModal";
import ViewIngredientModal from "../components/ViewIngredientModal";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useMaterialSelection } from "../hooks/materials/useMaterialSelection";
import { useToast } from "../hooks/useToast";
import { exportInventoryCsv } from "../lib/materials/exportInventoryCsv";
import type {
  EnrichedInventoryItem,
  IngredientEditorData,
  IngredientListItem,
} from "../types";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const Materials: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"current" | "library">(
    "current"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddIngredientModalOpen, setIsAddIngredientModalOpen] =
    useState(false);
  const [editItem, setEditItem] = useState<EnrichedInventoryItem | null>(null);
  const [printItem, setPrintItem] = useState<EnrichedInventoryItem | null>(
    null
  );
  const [historyItem, setHistoryItem] = useState<EnrichedInventoryItem | null>(
    null
  );
  const [selectedViewIngredient, setSelectedViewIngredient] =
    useState<IngredientListItem | null>(null);
  const [editIngredientData, setEditIngredientData] =
    useState<IngredientEditorData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ingToDelete, setIngToDelete] = useState<IngredientListItem | null>(
    null
  );
  const [isDeletingIng, setIsDeletingIng] = useState(false);

  const inventoryRaw = useQuery(api.inventory.list, {});
  const ingredientsRaw = useQuery(api.ingredients.list) ?? [];
  const bulkRemove = useMutation(api.inventory.bulkRemove);
  const bulkUpdateStatus = useMutation(api.inventory.bulkUpdateStatus);
  const removeIngredient = useMutation(api.ingredients.remove);
  const items: EnrichedInventoryItem[] = inventoryRaw ?? [];
  const {
    clearSelection,
    selectedItems,
    toggleAll,
    toggleSelection,
  } = useMaterialSelection();

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.batchId.toLowerCase().includes(normalizedSearch)
    );
  }, [items, searchTerm]);

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedItems) as Id<"inventoryItems">[];
      await bulkRemove({ ids: idsToDelete });
      clearSelection();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: "ok" | "low") => {
    setIsUpdatingStatus(true);
    try {
      const idsToUpdate = Array.from(selectedItems) as Id<"inventoryItems">[];
      await bulkUpdateStatus({ ids: idsToUpdate, stockStatus: newStatus });
      clearSelection();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDuplicateIngredient = (ingredient: IngredientListItem) => {
    const duplicateSuffix = t("copy_suffix");
    const duplicateData = {
      ...ingredient,
      _id: undefined,
      code: "",
      name: `${ingredient.name}${duplicateSuffix}`,
      isnAr: ingredient.isnAr ? `${ingredient.isnAr}${duplicateSuffix}` : "",
      isnEn: ingredient.isnEn ? `${ingredient.isnEn}${duplicateSuffix}` : "",
    };

    setEditIngredientData(duplicateData);
    setIsAddIngredientModalOpen(true);

    toast.success(t("ingredient_duplicated_success"));
  };

  const confirmIngredientDelete = async () => {
    if (!ingToDelete) {
      return;
    }
    setIsDeletingIng(true);
    try {
      await removeIngredient({ id: ingToDelete._id });
      setIngToDelete(null);
      toast.success(t("ingredient_deleted_success"));
      if (
        selectedViewIngredient &&
        selectedViewIngredient._id === ingToDelete._id
      ) {
        setSelectedViewIngredient(null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeletingIng(false);
    }
  };

  if (inventoryRaw === undefined) {
    return (
      <div className="p-8 text-center text-gray-500">
        {t("loading_inventory")}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MaterialsHeader
        activeTab={activeTab}
        onAddMaterial={() => setIsAddModalOpen(true)}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
        t={t}
      />

      <MaterialsTabs activeTab={activeTab} onTabChange={setActiveTab} t={t} />

      <AnimatePresence mode="wait">
        {activeTab === "current" ? (
          <InventoryTab
            filteredItems={filteredItems}
            onAddMaterial={() => setIsAddModalOpen(true)}
            onEditItem={setEditItem}
            onPrintItem={setPrintItem}
            onShowHistory={setHistoryItem}
            onToggleAll={() => toggleAll(filteredItems)}
            onToggleSelection={toggleSelection}
            selectedItems={selectedItems}
            t={t}
          />
        ) : (
          <IngredientLibraryTab
            ingredients={ingredientsRaw}
            onAddIngredient={() => setIsAddIngredientModalOpen(true)}
            onDeleteIngredient={setIngToDelete}
            onDuplicateIngredient={handleDuplicateIngredient}
            onViewIngredient={setSelectedViewIngredient}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItems.size > 0 && (
          <BulkActionsToolbar
            isDeleting={isDeleting}
            isUpdatingStatus={isUpdatingStatus}
            onClearSelection={clearSelection}
            onDelete={() => setIsDeleteModalOpen(true)}
            onExport={() => exportInventoryCsv(items, selectedItems)}
            onStatusChange={handleBulkStatusChange}
            selectedCount={selectedItems.size}
            t={t}
          />
        )}
      </AnimatePresence>

      <AddMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <AddIngredientModal
        editIngredient={editIngredientData ?? undefined}
        isOpen={isAddIngredientModalOpen}
        onClose={() => {
          setIsAddIngredientModalOpen(false);
          setEditIngredientData(null);
        }}
      />

      <ViewIngredientModal
        ingredient={selectedViewIngredient}
        isOpen={!!selectedViewIngredient}
        onClose={() => setSelectedViewIngredient(null)}
        onDelete={() => {
          setIngToDelete(selectedViewIngredient);
          setSelectedViewIngredient(null);
        }}
        onDuplicate={() => {
          const ingToDuplicate = selectedViewIngredient;
          setSelectedViewIngredient(null);
          if (ingToDuplicate) {
            handleDuplicateIngredient(ingToDuplicate);
          }
        }}
        onEdit={() => {
          setEditIngredientData(selectedViewIngredient);
          setSelectedViewIngredient(null);
          setIsAddIngredientModalOpen(true);
        }}
      />

      <EditMaterialModal item={editItem} onClose={() => setEditItem(null)} />

      <PrintLabelModal item={printItem} onClose={() => setPrintItem(null)} />

      <StockUsageHistoryModal
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />

      <ConfirmationModal
        cancelText={t("cancel")}
        confirmText={t("yes_delete")}
        isOpen={isDeleteModalOpen}
        isProcessing={isDeleting}
        message={
          <>
            {t("are_you_sure_you_want_to_delete")}{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              {selectedItems.size}
            </span>{" "}
            {t("selected")}{" "}
            {selectedItems.size === 1 ? t("item") : t("items")}{" "}
            {t("this_action_cannot_be_undone")}
          </>
        }
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        title={t("delete_selected_items_title")}
      />

      <ConfirmationModal
        cancelText={t("cancel")}
        confirmText={isDeletingIng ? t("deleting") : t("yes_delete")}
        isOpen={!!ingToDelete}
        message={t("delete_ingredient_confirmation")}
        onClose={() => setIngToDelete(null)}
        onConfirm={confirmIngredientDelete}
        title={t("confirm_delete")}
      />
    </div>
  );
};

export default Materials;
