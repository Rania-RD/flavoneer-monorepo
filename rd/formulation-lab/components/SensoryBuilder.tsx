import { useMutation, useQuery } from "convex/react";
import { Copy, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useToast } from "../hooks/useToast";

interface SensoryBuilderProps {
  projectId: Id<"projects">;
  runId: Id<"runs">;
}

type QuestionType = "hedonic" | "boolean" | "text";

interface SensoryQuestion {
  attribute: string;
  id: string;
  type: QuestionType;
}

const DEFAULT_QUESTIONS = [
  { id: "q1", attributeKey: "appearance", type: "hedonic" },
  { id: "q2", attributeKey: "aroma", type: "hedonic" },
  { id: "q3", attributeKey: "flavor", type: "hedonic" },
  { id: "q4", attributeKey: "texture", type: "hedonic" },
  { id: "q5", attributeKey: "aftertaste", type: "hedonic" },
] as const;

export const SensoryBuilder: React.FC<SensoryBuilderProps> = ({
  projectId,
  runId,
}) => {
  const { t } = useTranslation();
  const existingForm = useQuery(api.sensory.getFormByRun, { runId });
  const createForm = useMutation(api.sensory.createForm);
  const { toast } = useToast();

  const [name, setName] = useState(t("standard_sensory_evaluation"));
  const [questions, setQuestions] = useState<SensoryQuestion[]>(() =>
    DEFAULT_QUESTIONS.map((question) => ({
      id: question.id,
      attribute: t(question.attributeKey),
      type: question.type,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  // If a form exists, user can just copy the link
  if (existingForm) {
    const link = `${window.location.origin}/evaluate/${existingForm.token}`;

    const handleCopy = () => {
      navigator.clipboard.writeText(link);
      toast.success(t("evaluation_link_copied_to_clipboard"));
    };

    return (
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 dark:border-indigo-900/30 dark:bg-indigo-900/10">
        <h3 className="font-bold text-indigo-900 text-lg dark:text-indigo-300">
          {t("sensory_evaluation_form_active")}
        </h3>
        <p className="mt-1 text-indigo-700 text-sm dark:text-indigo-400">
          {t("this_run_already_has_an_active_sensory_t")}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            className="flex-1 rounded-xl border-indigo-200 bg-white px-4 py-2 text-gray-500 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            readOnly
            value={link}
          />
          <button
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-sm text-white transition-colors hover:bg-indigo-700"
            onClick={handleCopy}
            type="button"
          >
            <Copy size={16} />

            {t("copy_link")}
          </button>
        </div>
      </div>
    );
  }

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q${Date.now()}`,
        attribute: t("new_attribute"),
        type: "hedonic",
      },
    ]);
  };

  const handleChange = (
    id: string,
    field: keyof SensoryQuestion,
    value: string
  ) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleRemove = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("form_name_required"));
      return;
    }
    if (questions.length === 0) {
      toast.error(t("add_attribute_required"));
      return;
    }

    setIsSaving(true);
    try {
      await createForm({
        projectId,
        runId,
        name,
        schemaJSON: JSON.stringify({ questions }),
      });
      toast.success(t("sensory_form_created_successfully"));
    } catch (_e) {
      toast.error(t("failed_to_create_form"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
      <div className="border-gray-100 border-b pb-4 dark:border-slate-800">
        <h3 className="font-bold text-gray-900 text-lg dark:text-white">
          {t("create_sensory_form")}
        </h3>
        <p className="text-gray-500 text-sm dark:text-slate-400">
          {t("generate_a_public_link_for_panellists_to")}
        </p>
      </div>

      <div className="space-y-3">
        <label
          className="block font-bold text-gray-700 text-sm dark:text-slate-300"
          htmlFor="formTitle"
        >
          {t("form_title")}
        </label>
        <input
          className="w-full rounded-xl border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          id="formTitle"
          onChange={(e) => setName(e.target.value)}
          value={name}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            className="block font-bold text-gray-700 text-sm dark:text-slate-300"
            htmlFor="evaluationAttributesToggle"
          >
            {t("evaluation_attributes")}
          </label>
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-indigo-600 text-xs hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            id="evaluationAttributesToggle"
            onClick={handleAddQuestion}
            type="button"
          >
            <Plus size={14} /> {t("add_attribute")}
          </button>
        </div>

        <div className="space-y-2">
          {questions.map((q) => (
            <div
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-900"
              key={q.id}
            >
              <input
                className="flex-1 rounded-lg border-transparent bg-transparent px-3 py-1.5 text-sm focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:text-white dark:focus:bg-slate-800"
                onChange={(e) =>
                  handleChange(q.id, "attribute", e.target.value)
                }
                placeholder={t("attribute_name")}
                value={q.attribute}
              />
              <select
                className="rounded-lg border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                onChange={(e) => handleChange(q.id, "type", e.target.value)}
                value={q.type}
              >
                <option value="hedonic">{t("1_9_scale")}</option>
                <option value="boolean">{t("yes_no")}</option>
                <option value="text">{t("text_comment")}</option>
              </select>
              <button
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                onClick={() => handleRemove(q.id)}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-bold text-sm text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700"
          disabled={isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={16} />
          )}

          {t("generate_form_link")}
        </button>
      </div>
    </div>
  );
};
