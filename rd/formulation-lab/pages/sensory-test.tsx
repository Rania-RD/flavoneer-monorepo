import { useMutation, useQuery } from "convex/react";
import { Check, ClipboardList, Loader2, Send } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { useToast } from "../hooks/useToast";

type QuestionType = "hedonic" | "boolean" | "text";

interface SensoryQuestion {
  attribute: string;
  id: string;
  type: QuestionType;
}

const SensoryTest: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const form = useQuery(api.sensory.getFormByToken, { token: token || "" });
  const submitEvaluation = useMutation(api.sensory.submitEvaluation);
  const { toast } = useToast();

  const [testerName, setTesterName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (form === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (form === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h1 className="mb-2 font-bold text-2xl text-gray-900 dark:text-white">
            {t("form_not_found")}
          </h1>
          <p className="text-gray-500">
            {t("this_evaluation_link_is_invalid_or_has_e")}
          </p>
        </div>
      </div>
    );
  }

  const schema: { questions: SensoryQuestion[] } = JSON.parse(form.schemaJSON);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testerName.trim()) {
      toast.error(t("please_enter_your_name"));
      return;
    }

    if (Object.keys(answers).length < schema.questions.length) {
      toast.error(t("answer_every_evaluation_question"));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEvaluation({
        formId: form._id,
        testerName,
        resultsJSON: JSON.stringify(answers),
      });
      setIsSubmitted(true);
      toast.success(t("evaluation_submitted_thanks"));
    } catch (_error) {
      toast.error(t("failed_to_submit_try_again"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScoreChange = (attribute: string, score: string | number) => {
    setAnswers((prev) => ({ ...prev, [attribute]: score }));
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-slate-900">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-500 shadow-sm">
          <Check className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-bold text-3xl text-gray-900 dark:text-white">
          {t("thank_you")}
        </h1>
        <p className="mt-2 text-center text-gray-500">
          {t("your_sensory_evaluation_has_been_securel")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-extrabold text-3xl text-gray-900 dark:text-white">
            {t("sensory_evaluation")}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400">{form.name}</p>
        </div>

        {/* Evaluation Board */}
        <div className="rounded-[2.5rem] border border-gray-200 bg-white p-6 shadow-xl sm:p-10 dark:border-slate-800 dark:bg-[#0f172a]">
          <form className="space-y-10" onSubmit={handleSubmit}>
            {/* Identity */}
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-slate-700 dark:bg-slate-800">
              <label
                className="block font-bold text-gray-900 text-sm dark:text-white"
                htmlFor="testerName"
              >
                {t("tester_name")}
              </label>
              <input
                className="w-full rounded-xl border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                id="testerName"
                onChange={(e) => setTesterName(e.target.value)}
                placeholder={t("enter_full_name")}
                required
                type="text"
                value={testerName}
              />
            </div>

            <div className="space-y-8">
              {schema.questions.map((q, qIndex) => (
                <div className="space-y-4" key={q.id}>
                  <label
                    className="block font-bold text-gray-900 text-lg dark:text-white"
                    htmlFor={`question-${q.id}`}
                  >
                    {qIndex + 1}. {q.attribute}
                  </label>

                  {/* Hedonic 1-9 Scale */}
                  {q.type === "hedonic" && (
                    <div className="space-y-2" id={`question-${q.id}`}>
                      <div className="flex justify-between px-2 text-gray-400 text-xs">
                        <span>{t("dislike_extremely")}</span>
                        <span>{t("neutral")}</span>
                        <span>{t("like_extremely")}</span>
                      </div>
                      <div className="grid grid-cols-9 gap-1 sm:gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => (
                          <button
                            className={`flex h-10 w-full items-center justify-center rounded-lg border font-bold text-sm transition-all sm:h-12 sm:text-base ${
                              answers[q.attribute] === score
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                                : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-900/20"
                            }`}
                            key={score}
                            onClick={() =>
                              handleScoreChange(q.attribute, score)
                            }
                            title={t("score_value", { score })}
                            type="button"
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boolean (Yes/No) */}
                  {q.type === "boolean" && (
                    <div className="flex gap-4" id={`question-${q.id}`}>
                      {(["yes", "no"] as const).map((option) => (
                        <button
                          className={`flex-1 rounded-xl border py-3 font-bold transition-all ${
                            answers[q.attribute] === option
                              ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                              : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                          key={option}
                          onClick={() => handleScoreChange(q.attribute, option)}
                          type="button"
                        >
                          {t(option)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Text Comments */}
                  {q.type === "text" && (
                    <textarea
                      className="w-full rounded-xl border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      id={`question-${q.id}`}
                      onChange={(e) =>
                        handleScoreChange(q.attribute, e.target.value)
                      }
                      placeholder={t("additional_comments_placeholder")}
                      rows={3}
                      value={(answers[q.attribute] as string) || ""}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-4 font-bold text-lg text-white shadow-lg transition-all hover:bg-gray-800 focus:ring-4 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}

              {t("submit_evaluation")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SensoryTest;
