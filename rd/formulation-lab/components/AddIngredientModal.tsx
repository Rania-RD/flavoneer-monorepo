import { useConvex, useMutation, useQuery } from "convex/react";
import { AnimatePresence, useAnimation } from "framer-motion";
import {
  AlertTriangle,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useTeam } from "../context/TeamContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { normalizeInsNumber } from "../convex/regulatoryHelpers";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import { compressImage } from "../lib/imageUtils";
import type {
  IngredientDependencyData,
  IngredientEditorData,
} from "../types";
import { DRAFT_KEY, PREDEFINED_NUTRIENTS } from "./add-ingredient/constants";
import {
  buildIngredientSavePayload,
  computeCompositeNutrients,
  createInitialIngredientFormData,
  getIngredientValidationMessage,
  hydrateConversions,
  hydrateIngredientFormData,
  hydrateNutrients,
  hydrateSubIngredients,
} from "./add-ingredient/ingredientHelpers";
import type {
  AllergenRegion,
  ConversionDraft,
  IngredientSavePayload,
  NutrientDraft,
  NutritionLegislation,
  SubIngredientDraft,
} from "./add-ingredient/types";
import { AddIngredientInfoTab } from "./add-ingredient/AddIngredientInfoTab";
import { AddIngredientNutrientsTab } from "./add-ingredient/AddIngredientNutrientsTab";
import {
  AddIngredientModalFooter,
  AddIngredientModalHeader,
  AddIngredientModalTabs,
} from "./add-ingredient/AddIngredientModalFrame";
import DependencyWarningModal from "./DependencyWarningModal";
import { useToast } from "../hooks/useToast";

interface AddIngredientModalProps {
  editIngredient?: IngredientEditorData;
  isOpen: boolean;
  onClose: () => void;
}

const AddIngredientModal: React.FC<AddIngredientModalProps> = ({
  isOpen,
  onClose,
  editIngredient,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useSettings();
  const { activeTeamId } = useTeam();
  const createIngredient = useMutation(api.ingredients.create);
  const updateIngredient = useMutation(api.ingredients.update);
  const allIngredients = useQuery(api.ingredients.list) ?? [];

  const [activeTab, setActiveTab] = useState<"info" | "nutrients">("info");
  const [legislation, setLegislation] = useState<NutritionLegislation>("FDA");
  const [isComposite, setIsComposite] = useState(false);
  const [isAdditive, setIsAdditive] = useState(false);
  const [insNumber, setInsNumber] = useState("");
  const additiveMatch = useQuery(
    api.regulatory.getAdditiveMatch,
    isAdditive && insNumber.trim()
      ? { insNumber: normalizeInsNumber(insNumber) }
      : "skip"
  );
  const [formData, setFormData] = useState(createInitialIngredientFormData);

  const [subIngredients, setSubIngredients] = useState<SubIngredientDraft[]>(
    []
  );

  const [conversions, setConversions] = useState<ConversionDraft[]>([]);

  const [nutrientValues, setNutrientValues] = useState<NutrientDraft[]>([]);

  const [allergenInput, setAllergenInput] = useState("");
  const [allergenValues, setAllergenValues] = useState<string[]>([]);
  const [allergenRegion, setAllergenRegion] =
    useState<AllergenRegion>("FDA");
  const [allergenVerified, setAllergenVerified] = useState(false);
  const [subAllergens, setSubAllergens] = useState<Record<string, string[]>>({});

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dependencyData, setDependencyData] = useState<{
    composites: IngredientDependencyData["composites"];
    formulas: IngredientDependencyData["formulas"];
  } | null>(null);
  const [showDependencyWarning, setShowDependencyWarning] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] =
    useState<IngredientSavePayload | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null
  );
  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<
    string | null
  >(null);

  const [isDirty, setIsDirty] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isShaking, setIsShaking] = useState(false);

  const handleBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };
  const controls = useAnimation();
  const isLocked = editIngredient?.status === "Approved";

  const markDirty = () => {
    if (!isDirty && !isLocked) setIsDirty(true);
  };

  useEffect(() => {
    if (isOpen) {
      controls.start("visible");
      setIsDirty(false);
    } else {
      setIsDirty(false);
      setIsShaking(false);
    }
  }, [isOpen, controls]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();
  const { toast } = useToast();

  const [overriddenNutrients, setOverriddenNutrients] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (isOpen && editIngredient) {
      setFormData(hydrateIngredientFormData(editIngredient));
      setIsComposite(editIngredient.isComposite ?? false);
      setIsAdditive(editIngredient.isAdditive ?? false);
      setInsNumber(editIngredient.insNumber ?? "");
      setSubIngredients(hydrateSubIngredients(editIngredient));
      setConversions(hydrateConversions(editIngredient));

      const hydratedNutrients = hydrateNutrients(editIngredient, t);
      setNutrientValues(hydratedNutrients);
      setAllergenValues(editIngredient.allergenValues || []);
      setAllergenRegion(
        editIngredient.allergenRegion === "EU" ||
          editIngredient.allergenRegion === "GSO"
          ? editIngredient.allergenRegion
          : "FDA"
      );
      setAllergenVerified(editIngredient.allergenVerified || false);
      setSubAllergens(editIngredient.subAllergenValues || {});
      setActiveTab("info");

      if (editIngredient.isComposite) {
        const overrides: Record<string, boolean> = {};
        hydratedNutrients.forEach((n) => {
          overrides[n.id] = true;
        });
        setOverriddenNutrients(overrides);
      }
      if (editIngredient.coverImageUrl) {
        setExistingCoverImageUrl(editIngredient.coverImageUrl);
      }
    }
  }, [isOpen, editIngredient, t]);

  useEffect(() => {
    if (isOpen) {
      if (!editIngredient) {
        setFormData(createInitialIngredientFormData());
        setConversions([]);
        setNutrientValues([]);
        setAllergenValues([]);
        setAllergenRegion("FDA");
        setAllergenVerified(false);
        setSubAllergens({});
        setAllergenInput("");
        setIsComposite(false);
        setIsAdditive(false);
        setInsNumber("");
        setSubIngredients([]);
        setOverriddenNutrients({});
        setActiveTab("info");
        setError(null);
        setTouchedFields({});
      }
      localStorage.removeItem(DRAFT_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const computedNutrients = useMemo(() => {
    return computeCompositeNutrients(isComposite, subIngredients, allIngredients);
  }, [isComposite, subIngredients, allIngredients]);

  const totalSubPercentage = useMemo(() => {
    return subIngredients.reduce(
      (acc, sub) => acc + (Number(sub.percentage) || 0),
      0
    );
  }, [subIngredients]);

  // ── Handlers ────────────────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleAddSubIngredient = () => {
    setSubIngredients((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ingredientId: "", percentage: "" },
    ]);
  };

  const handleRemoveSubIngredient = (id: string) => {
    setSubIngredients((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubIngredientChange = (
    id: string,
    field: string,
    value: string
  ) => {
    setSubIngredients((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleAddNutrient = () => {
    setNutrientValues((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        predefinedId: "",
        customName: "",
        value: "",
        unit: "g",
      },
    ]);
  };

  const handleRemoveNutrient = (id: string) => {
    setNutrientValues((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNutrientChange = (id: string, field: string, value: string) => {
    setNutrientValues((prev) =>
      prev.map((n) => {
        if (n.id !== id) {
          return n;
        }
        const updated = { ...n, [field]: value };
        if (field === "predefinedId") {
          const pref = PREDEFINED_NUTRIENTS.find((p) => p.id === value);
          if (pref) {
            updated.unit = pref.defaultUnit;
          }
        }
        return updated;
      })
    );
  };

  const handleAddConversion = () => {
    setConversions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), unit: "", grams: "" },
    ]);
  };

  const handleRemoveConversion = (id: string) => {
    setConversions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConversionChange = (id: string, field: string, value: string) => {
    setConversions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleAddAllergen = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = allergenInput.trim();
      if (val && !allergenValues.includes(val)) {
        setAllergenValues((prev) => [...prev, val]);
      }
      setAllergenInput("");
    }
  };

  const handleRemoveAllergen = (val: string) => {
    setAllergenValues((prev) => prev.filter((a) => a !== val));
  };

  const toggleAllergen = (allergenKey: string) => {
    setAllergenValues((prev) =>
      prev.includes(allergenKey)
        ? prev.filter((a) => a !== allergenKey)
        : [...prev, allergenKey]
    );
  };

  const toggleSubAllergen = (parentKey: string, subKey: string) => {
    setSubAllergens((prev) => {
      const parentList = prev[parentKey] || [];
      const updated = parentList.includes(subKey)
        ? parentList.filter((k) => k !== subKey)
        : [...parentList, subKey];
      return { ...prev, [parentKey]: updated };
    });
  };

  const resetForm = () => {
    setFormData(createInitialIngredientFormData());
    setConversions([]);
    setNutrientValues([]);
    setAllergenValues([]);
    setAllergenRegion("FDA");
    setAllergenVerified(false);
    setSubAllergens({});
    setAllergenInput("");
    setIsComposite(false);
    setIsAdditive(false);
    setInsNumber("");
    setSubIngredients([]);
    setOverriddenNutrients({});
    setActiveTab("info");
    setError(null);
  };

  const validateForm = () => {
    const message = getIngredientValidationMessage({
      conversions,
      formData,
      insNumber,
      isAdditive,
      isComposite,
      subIngredients,
      totalSubPercentage,
    });
    if (message) {
      setError(
        message.text ??
          t(message.key ?? "generic_error")
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== "nutrients") {
      setActiveTab("nutrients");
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!allergenVerified) {
      toast.warning(t("allergens_unverified_warning"));
      return;
    }

    setIsSubmitting(true);

    try {
      let currentCoverImageId: Id<"_storage"> | undefined =
        editIngredient?.coverImageId;
      if (coverImageFile) {
        const compressedFile = await compressImage(coverImageFile, 500);
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });
        const json = await result.json();
        currentCoverImageId = json.storageId as Id<"_storage">;
      }

      const payload = buildIngredientSavePayload({
        activeTeamId: activeTeamId ?? undefined,
        allergenRegion,
        allergenValues,
        allergenVerified,
        computedNutrients,
        conversions,
        coverImageId: currentCoverImageId,
        formData,
        insNumber,
        isAdditive,
        isComposite,
        nutrientValues,
        overriddenNutrients,
        subAllergens,
        subIngredients,
        t,
      });

      if (editIngredient && editIngredient._id) {
        // Detect if critical fields changed
        const oldCode = editIngredient.code;
        const deps = await convex.query(api.ingredients.getDependencies, {
          id: editIngredient._id,
          code: oldCode || undefined,
        });

        if (deps.composites.length > 0 || deps.formulas.length > 0) {
          setDependencyData(deps);
          setShowDependencyWarning(true);
          setPendingSavePayload(payload);
          setIsSubmitting(false);
          return;
        }

        await updateIngredient({
          id: editIngredient._id,
          ...payload,
        });
      } else {
        await createIngredient(payload);
      }

      localStorage.removeItem(DRAFT_KEY);
      resetForm();
      onClose();
    } catch (err) {
      console.error("Failed to add ingredient:", err);
      setError(
        t("failed_to_save_ingredient")
      );
    } finally {
      if (!showDependencyWarning) {
        setIsSubmitting(false);
      }
    }
  };

  const markDependenciesOutOfSync = useMutation(
    api.ingredients.markDependenciesOutOfSync
  );
  const propagateUpdates = useMutation(api.ingredients.propagateUpdates);

  const handleIgnoreDependency = async () => {
    if (!(editIngredient?._id && pendingSavePayload)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateIngredient({ id: editIngredient._id, ...pendingSavePayload });
      await markDependenciesOutOfSync({ id: editIngredient._id });
      localStorage.removeItem(DRAFT_KEY);
      setDependencyData(null);
      setShowDependencyWarning(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsSubmitting(false);
    }
  };

  const handleUpdateDependency = async () => {
    if (!(editIngredient?._id && pendingSavePayload)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateIngredient({ id: editIngredient._id, ...pendingSavePayload });
      await propagateUpdates({ id: editIngredient._id });
      localStorage.removeItem(DRAFT_KEY);
      setDependencyData(null);
      setShowDependencyWarning(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsSubmitting(false);
    }
  };

  const nextTab = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (activeTab === "info") {
      const missingFields: Record<string, boolean> = {};
      let isValid = true;
      if (!formData.name.trim()) { missingFields.name = true; isValid = false; }
      if (!formData.code.trim()) { missingFields.code = true; isValid = false; }
      if (!formData.groupId.trim()) { missingFields.groupId = true; isValid = false; }

      if (!isValid) {
        setTouchedFields((prev) => ({ ...prev, ...missingFields }));
        toast.error(t("please_fill_required_fields"));
        return;
      }
      setActiveTab("nutrients");
    }
  };
  const prevTab = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (activeTab === "nutrients") {
      setActiveTab("info");
    }
  };

  // ── Style tokens ────────────────────────────────────────
  const inputClasses =
    "w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-[1rem] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all";
  const labelClasses =
    "block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ms-1";

  const handleBackdropClick = async () => {
    if (isDirty) {
      setIsShaking(true);
      toast.warning(t("unsaved_changes_shake_warning"));
      await controls.start("shake");
      setIsShaking(false);
      controls.start("visible");
    } else {
      onClose();
    }
  };

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={handleBackdropClick}
            variants={overlayVariants}
          />

          <MotionDiv
            animate={controls}
            className={`relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-[#1e293b] transition-all duration-300 ${isShaking ? "border border-red-500 shadow-red-500/30" : "border border-transparent"}`}
            exit="exit"
            initial="hidden"
            variants={{
              ...modalVariants,
              shake: {
                x: [0, -10, 10, -10, 10, -5, 5, 0],
                transition: { duration: 0.4 }
              }
            }}
          >
            <AddIngredientModalHeader
              isRTL={isRTL}
              onClose={onClose}
              subtitle={t("register_new_formulation_ingredient")}
              title={
                editIngredient
                  ? editIngredient._id
                    ? t("edit_ingredient")
                    : t("add_ingredient_copy")
                  : t("add_ingredient")
              }
            />

            <AddIngredientModalTabs
              activeTab={activeTab}
              generalInfoLabel={t("general_info")}
              isRTL={isRTL}
              nutritionalDataLabel={t("nutritional_data")}
              setActiveTab={setActiveTab}
            />

            {/* Body */}
            <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pb-8 pt-6">
              <fieldset disabled={isLocked} className="group/fieldset border-0 p-0 m-0 min-w-0">
                <form
                  className="space-y-6"
                  id="add-ingredient-form"
                  onChange={markDirty}
                  onSubmit={handleSubmit}
                >
                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                    <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                    <p className="font-medium text-sm">{error}</p>
                  </div>
                )}

                {/* ── Tab 1: Info ─────────────────── */}
                {activeTab === "info" && (
                  <AddIngredientInfoTab
                    additiveMatch={additiveMatch}
                    allIngredients={allIngredients}
                    conversions={conversions}
                    coverImagePreview={coverImagePreview}
                    existingCoverImageUrl={existingCoverImageUrl}
                    formData={formData}
                    handleAddConversion={handleAddConversion}
                    handleAddSubIngredient={handleAddSubIngredient}
                    handleBlur={handleBlur}
                    handleConversionChange={handleConversionChange}
                    handleInputChange={handleInputChange}
                    handleRemoveConversion={handleRemoveConversion}
                    handleRemoveSubIngredient={handleRemoveSubIngredient}
                    handleSubIngredientChange={handleSubIngredientChange}
                    inputClasses={inputClasses}
                    insNumber={insNumber}
                    isAdditive={isAdditive}
                    isComposite={isComposite}
                    labelClasses={labelClasses}
                    markDirty={markDirty}
                    setCoverImageFile={setCoverImageFile}
                    setCoverImagePreview={setCoverImagePreview}
                    setInsNumber={setInsNumber}
                    setIsAdditive={setIsAdditive}
                    setIsComposite={setIsComposite}
                    subIngredients={subIngredients}
                    t={t}
                    totalSubPercentage={totalSubPercentage}
                    touchedFields={touchedFields}
                  />
                )}

                {activeTab === "nutrients" && (
                  <AddIngredientNutrientsTab
                    allergenRegion={allergenRegion}
                    allergenValues={allergenValues}
                    allergenVerified={allergenVerified}
                    computedNutrients={computedNutrients}
                    handleAddNutrient={handleAddNutrient}
                    handleNutrientChange={handleNutrientChange}
                    handleRemoveNutrient={handleRemoveNutrient}
                    inputClasses={inputClasses}
                    isComposite={isComposite}
                    labelClasses={labelClasses}
                    legislation={legislation}
                    markDirty={markDirty}
                    nutrientValues={nutrientValues}
                    overriddenNutrients={overriddenNutrients}
                    setAllergenRegion={setAllergenRegion}
                    setAllergenVerified={setAllergenVerified}
                    setLegislation={setLegislation}
                    setOverriddenNutrients={setOverriddenNutrients}
                    subAllergens={subAllergens}
                    t={t}
                    toast={toast}
                    toggleAllergen={toggleAllergen}
                    toggleSubAllergen={toggleSubAllergen}
                  />
                )}
              </form>
              </fieldset>
            </div>

            <AddIngredientModalFooter
              activeTab={activeTab}
              canSubmit={
                !!(
                  formData.name.trim() &&
                  formData.code.trim() &&
                  formData.groupId.trim()
                )
              }
              cancelLabel={t("cancel")}
              isLocked={isLocked}
              isRTL={isRTL}
              isSubmitting={isSubmitting}
              nextLabel={t("nextStep")}
              onCancel={onClose}
              onNext={nextTab}
              onPrevious={prevTab}
              previousLabel={t("previous")}
              saveLabel={t("save_ingredient")}
            />
          </MotionDiv>

          <DependencyWarningModal
            dependencies={dependencyData}
            isOpen={showDependencyWarning}
            isUpdating={isSubmitting}
            onClose={() => setShowDependencyWarning(false)}
            onIgnore={handleIgnoreDependency}
            onUpdate={handleUpdateDependency}
          />
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};

export default AddIngredientModal;
