import { api } from "@flavoneer/backend/api";
import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import {
  Beaker,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hash,
  Loader2,
  Save,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../hooks/useToast";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import { uploadProjectPhoto } from "../lib/projectPhoto";
import { type EnrichedProject, ProjectStatus } from "../types";
import { GsfaCategorySelect } from "./GsfaCategorySelect";
import ProjectPhotoField from "./ProjectPhotoField";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: EnrichedProject) => Promise<void> | void;
  organizationMembers?: { userId: string; userName: string; userAvatarUrl?: string }[];
}

type ContentLanguage = "en" | "ar";

const CATEGORIES = [
  "Medical Nutrition",
  "Dairy Alternatives",
  "Alternative Proteins",
  "General R&D",
  "Beverage Formulation",
  "Snack Innovation",
];

const PROCESSING_METHODS = [
  "Sous-vide",
  "Extrusion",
  "Fermentation",
  "Pasteurization",
  "High-Shear Mixing",
  "Baking",
  "Freeze Drying",
];

const TESTING_REQUIREMENTS = [
  "Microbial Stability",
  "Nutrient Retention",
  "Sensory Profile",
  "Viscosity Analysis",
  "Shelf-life Testing",
  "Allergen Screening",
];

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  organizationMembers = [],
}) => {
  const { profile } = useSettings();
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [activeTab, setActiveTab] = useState<
    "general" | "technical" | "compliance"
  >("general");
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>("en");
  const t = i18n.getFixedT(contentLanguage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    category: CATEGORIES[0],
    gsfaCategoryCode: "",
    gsfaCategoryName: "",
    description: "",
    descriptionAr: "",
    formulationState: "Liquid",
    servingSizeMode: "recipeMakes",
    servingSizeUnit: "g",
    processingMethod: "",
    targetOutcome: "",
    nutritionalGoal: "",
    testingRequirements: [] as string[],
    batchCodePrefix: "",
    batchCodeFormat: "prefix-seq" as
      | "prefix-seq"
      | "prefix-date-seq"
      | "prefix-random",
    authorizedExecutor: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (req: string) => {
    setFormData((prev) => {
      const exists = prev.testingRequirements.includes(req);
      if (exists) {
        return {
          ...prev,
          testingRequirements: prev.testingRequirements.filter(
            (r) => r !== req
          ),
        };
      }
      return {
        ...prev,
        testingRequirements: [...prev.testingRequirements, req],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const photoStorageId = photoFile
        ? await uploadProjectPhoto(photoFile, generateUploadUrl)
        : undefined;
      const fallbackName = formData.name || formData.nameAr;
      const fallbackDescription =
        formData.description || formData.descriptionAr;
      const newProject = {
        name: fallbackName,
        nameI18n: {
          en: formData.name || fallbackName,
          ar: formData.nameAr || fallbackName,
        },
        version: "1.0",
        status: ProjectStatus.DRAFT,
        lead: profile.name || "Unknown",
        description: fallbackDescription,
        descriptionI18n: {
          en: formData.description || fallbackDescription,
          ar: formData.descriptionAr || fallbackDescription,
        },
        photoStorageId,
        ingredients: [],
        category: formData.category,
        gsfaCategoryCode: formData.gsfaCategoryCode || undefined,
        gsfaCategoryName: formData.gsfaCategoryName || undefined,
        formulationState: formData.formulationState,
        servingSizeMode: formData.servingSizeMode,
        servingSizeUnit: formData.servingSizeUnit,
        processingMethod: formData.processingMethod,
        targetOutcome: formData.targetOutcome,
        nutritionalGoal: formData.nutritionalGoal,
        testingRequirements: formData.testingRequirements,
        batchCodePrefix: formData.batchCodePrefix || undefined,
        batchCodeFormat: formData.batchCodeFormat || undefined,
        authorizedExecutor: formData.authorizedExecutor || undefined,
      } as unknown as EnrichedProject;

      await onSave(newProject);
      onClose();

      // Clear the form fields so they are empty for the next entry
      setFormData({
        name: "",
        nameAr: "",
        category: CATEGORIES[0],
        gsfaCategoryCode: "",
        gsfaCategoryName: "",
        description: "",
        descriptionAr: "",
        formulationState: "Liquid",
        servingSizeMode: "recipeMakes",
        servingSizeUnit: "g",
        processingMethod: "",
        targetOutcome: "",
        nutritionalGoal: "",
        testingRequirements: [],
        batchCodePrefix: "",
        batchCodeFormat: "prefix-seq" as
          | "prefix-seq"
          | "prefix-date-seq"
          | "prefix-random",
        authorizedExecutor: "",
      });
      setActiveTab("general");
      setContentLanguage("en");
      setPhotoFile(null);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error(t("project_save_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextTab = () => {
    if (activeTab === "general") {
      setActiveTab("technical");
    } else if (activeTab === "technical") {
      setActiveTab("compliance");
    }
  };

  const prevTab = () => {
    if (activeTab === "compliance") {
      setActiveTab("technical");
    } else if (activeTab === "technical") {
      setActiveTab("general");
    }
  };

  // High contrast input classes
  const inputClasses =
    "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-focus/50 focus:border-transparent transition-all";
  const isArabicContent = contentLanguage === "ar";
  const localizedFieldNames = {
    title: isArabicContent ? ("nameAr" as const) : ("name" as const),
    description: isArabicContent
      ? ("descriptionAr" as const)
      : ("description" as const),
  };

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 text-start sm:p-4"
          dir={isArabicContent ? "rtl" : "ltr"}
          lang={contentLanguage}
          role="dialog"
        >
          {/* Backdrop */}
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />

          {/* Modal Card */}
          <MotionDiv
            animate="visible"
            className="relative z-[1000] flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-white shadow-2xl sm:max-h-[90dvh] dark:border-[#d2f2d4]/10 dark:bg-[#173e33]"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-gray-100 border-b bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-mint text-brand-primary">
                  <Beaker size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-xl">
                    {t("new_r_d_project")}
                  </h2>
                  <p className="text-gray-500 text-xs">
                    {t("initialize_a_new_formulation_workspace")}
                  </p>
                </div>
              </div>
              <button
                aria-label={t("close")}
                className="text-gray-400 transition-colors hover:text-gray-600"
                onClick={onClose}
                type="button"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs / Progress */}
            <div className="px-6 pt-6">
              <div className="flex items-center gap-1 border-gray-200 border-b">
                <button
                  className={`border-b-2 px-4 pb-3 font-medium text-sm transition-colors ${
                    activeTab === "general"
                      ? "border-brand-primary text-brand-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("general")}
                  type="button"
                >
                  {t("1_general_info")}
                </button>
                <button
                  className={`border-b-2 px-4 pb-3 font-medium text-sm transition-colors ${
                    activeTab === "technical"
                      ? "border-brand-primary text-brand-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("technical")}
                  type="button"
                >
                  {t("2_technical_specs")}
                </button>
                <button
                  className={`border-b-2 px-4 pb-3 font-medium text-sm transition-colors ${
                    activeTab === "compliance"
                      ? "border-brand-primary text-brand-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("compliance")}
                  type="button"
                >
                  {t("3_compliance")}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-white p-6">
              <form
                className="space-y-6"
                id="project-form"
                onSubmit={handleSubmit}
              >
                <div className="ms-auto w-full space-y-1.5 sm:w-56">
                  <label
                    className="font-semibold text-gray-700 text-sm"
                    htmlFor="project-content-language"
                  >
                    {t("form_content_language")}
                  </label>
                  <select
                    aria-label={t("form_content_language")}
                    className={inputClasses}
                    id="project-content-language"
                    onChange={(event) =>
                      setContentLanguage(event.target.value as ContentLanguage)
                    }
                    value={contentLanguage}
                  >
                    <option value="en">{t("english_us")}</option>
                    <option value="ar">{t("arabic")}</option>
                  </select>
                </div>

                {/* General Section */}
                {activeTab === "general" && (
                  <div className="fade-in slide-in-from-end-4 animate-in space-y-4 duration-300">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          className="font-semibold text-gray-700 text-sm"
                          htmlFor="project-localized-title"
                        >
                          {t("project_title")}
                        </label>
                        <input
                          className={inputClasses}
                          data-testid="project-name-input"
                          dir={isArabicContent ? "rtl" : "ltr"}
                          id="project-localized-title"
                          lang={contentLanguage}
                          name={localizedFieldNames.title}
                          onChange={handleInputChange}
                          placeholder={t(
                            isArabicContent
                              ? "example_project_name_ar"
                              : "example_project_name"
                          )}
                          required
                          value={formData[localizedFieldNames.title]}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <GsfaCategorySelect
                          inputClassName={inputClasses}
                          labelClassName="font-semibold text-gray-700 text-sm"
                          language={contentLanguage}
                          onChange={(category) =>
                            setFormData((prev) => ({
                              ...prev,
                              gsfaCategoryCode: category.code ?? "",
                              gsfaCategoryName: category.name ?? "",
                            }))
                          }
                          value={{
                            code: formData.gsfaCategoryCode,
                            name: formData.gsfaCategoryName,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        className="font-semibold text-gray-700 text-sm"
                        htmlFor="project-localized-description"
                      >
                        {t("brief_description")}
                      </label>
                      <textarea
                        className={`${inputClasses} resize-none`}
                        dir={isArabicContent ? "rtl" : "ltr"}
                        id="project-localized-description"
                        lang={contentLanguage}
                        name={localizedFieldNames.description}
                        onChange={handleInputChange}
                        placeholder={t(
                          isArabicContent
                            ? "describe_goal_placeholder_ar"
                            : "describe_goal_placeholder"
                        )}
                        rows={3}
                        value={formData[localizedFieldNames.description]}
                      />
                    </div>

                    <ProjectPhotoField
                      disabled={isSubmitting}
                      file={photoFile}
                      language={contentLanguage}
                      onChange={setPhotoFile}
                      onRemove={() => setPhotoFile(null)}
                    />

                    <div className="space-y-1.5">
                      <label className="font-semibold text-gray-700 text-sm">
                        {t("formulation_state")}
                      </label>
                      <select
                        className={inputClasses}
                        data-testid="new-project-formulation-state-select"
                        name="formulationState"
                        onChange={handleInputChange}
                        value={formData.formulationState}
                      >
                        <option value="Liquid">{t("liquid")}</option>
                        <option value="Solid">{t("solid")}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 border-gray-100 border-t pt-2">
                      <label className="font-semibold text-gray-700 text-sm">
                        {t("authorized_executor")}
                      </label>
                      <select
                        className={inputClasses}
                        name="authorizedExecutor"
                        onChange={handleInputChange}
                        value={formData.authorizedExecutor}
                      >
                        <option value="">{t("anyone_no_restrictions")}</option>
                        {organizationMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.userName}
                          </option>
                        ))}
                      </select>
                      <p className="text-gray-500 text-xs">
                        {t("only_the_selected_user_will_be_able_to_e")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Technical Specs Section */}
                {activeTab === "technical" && (
                  <div className="fade-in slide-in-from-end-4 animate-in space-y-4 duration-300">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-gray-700 text-sm">
                        {t("processing_method")}
                      </label>
                      <div className="relative">
                        <input
                          className={inputClasses}
                          list="processing-methods"
                          name="processingMethod"
                          onChange={handleInputChange}
                          placeholder={t("select_or_type_method")}
                          value={formData.processingMethod}
                        />
                        <datalist id="processing-methods">
                          {PROCESSING_METHODS.map((m) => (
                            <option key={m} label={t(m)} value={m} />
                          ))}
                        </datalist>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {t("e_g_high_pressure_processing_fermentatio")}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-gray-700 text-sm">
                        {t("target_texture_outcome")}
                      </label>
                      <input
                        className={inputClasses}
                        name="targetOutcome"
                        onChange={handleInputChange}
                        placeholder={t("example_target_spec")}
                        value={formData.targetOutcome}
                      />
                    </div>

                    {/* Batch ID Configuration */}
                    <div className="mt-4 space-y-4 border-gray-200 border-t pt-4">
                      <div className="mb-1 flex items-center gap-2">
                        <Hash className="text-teal-600" size={16} />
                        <label className="font-semibold text-gray-700 text-sm">
                          {t("batch_id_format")}
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="font-medium text-gray-500 text-xs">
                            {t("prefix_max_6_chars")}
                          </label>
                          <input
                            className={`${inputClasses} font-mono`}
                            maxLength={6}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                batchCodePrefix: e.target.value
                                  .toUpperCase()
                                  .slice(0, 6),
                              }))
                            }
                            placeholder={
                              formData.name
                                ? formData.name
                                    .split(" ")[0]
                                    .toUpperCase()
                                    .slice(0, 4)
                                : "AUTO"
                            }
                            value={formData.batchCodePrefix}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-gray-500 text-xs">
                            {t("numbering_format")}
                          </label>
                          <select
                            className={inputClasses}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                batchCodeFormat: e.target.value as
                                  | "prefix-seq"
                                  | "prefix-date-seq"
                                  | "prefix-random",
                              }))
                            }
                            value={formData.batchCodeFormat}
                          >
                            <option value="prefix-seq">
                              {t("sequential_prefix_001")}
                            </option>
                            <option value="prefix-date-seq">
                              {t("date_seq_prefix_250212_001")}
                            </option>
                            <option value="prefix-random">
                              {t("random_prefix_892a")}
                            </option>
                          </select>
                        </div>
                      </div>
                      {/* Live Preview */}
                      <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-2.5">
                        <span className="font-bold text-[10px] text-teal-600 uppercase tracking-wider">
                          {t("preview")}
                        </span>
                        <span className="font-bold font-mono text-sm text-teal-800">
                          {(() => {
                            const pfx =
                              formData.batchCodePrefix ||
                              (formData.name
                                ? formData.name
                                    .split(" ")[0]
                                    .toUpperCase()
                                    .slice(0, 4)
                                : "PROJ");
                            switch (formData.batchCodeFormat) {
                              case "prefix-date-seq": {
                                const now = new Date();
                                const yy = String(now.getFullYear()).slice(-2);
                                const mm = String(now.getMonth() + 1).padStart(
                                  2,
                                  "0"
                                );
                                const dd = String(now.getDate()).padStart(
                                  2,
                                  "0"
                                );
                                return `${pfx}-${yy}${mm}${dd}-001`;
                              }
                              case "prefix-random":
                                return `${pfx}-892A`;
                              default:
                                return `${pfx}-001`;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compliance Section */}
                {activeTab === "compliance" && (
                  <div className="fade-in slide-in-from-end-4 animate-in space-y-4 duration-300">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-gray-700 text-sm">
                        {t("key_nutritional_focus")}
                      </label>
                      <input
                        className={inputClasses}
                        name="nutritionalGoal"
                        onChange={handleInputChange}
                        placeholder={t("example_certifications")}
                        value={formData.nutritionalGoal}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="font-semibold text-gray-700 text-sm">
                        {t("testing_requirements")}
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {TESTING_REQUIREMENTS.map((req) => (
                          <label
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
                            key={req}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                formData.testingRequirements.includes(req)
                                  ? "border-brand-primary bg-brand-primary"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {formData.testingRequirements.includes(req) && (
                                <CheckCircle2
                                  className="text-white"
                                  size={14}
                                />
                              )}
                            </div>
                            <input
                              checked={formData.testingRequirements.includes(
                                req
                              )}
                              className="hidden"
                              onChange={() => handleCheckboxChange(req)}
                              type="checkbox"
                            />
                            <span className="text-gray-700 text-sm">
                              {t(req)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-gray-200 border-t bg-gray-50 px-6 py-4">
              <button
                className="flex items-center px-4 py-2 font-medium text-gray-600 text-sm transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                disabled={activeTab === "general" || isSubmitting}
                onClick={prevTab}
                type="button"
              >
                {isArabicContent ? (
                  <ChevronRight className="me-1" size={16} />
                ) : (
                  <ChevronLeft className="me-1" size={16} />
                )}

                {t("back")}
              </button>

              {activeTab !== "compliance" && (
                <button
                  className="flex items-center rounded-lg bg-gray-900 px-6 py-2 font-medium text-sm text-white transition-colors hover:bg-gray-800"
                  data-testid="project-next-step-button"
                  key="btn-next"
                  onClick={nextTab}
                  type="button"
                >
                  {t("nextStep")}
                  {isArabicContent ? (
                    <ChevronLeft className="ms-1" size={16} />
                  ) : (
                    <ChevronRight className="ms-1" size={16} />
                  )}
                </button>
              )}

              {activeTab === "compliance" && (
                <button
                  className="flex items-center rounded-lg bg-brand-primary px-6 py-2 font-medium text-sm text-white shadow-brand-primary/20 shadow-lg transition-all hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="project-submit-button"
                  disabled={isSubmitting}
                  form="project-form"
                  key="btn-submit"
                  type="submit"
                >
                  {isSubmitting ? (
                    <Loader2 className="me-2 animate-spin" size={16} />
                  ) : (
                    <Save className="me-2" size={16} />
                  )}
                  {isSubmitting ? t("creating_project") : t("create_project")}
                </button>
              )}
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};

export default NewProjectModal;
