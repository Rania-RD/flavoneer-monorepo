import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, FlaskConical, Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSettings } from "../context/SettingsContext";
import { authHelpers } from "../lib/auth-helpers";

interface LoginProps {
  onNavigateToSignup: () => void;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC<LoginProps> = ({ onNavigateToSignup }) => {
  const { t } = useTranslation();
  const { darkMode, isRTL } = useSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError("");
    setLoading(true);

    const result = await authHelpers.signInWithEmail(data.email, data.password);

    if (!result.success) {
      setError(result.error || t("loginError"));
    }

    setLoading(false);
  };

  return (
    <div
      className={`flex min-h-screen items-center justify-center p-4 transition-colors duration-300 ${
        darkMode ? "bg-slate-900" : "bg-[#FDFCF6]"
      }`}
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -end-24 -top-24 h-96 w-96 rounded-full opacity-20 blur-3xl ${
            darkMode ? "bg-indigo-600" : "bg-amber-200"
          }`}
        />
        <div
          className={`absolute -start-24 -bottom-24 h-80 w-80 rounded-full opacity-15 blur-3xl ${
            darkMode ? "bg-violet-600" : "bg-rose-200"
          }`}
        />
      </div>

      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] shadow-2xl transition-colors duration-300 ${
          darkMode
            ? "border border-slate-700/50 bg-slate-800/90"
            : "border border-gray-100 bg-white/90"
        } backdrop-blur-xl`}
      >
        <div className="px-8 pt-10 pb-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div
              className={`mb-4 flex h-16 w-16 items-center justify-center rounded-[1.2rem] shadow-lg ${
                darkMode ? "bg-indigo-600" : "bg-gray-900"
              }`}
            >
              <FlaskConical className="h-8 w-8 text-white" />
            </div>
            <h1
              className={`font-bold text-2xl ${
                darkMode ? "text-slate-100" : "text-gray-900"
              }`}
            >
              {t("welcomeBack")}
            </h1>
            <p
              className={`mt-1 text-sm ${
                darkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              {t("loginSubtitle")}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-800/30 dark:bg-rose-900/20">
              <p className="text-center font-medium text-rose-600 text-sm dark:text-rose-400">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label
                className={`mb-1.5 block font-semibold text-sm ${
                  darkMode ? "text-slate-300" : "text-gray-700"
                }`}
                htmlFor="login-email"
              >
                {t("email")}
              </label>
              <input
                className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  darkMode
                    ? "border-slate-600 bg-slate-700/60 text-slate-100 placeholder-slate-400 focus:border-transparent focus:ring-indigo-500"
                    : "border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-gray-900"
                } ${errors.email ? "border-rose-500 focus:ring-rose-500 dark:border-rose-500" : ""}`}
                dir="ltr"
                id="login-email"
                {...register("email")}
                placeholder={t("example_login_email")}
                type="email"
              />
              {errors.email && (
                <p className="mt-1 font-medium text-rose-500 text-xs dark:text-rose-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                className={`mb-1.5 block font-semibold text-sm ${
                  darkMode ? "text-slate-300" : "text-gray-700"
                }`}
                htmlFor="login-password"
              >
                {t("password")}
              </label>
              <div className="relative">
                <input
                  className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${isRTL ? "ps-12" : "pe-12"}
                    ${
                      darkMode
                        ? "border-slate-600 bg-slate-700/60 text-slate-100 placeholder-slate-400 focus:border-transparent focus:ring-indigo-500"
                        : "border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-gray-900"
                    } ${errors.password ? "border-rose-500 focus:ring-rose-500 dark:border-rose-500" : ""}`}
                  dir="ltr"
                  id="login-password"
                  {...register("password")}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  className={`absolute top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors ${isRTL ? "start-2" : "end-2"}
                    ${darkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-400 hover:text-gray-600"}`}
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 font-medium text-rose-500 text-xs dark:text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              className={`flex w-full items-center justify-center gap-2 rounded-[1.2rem] py-3.5 font-bold text-sm text-white transition-all duration-200 ${
                darkMode
                  ? "bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50"
                  : "bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400"
              }disabled:cursor-not-allowed shadow-lg active:scale-[0.98]`}
              disabled={loading}
              id="login-submit"
              type="submit"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("signingIn")}
                </>
              ) : (
                t("signIn")
              )}
            </button>
          </form>

          {/* Separator */}
          <div className="my-6 flex items-center">
            <div
              className={`h-px flex-1 ${darkMode ? "bg-slate-700" : "bg-gray-200"}`}
            />
            <span
              className={`px-3 font-medium text-xs ${darkMode ? "text-slate-500" : "text-gray-400"}`}
            >
              {t("or")}
            </span>
            <div
              className={`h-px flex-1 ${darkMode ? "bg-slate-700" : "bg-gray-200"}`}
            />
          </div>

          {/* Sign up link */}
          <p
            className={`text-center text-sm ${darkMode ? "text-slate-400" : "text-gray-500"}`}
          >
            {t("noAccount")}{" "}
            <button
              className={`font-bold transition-colors ${
                darkMode
                  ? "text-indigo-400 hover:text-indigo-300"
                  : "text-gray-900 hover:text-gray-700"
              }`}
              id="goto-signup"
              onClick={onNavigateToSignup}
              type="button"
            >
              {t("signUp")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
