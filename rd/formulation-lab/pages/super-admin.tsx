import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Archive,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  Command,
  Flag,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Switch } from "../components/ui/Switch";

type AdminOverview = FunctionReturnType<typeof api.superAdmin.getOverview>;
type OrganizationRow = AdminOverview["organizations"][number];
type FeatureFlagRow = AdminOverview["featureFlags"][number];
type AdminTab = "organizations" | "featureFlags" | "activity";
type StatusFilter = "all" | "active" | "suspended";

const panelClass =
  "rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/95 shadow-[0_22px_60px_rgba(16,47,39,0.09)] dark:border-[#d2f2d4]/10 dark:bg-[#143d32]/95 dark:shadow-black/10";

const inputClass =
  "w-full rounded-2xl border border-[#1c4a3c]/12 bg-[#eef8eb]/75 px-4 py-3 text-[#173e33] outline-none transition focus:border-[#ff7738]/60 focus:ring-4 focus:ring-[#ff7738]/10 dark:border-[#d2f2d4]/10 dark:bg-[#102f27] dark:text-[#f7f4df]";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const rise = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" },
  },
};

function formatDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function formatRelativeDate(timestamp: number, locale: string) {
  const dayDifference = Math.round((timestamp - Date.now()) / 86_400_000);
  if (Math.abs(dayDifference) < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      dayDifference,
      "day"
    );
  }
  return formatDate(timestamp, locale);
}

const StatusBadge = ({ status }: { status: "active" | "suspended" }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold text-[11px] ${
        status === "active"
          ? "bg-[#d2f2d4] text-[#1c4a3c] dark:bg-[#2c6453] dark:text-[#e7ffe8]"
          : "bg-rose-100 text-rose-700 dark:bg-rose-950/45 dark:text-rose-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-rose-500"}`}
      />
      {t(status === "active" ? "super_admin_active" : "super_admin_suspended")}
    </span>
  );
};

function ConfirmActionDialog({
  confirmText,
  message,
  onClose,
  onConfirm,
  processing,
  title,
  tone = "danger",
}: {
  confirmText: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  processing: boolean;
  title: string;
  tone?: "danger" | "primary";
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] grid place-items-center bg-[#102f27]/45 p-4 backdrop-blur-sm"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`${panelClass} w-full max-w-md p-7`}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
      >
        <div
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
            tone === "danger"
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
              : "bg-[#d2f2d4] text-[#1c4a3c] dark:bg-[#285b4d] dark:text-[#f7f4df]"
          }`}
        >
          <ShieldCheck size={22} />
        </div>
        <h3 className="font-display font-semibold text-2xl text-[#173e33] dark:text-[#f7f4df]">
          {title}
        </h3>
        <p className="mt-2 text-[#6f8e82] text-sm leading-6 dark:text-[#a9cbbb]">
          {message}
        </p>
        <div className="mt-7 flex justify-end gap-3">
          <button
            className="rounded-2xl px-5 py-3 font-bold text-[#56766a] text-sm hover:bg-[#eef8eb] dark:text-[#b8d1c4] dark:hover:bg-[#285b4d]"
            disabled={processing}
            onClick={onClose}
            type="button"
          >
            {t("cancel")}
          </button>
          <button
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-bold text-sm transition disabled:opacity-60 ${
              tone === "danger"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-[#1c4a3c] text-white hover:bg-[#102f27] dark:bg-[#f5a623] dark:text-[#173e33]"
            }`}
            disabled={processing}
            onClick={onConfirm}
            type="button"
          >
            {processing && <Loader2 className="animate-spin" size={16} />}
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const Metric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) => (
  <motion.div
    className="min-w-0 px-5 py-4 first:ps-0 last:pe-0"
    variants={rise}
  >
    <div className="mb-2 flex items-center gap-2 text-[#69887c] dark:text-[#a9cbbb]">
      <Icon size={15} strokeWidth={2.2} />
      <span className="truncate font-bold text-[11px] uppercase tracking-[0.14em]">
        {label}
      </span>
    </div>
    <p className="font-display font-semibold text-3xl text-[#173e33] tabular-nums dark:text-[#f7f4df]">
      {value.toLocaleString()}
    </p>
  </motion.div>
);

function OrganizationInspector({
  organization,
  onClose,
}: {
  organization: OrganizationRow;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const updateStatus = useMutation(api.superAdmin.updateOrganizationStatus);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleStatusChange = async () => {
    const nextStatus =
      organization.status === "active" ? "suspended" : "active";
    setSaving(true);
    try {
      await updateStatus({
        organizationId: organization._id,
        status: nextStatus,
      });
      toast.success(
        t(
          nextStatus === "suspended"
            ? "super_admin_organization_suspended"
            : "super_admin_organization_reactivated"
        )
      );
      setConfirming(false);
    } catch (error) {
      console.error(error);
      toast.error(t("super_admin_organization_update_failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className={`${panelClass} h-fit overflow-hidden xl:sticky xl:top-6`}
      exit={{ opacity: 0, x: 20 }}
      initial={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22 }}
    >
      <div className="border-[#1c4a3c]/10 border-b p-6 dark:border-[#d2f2d4]/10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1c4a3c] font-display font-semibold text-lg text-white dark:bg-[#f5a623] dark:text-[#173e33]">
              {organization.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display font-semibold text-[#173e33] text-xl dark:text-[#f7f4df]">
                {organization.name}
              </h2>
              <p className="truncate font-mono text-[#6f8e82] text-xs dark:text-[#9abcae]">
                {organization.slug}
              </p>
            </div>
          </div>
          <button
            aria-label={t("close")}
            className="rounded-xl p-2 text-[#6f8e82] transition hover:bg-[#eef8eb] hover:text-[#173e33] dark:hover:bg-[#285b4d] dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <StatusBadge status={organization.status} />
      </div>

      <div className="space-y-6 p-6">
        <div>
          <p className="mb-3 font-bold text-[#789489] text-[11px] uppercase tracking-[0.14em] dark:text-[#9abcae]">
            {t("super_admin_owner")}
          </p>
          <p className="font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
            {organization.ownerName || t("super_admin_owner_unavailable")}
          </p>
          <p className="mt-0.5 text-[#6f8e82] text-sm dark:text-[#9abcae]">
            {organization.ownerEmail || t("super_admin_email_unavailable")}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#1c4a3c]/10 dark:bg-[#d2f2d4]/10">
          {[
            [t("super_admin_members"), organization.memberCount],
            [t("super_admin_projects"), organization.projectCount],
            [t("super_admin_flag_overrides"), organization.overrideCount],
            [
              t("super_admin_created"),
              formatDate(
                organization.createdAt,
                i18n.resolvedLanguage ?? i18n.language
              ),
            ],
          ].map(([label, value]) => (
            <div className="bg-[#f7fbf2] p-4 dark:bg-[#102f27]" key={label}>
              <dt className="text-[#789489] text-[11px] dark:text-[#9abcae]">
                {label}
              </dt>
              <dd className="mt-1 font-bold text-[#173e33] text-sm tabular-nums dark:text-[#f7f4df]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="rounded-2xl bg-[#eef8eb] p-4 dark:bg-[#102f27]">
          <p className="font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
            {organization.status === "active"
              ? t("super_admin_suspend_access")
              : t("super_admin_restore_access")}
          </p>
          <p className="mt-1 text-[#6f8e82] text-xs leading-5 dark:text-[#9abcae]">
            {organization.status === "active"
              ? t("super_admin_suspend_access_help")
              : t("super_admin_restore_access_help")}
          </p>
          <button
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold text-sm transition disabled:opacity-60 ${
              organization.status === "active"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-[#1c4a3c] text-white hover:bg-[#102f27] dark:bg-[#f5a623] dark:text-[#173e33] dark:hover:bg-[#ffc760]"
            }`}
            disabled={saving}
            onClick={() => setConfirming(true)}
            type="button"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            {organization.status === "active"
              ? t("super_admin_suspend_organization")
              : t("super_admin_reactivate_organization")}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {confirming && (
          <ConfirmActionDialog
            confirmText={t(
              organization.status === "active"
                ? "super_admin_suspend_organization"
                : "super_admin_reactivate_organization"
            )}
            message={t(
              organization.status === "active"
                ? "super_admin_confirm_suspend"
                : "super_admin_confirm_reactivate",
              { name: organization.name }
            )}
            onClose={() => setConfirming(false)}
            onConfirm={handleStatusChange}
            processing={saving}
            title={t(
              organization.status === "active"
                ? "super_admin_suspend_title"
                : "super_admin_reactivate_title"
            )}
            tone={organization.status === "active" ? "danger" : "primary"}
          />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function OrganizationsView({ overview }: { overview: AdminOverview }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<Id<"organizations"> | null>(
    null
  );
  const filteredOrganizations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return overview.organizations.filter((organization) => {
      const matchesStatus = status === "all" || organization.status === status;
      const matchesQuery =
        !normalizedQuery ||
        organization.name.toLowerCase().includes(normalizedQuery) ||
        organization.slug.toLowerCase().includes(normalizedQuery) ||
        organization.ownerEmail.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [overview.organizations, query, status]);
  const selectedOrganization = overview.organizations.find(
    (organization) => organization._id === selectedId
  );

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <motion.section
        className={`${panelClass} min-w-0 overflow-hidden`}
        variants={rise}
      >
        <div className="flex flex-col gap-4 border-[#1c4a3c]/10 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-[#d2f2d4]/10">
          <div>
            <h2 className="font-display font-semibold text-2xl text-[#173e33] dark:text-[#f7f4df]">
              {t("super_admin_organizations")}
            </h2>
            <p className="mt-1 text-[#6f8e82] text-sm dark:text-[#9abcae]">
              {t("super_admin_organizations_help")}
            </p>
          </div>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 sm:w-64">
              <span className="sr-only">
                {t("super_admin_search_organizations")}
              </span>
              <Search
                className="absolute start-4 top-1/2 -translate-y-1/2 text-[#789489]"
                size={16}
              />
              <input
                className="w-full rounded-full border border-[#1c4a3c]/10 bg-[#eef8eb]/75 py-2.5 ps-10 pe-4 text-sm outline-none focus:border-[#ff7738]/50 dark:border-[#d2f2d4]/10 dark:bg-[#102f27]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("super_admin_search_organizations")}
                value={query}
              />
            </label>
            <label className="relative">
              <span className="sr-only">{t("super_admin_status_filter")}</span>
              <select
                className="h-full appearance-none rounded-full border border-[#1c4a3c]/10 bg-[#eef8eb]/75 py-2.5 ps-4 pe-9 font-bold text-sm outline-none dark:border-[#d2f2d4]/10 dark:bg-[#102f27]"
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
                value={status}
              >
                <option value="all">{t("super_admin_all_statuses")}</option>
                <option value="active">{t("super_admin_active")}</option>
                <option value="suspended">{t("super_admin_suspended")}</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2"
                size={15}
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-start">
            <thead>
              <tr className="border-[#1c4a3c]/8 border-b text-[#789489] dark:border-[#d2f2d4]/8 dark:text-[#9abcae]">
                {[
                  "super_admin_organization",
                  "super_admin_usage",
                  "super_admin_last_activity",
                  "super_admin_status",
                  "super_admin_action",
                ].map((key) => (
                  <th
                    className="px-6 py-3 text-start font-bold text-[10px] uppercase tracking-[0.14em] last:text-end"
                    key={key}
                  >
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.map((organization) => (
                <tr
                  className={`group border-[#1c4a3c]/8 border-b transition last:border-b-0 hover:bg-[#eef8eb]/70 dark:border-[#d2f2d4]/8 dark:hover:bg-[#285b4d]/30 ${
                    selectedId === organization._id
                      ? "bg-[#d2f2d4]/45 dark:bg-[#285b4d]/45"
                      : ""
                  }`}
                  key={organization._id}
                >
                  <td className="px-6 py-4">
                    <button
                      className="flex max-w-72 items-center gap-3 text-start"
                      onClick={() => setSelectedId(organization._id)}
                      type="button"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d2f2d4] font-display font-semibold text-[#1c4a3c] dark:bg-[#f5a623] dark:text-[#173e33]">
                        {organization.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
                          {organization.name}
                        </span>
                        <span className="block truncate text-[#789489] text-xs dark:text-[#9abcae]">
                          {organization.ownerEmail || organization.slug}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-[#56766a] text-xs tabular-nums dark:text-[#b8d1c4]">
                      <span
                        className="flex items-center gap-1.5"
                        title={t("super_admin_members")}
                      >
                        <Users size={14} /> {organization.memberCount}
                      </span>
                      <span
                        className="flex items-center gap-1.5"
                        title={t("super_admin_projects")}
                      >
                        <Command size={14} /> {organization.projectCount}
                      </span>
                      <span
                        className="flex items-center gap-1.5"
                        title={t("super_admin_flag_overrides")}
                      >
                        <Flag size={14} /> {organization.overrideCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#56766a] text-sm dark:text-[#b8d1c4]">
                    {formatRelativeDate(
                      organization.lastActivityAt,
                      i18n.resolvedLanguage ?? i18n.language
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={organization.status} />
                  </td>
                  <td className="px-6 py-4 text-end">
                    <button
                      aria-label={t("super_admin_view_organization", {
                        name: organization.name,
                      })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#6f8e82] transition hover:bg-[#1c4a3c] hover:text-white dark:hover:bg-[#f5a623] dark:hover:text-[#173e33]"
                      onClick={() => setSelectedId(organization._id)}
                      type="button"
                    >
                      <ArrowUpRight className="rtl:-scale-x-100" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrganizations.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Building2 className="mb-3 text-[#9abcae]" size={28} />
            <p className="font-bold text-[#173e33] dark:text-[#f7f4df]">
              {t("super_admin_no_organizations")}
            </p>
            <p className="mt-1 text-[#789489] text-sm dark:text-[#9abcae]">
              {t("super_admin_adjust_filters")}
            </p>
          </div>
        )}
      </motion.section>

      <AnimatePresence mode="wait">
        {selectedOrganization ? (
          <OrganizationInspector
            key={selectedOrganization._id}
            onClose={() => setSelectedId(null)}
            organization={selectedOrganization}
          />
        ) : (
          <motion.aside
            animate={{ opacity: 1 }}
            className={`${panelClass} hidden h-fit min-h-72 place-items-center p-8 text-center xl:grid`}
            initial={{ opacity: 0 }}
          >
            <div>
              <Building2 className="mx-auto mb-4 text-[#9abcae]" size={30} />
              <p className="font-display font-semibold text-[#173e33] text-lg dark:text-[#f7f4df]">
                {t("super_admin_select_organization")}
              </p>
              <p className="mx-auto mt-2 max-w-56 text-[#789489] text-sm leading-6 dark:text-[#9abcae]">
                {t("super_admin_select_organization_help")}
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateFlagDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createFlag = useMutation(api.superAdmin.createFeatureFlag);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
    category: "",
    enabledByDefault: false,
  });
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createFlag(form);
      toast.success(t("super_admin_flag_created"));
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("super_admin_flag_create_failed"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-[#102f27]/45 p-4 backdrop-blur-sm"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.form
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`${panelClass} w-full max-w-xl p-6 sm:p-8`}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        onSubmit={handleSubmit}
      >
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-[#ff7738] text-[11px] uppercase tracking-[0.15em]">
              {t("super_admin_feature_flags")}
            </p>
            <h2 className="mt-2 font-display font-semibold text-2xl text-[#173e33] dark:text-[#f7f4df]">
              {t("super_admin_create_flag")}
            </h2>
          </div>
          <button
            aria-label={t("close")}
            className="rounded-xl p-2 text-[#789489] hover:bg-[#eef8eb] dark:hover:bg-[#285b4d]"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-bold text-xs">
              {t("super_admin_flag_name")}
            </span>
            <input
              autoFocus
              className={inputClass}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
              value={form.name}
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-bold text-xs">
              {t("super_admin_flag_key")}
            </span>
            <input
              className={`${inputClass} font-mono`}
              onChange={(event) =>
                setForm((current) => ({ ...current, key: event.target.value }))
              }
              placeholder={t("super_admin_flag_key_placeholder")}
              required
              value={form.key}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block font-bold text-xs">
              {t("super_admin_flag_description")}
            </span>
            <textarea
              className={`${inputClass} min-h-24 resize-none`}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              value={form.description}
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-bold text-xs">
              {t("super_admin_category")}
            </span>
            <input
              className={inputClass}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder={t("super_admin_category_placeholder")}
              required
              value={form.category}
            />
          </label>
          <div className="flex items-center justify-between rounded-2xl bg-[#eef8eb] px-4 py-3 dark:bg-[#102f27]">
            <div>
              <p className="font-bold text-sm">
                {t("super_admin_default_state")}
              </p>
              <p className="text-[#789489] text-xs dark:text-[#9abcae]">
                {t(
                  form.enabledByDefault ? "super_admin_on" : "super_admin_off"
                )}
              </p>
            </div>
            <Switch
              checked={form.enabledByDefault}
              onChange={(enabledByDefault) =>
                setForm((current) => ({ ...current, enabledByDefault }))
              }
            />
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button
            className="rounded-2xl px-5 py-3 font-bold text-[#56766a] text-sm hover:bg-[#eef8eb] dark:text-[#b8d1c4] dark:hover:bg-[#285b4d]"
            onClick={onClose}
            type="button"
          >
            {t("cancel")}
          </button>
          <button
            className="flex items-center gap-2 rounded-2xl bg-[#1c4a3c] px-5 py-3 font-bold text-sm text-white shadow-[#1c4a3c]/15 shadow-lg transition hover:bg-[#102f27] disabled:opacity-60 dark:bg-[#f5a623] dark:text-[#173e33] dark:hover:bg-[#ffc760]"
            disabled={saving}
            type="submit"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            {t("super_admin_create_flag")}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function FlagInspector({
  flag,
  organizations,
  overrides,
  onClose,
}: {
  flag: FeatureFlagRow;
  organizations: OrganizationRow[];
  overrides: AdminOverview["overrides"];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const updateFlag = useMutation(api.superAdmin.updateFeatureFlag);
  const setOverride = useMutation(api.superAdmin.setFeatureFlagOverride);
  const [organizationQuery, setOrganizationQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [form, setForm] = useState({
    name: flag.name,
    description: flag.description,
    category: flag.category,
  });

  useEffect(() => {
    setForm({
      name: flag.name,
      description: flag.description,
      category: flag.category,
    });
  }, [flag]);

  const filteredOrganizations = organizations.filter((organization) =>
    organization.name
      .toLowerCase()
      .includes(organizationQuery.trim().toLowerCase())
  );

  const saveDefinition = async () => {
    setSaving(true);
    try {
      await updateFlag({ featureFlagId: flag._id, ...form });
      toast.success(t("super_admin_flag_saved"));
    } catch (error) {
      console.error(error);
      toast.error(t("super_admin_flag_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const changeDefault = async (enabledByDefault: boolean) => {
    try {
      await updateFlag({ featureFlagId: flag._id, enabledByDefault });
      toast.success(t("super_admin_default_updated"));
    } catch (error) {
      console.error(error);
      toast.error(t("super_admin_flag_save_failed"));
    }
  };

  const archiveFlag = async () => {
    try {
      await updateFlag({
        featureFlagId: flag._id,
        archived: flag.archivedAt === undefined,
      });
      toast.success(
        t(
          flag.archivedAt === undefined
            ? "super_admin_flag_archived"
            : "super_admin_flag_restored"
        )
      );
      setConfirmingArchive(false);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("super_admin_flag_save_failed"));
    }
  };

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className={`${panelClass} h-fit overflow-hidden xl:sticky xl:top-6`}
      exit={{ opacity: 0, x: 20 }}
      initial={{ opacity: 0, x: 20 }}
    >
      <div className="border-[#1c4a3c]/10 border-b p-6 dark:border-[#d2f2d4]/10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="mb-2 inline-flex rounded-full bg-[#d2f2d4] px-2.5 py-1 font-bold text-[#1c4a3c] text-[10px] uppercase tracking-wider dark:bg-[#285b4d] dark:text-[#dff6e1]">
              {flag.category}
            </span>
            <h2 className="truncate font-display font-semibold text-[#173e33] text-xl dark:text-[#f7f4df]">
              {flag.name}
            </h2>
            <p className="mt-1 font-mono text-[#6f8e82] text-xs dark:text-[#9abcae]">
              {flag.key}
            </p>
          </div>
          <button
            aria-label={t("close")}
            className="rounded-xl p-2 text-[#789489] hover:bg-[#eef8eb] dark:hover:bg-[#285b4d]"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="max-h-[calc(100dvh-10rem)] space-y-6 overflow-y-auto p-6">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-bold text-[11px]">
              {t("super_admin_flag_name")}
            </span>
            <input
              className={inputClass}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              value={form.name}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-bold text-[11px]">
              {t("super_admin_category")}
            </span>
            <input
              className={inputClass}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              value={form.category}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-bold text-[11px]">
              {t("super_admin_flag_description")}
            </span>
            <textarea
              className={`${inputClass} min-h-20 resize-none`}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              value={form.description}
            />
          </label>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1c4a3c] px-4 py-3 font-bold text-sm text-white transition hover:bg-[#102f27] disabled:opacity-60 dark:bg-[#f5a623] dark:text-[#173e33]"
            disabled={saving}
            onClick={saveDefinition}
            type="button"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            {t("save_changes")}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-[#eef8eb] p-4 dark:bg-[#102f27]">
          <div>
            <p className="font-bold text-sm">
              {t("super_admin_global_default")}
            </p>
            <p className="mt-0.5 text-[#789489] text-xs dark:text-[#9abcae]">
              {t("super_admin_global_default_help")}
            </p>
          </div>
          <Switch checked={flag.enabledByDefault} onChange={changeDefault} />
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="font-bold text-sm">
                {t("super_admin_organization_overrides")}
              </p>
              <p className="mt-0.5 text-[#789489] text-xs dark:text-[#9abcae]">
                {t("super_admin_organization_overrides_help")}
              </p>
            </div>
            <span className="font-mono text-[#789489] text-xs">
              {flag.overrideCount}
            </span>
          </div>
          <label className="relative mb-3 block">
            <span className="sr-only">
              {t("super_admin_search_organizations")}
            </span>
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 text-[#789489]"
              size={14}
            />
            <input
              className="w-full rounded-xl border border-[#1c4a3c]/10 bg-transparent py-2 ps-9 pe-3 text-xs outline-none focus:border-[#ff7738]/50 dark:border-[#d2f2d4]/10"
              onChange={(event) => setOrganizationQuery(event.target.value)}
              placeholder={t("super_admin_search_organizations")}
              value={organizationQuery}
            />
          </label>
          <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
            {filteredOrganizations.map((organization) => {
              const override = overrides.find(
                (item) =>
                  item.featureFlagId === flag._id &&
                  item.organizationId === organization._id
              );
              let state: "default" | "on" | "off" = "default";
              if (override) {
                state = override.enabled ? "on" : "off";
              }
              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#eef8eb]/75 px-3 py-2.5 dark:bg-[#102f27]"
                  key={organization._id}
                >
                  <span className="min-w-0 truncate font-bold text-xs">
                    {organization.name}
                  </span>
                  <div className="flex rounded-lg bg-white p-0.5 text-[10px] shadow-sm dark:bg-[#285b4d]">
                    {(["default", "on", "off"] as const).map((option) => (
                      <button
                        className={`rounded-md px-2 py-1.5 font-bold transition ${
                          state === option
                            ? "bg-[#1c4a3c] text-white dark:bg-[#f5a623] dark:text-[#173e33]"
                            : "text-[#789489] hover:text-[#173e33] dark:text-[#b8d1c4] dark:hover:text-white"
                        }`}
                        key={option}
                        onClick={() =>
                          setOverride({
                            featureFlagId: flag._id,
                            organizationId: organization._id,
                            enabled:
                              option === "default" ? null : option === "on",
                          }).catch((error) => {
                            console.error(error);
                            toast.error(t("super_admin_override_failed"));
                          })
                        }
                        type="button"
                      >
                        {t(`super_admin_${option}`)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 font-bold text-rose-700 text-sm transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
          onClick={() => setConfirmingArchive(true)}
          type="button"
        >
          <Archive size={16} />
          {t(
            flag.archivedAt === undefined
              ? "super_admin_archive_flag"
              : "super_admin_restore_flag"
          )}
        </button>
      </div>
      <AnimatePresence>
        {confirmingArchive && (
          <ConfirmActionDialog
            confirmText={t(
              flag.archivedAt === undefined
                ? "super_admin_archive_flag"
                : "super_admin_restore_flag"
            )}
            message={t(
              flag.archivedAt === undefined
                ? "super_admin_confirm_archive"
                : "super_admin_confirm_restore_flag",
              { name: flag.name }
            )}
            onClose={() => setConfirmingArchive(false)}
            onConfirm={archiveFlag}
            processing={false}
            title={t(
              flag.archivedAt === undefined
                ? "super_admin_archive_title"
                : "super_admin_restore_flag_title"
            )}
            tone={flag.archivedAt === undefined ? "danger" : "primary"}
          />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function FeatureFlagsView({ overview }: { overview: AdminOverview }) {
  const { t } = useTranslation();
  const updateFlag = useMutation(api.superAdmin.updateFeatureFlag);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"featureFlags"> | null>(null);
  const filteredFlags = overview.featureFlags.filter((flag) => {
    const normalized = query.trim().toLowerCase();
    const matchesArchive = showArchived || flag.archivedAt === undefined;
    const matchesQuery =
      !normalized ||
      flag.name.toLowerCase().includes(normalized) ||
      flag.key.toLowerCase().includes(normalized) ||
      flag.category.toLowerCase().includes(normalized);
    return matchesArchive && matchesQuery;
  });
  const selectedFlag = overview.featureFlags.find(
    (flag) => flag._id === selectedId
  );

  return (
    <>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <motion.section
          className={`${panelClass} min-w-0 overflow-hidden`}
          variants={rise}
        >
          <div className="flex flex-col gap-4 border-[#1c4a3c]/10 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-[#d2f2d4]/10">
            <div>
              <h2 className="font-display font-semibold text-2xl text-[#173e33] dark:text-[#f7f4df]">
                {t("super_admin_feature_flags")}
              </h2>
              <p className="mt-1 text-[#6f8e82] text-sm dark:text-[#9abcae]">
                {t("super_admin_feature_flags_help")}
              </p>
            </div>
            <button
              className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#1c4a3c] px-4 py-3 font-bold text-sm text-white transition hover:bg-[#102f27] dark:bg-[#f5a623] dark:text-[#173e33] dark:hover:bg-[#ffc760]"
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <Plus size={17} />
              {t("super_admin_create_flag")}
            </button>
          </div>
          <div className="flex flex-col gap-3 border-[#1c4a3c]/8 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#d2f2d4]/8">
            <label className="relative block max-w-md flex-1">
              <span className="sr-only">{t("super_admin_search_flags")}</span>
              <Search
                className="absolute start-3 top-1/2 -translate-y-1/2 text-[#789489]"
                size={15}
              />
              <input
                className="w-full rounded-full border border-[#1c4a3c]/10 bg-[#eef8eb]/75 py-2.5 ps-9 pe-4 text-sm outline-none focus:border-[#ff7738]/50 dark:border-[#d2f2d4]/10 dark:bg-[#102f27]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("super_admin_search_flags")}
                value={query}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[#56766a] text-xs dark:text-[#b8d1c4]">
              <input
                checked={showArchived}
                className="h-4 w-4 rounded accent-[#1c4a3c]"
                onChange={(event) => setShowArchived(event.target.checked)}
                type="checkbox"
              />
              {t("super_admin_show_archived")}
            </label>
          </div>
          <div className="divide-y divide-[#1c4a3c]/8 dark:divide-[#d2f2d4]/8">
            {filteredFlags.map((flag) => (
              <motion.div
                className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-[#eef8eb]/70 sm:px-6 dark:hover:bg-[#285b4d]/30 ${
                  selectedId === flag._id
                    ? "bg-[#d2f2d4]/45 dark:bg-[#285b4d]/45"
                    : ""
                } ${flag.archivedAt === undefined ? "" : "opacity-55"}`}
                key={flag._id}
                layout
              >
                <button
                  className="min-w-0 flex-1 text-start"
                  onClick={() => setSelectedId(flag._id)}
                  type="button"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="truncate font-bold text-[#173e33] dark:text-[#f7f4df]">
                      {flag.name}
                    </span>
                    {flag.archivedAt !== undefined && (
                      <span className="rounded-full bg-[#e7e8df] px-2 py-0.5 font-bold text-[#6f776f] text-[9px] uppercase tracking-wider dark:bg-[#2a5548] dark:text-[#bdd8c6]">
                        {t("super_admin_archived")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#789489] text-xs dark:text-[#9abcae]">
                    <span className="font-mono">{flag.key}</span>
                    <span>{flag.category}</span>
                    <span>
                      {t("super_admin_override_count", {
                        count: flag.overrideCount,
                      })}
                    </span>
                  </div>
                </button>
                <div className="hidden text-end sm:block">
                  <p className="mb-1 text-[#789489] text-[10px] uppercase tracking-wider dark:text-[#9abcae]">
                    {t("super_admin_global_default")}
                  </p>
                  <p className="font-bold text-xs">
                    {t(
                      flag.enabledByDefault
                        ? "super_admin_on"
                        : "super_admin_off"
                    )}
                  </p>
                </div>
                <Switch
                  checked={flag.enabledByDefault}
                  disabled={flag.archivedAt !== undefined}
                  onChange={(enabledByDefault) =>
                    updateFlag({
                      featureFlagId: flag._id,
                      enabledByDefault,
                    }).catch((error) => {
                      console.error(error);
                      toast.error(t("super_admin_flag_save_failed"));
                    })
                  }
                />
                <button
                  aria-label={t("super_admin_edit_flag", { name: flag.name })}
                  className="rounded-xl p-2 text-[#789489] transition hover:bg-[#1c4a3c] hover:text-white dark:hover:bg-[#f5a623] dark:hover:text-[#173e33]"
                  onClick={() => setSelectedId(flag._id)}
                  type="button"
                >
                  <ArrowUpRight className="rtl:-scale-x-100" size={17} />
                </button>
              </motion.div>
            ))}
          </div>
          {filteredFlags.length === 0 && (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <Flag className="mb-3 text-[#9abcae]" size={28} />
              <p className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                {t("super_admin_no_flags")}
              </p>
              <p className="mt-1 text-[#789489] text-sm dark:text-[#9abcae]">
                {t("super_admin_no_flags_help")}
              </p>
            </div>
          )}
        </motion.section>
        <AnimatePresence mode="wait">
          {selectedFlag ? (
            <FlagInspector
              flag={selectedFlag}
              key={selectedFlag._id}
              onClose={() => setSelectedId(null)}
              organizations={overview.organizations}
              overrides={overview.overrides}
            />
          ) : (
            <motion.aside
              animate={{ opacity: 1 }}
              className={`${panelClass} hidden h-fit min-h-72 place-items-center p-8 text-center xl:grid`}
              initial={{ opacity: 0 }}
            >
              <div>
                <Zap className="mx-auto mb-4 text-[#9abcae]" size={30} />
                <p className="font-display font-semibold text-[#173e33] text-lg dark:text-[#f7f4df]">
                  {t("super_admin_select_flag")}
                </p>
                <p className="mx-auto mt-2 max-w-56 text-[#789489] text-sm leading-6 dark:text-[#9abcae]">
                  {t("super_admin_select_flag_help")}
                </p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {createOpen && (
          <CreateFlagDialog onClose={() => setCreateOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function ActivityView({ logs }: { logs: AdminOverview["auditLogs"] }) {
  const { t, i18n } = useTranslation();
  return (
    <motion.section className={`${panelClass} overflow-hidden`} variants={rise}>
      <div className="border-[#1c4a3c]/10 border-b p-6 dark:border-[#d2f2d4]/10">
        <h2 className="font-display font-semibold text-2xl text-[#173e33] dark:text-[#f7f4df]">
          {t("super_admin_activity")}
        </h2>
        <p className="mt-1 text-[#6f8e82] text-sm dark:text-[#9abcae]">
          {t("super_admin_activity_help")}
        </p>
      </div>
      <div className="divide-y divide-[#1c4a3c]/8 px-6 dark:divide-[#d2f2d4]/8">
        {logs.map((log) => (
          <div
            className="grid gap-3 py-5 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start"
            key={log._id}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#d2f2d4] text-[#1c4a3c] dark:bg-[#285b4d] dark:text-[#f7f4df]">
              <Activity size={15} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
                {log.targetLabel}
              </p>
              <p className="mt-1 text-[#6f8e82] text-sm dark:text-[#9abcae]">
                {t(`super_admin_audit_${log.action.replaceAll(".", "_")}`, {
                  defaultValue: log.action,
                })}
              </p>
              <p className="mt-1.5 text-[#8aa097] text-xs dark:text-[#789b8d]">
                {log.actorName}
              </p>
            </div>
            <time className="text-[#789489] text-xs tabular-nums dark:text-[#9abcae]">
              {formatRelativeDate(
                log.createdAt,
                i18n.resolvedLanguage ?? i18n.language
              )}
            </time>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="py-16 text-center text-[#789489] text-sm dark:text-[#9abcae]">
            {t("super_admin_no_activity")}
          </div>
        )}
      </div>
    </motion.section>
  );
}

const SuperAdmin = () => {
  const { t } = useTranslation();
  const access = useQuery(api.superAdmin.getAccess);
  const overview = useQuery(
    api.superAdmin.getOverview,
    access?.isSuperAdmin ? {} : "skip"
  );
  const [activeTab, setActiveTab] = useState<AdminTab>("organizations");

  if (access === undefined || (access.isSuperAdmin && overview === undefined)) {
    return (
      <div className="grid min-h-[70dvh] place-items-center">
        <Loader2
          className="animate-spin text-[#1c4a3c] dark:text-[#f5a623]"
          size={28}
        />
      </div>
    );
  }
  if (!access.isSuperAdmin) {
    return <Navigate replace to="/" />;
  }
  if (!overview) {
    return null;
  }

  const tabs: {
    id: AdminTab;
    icon: typeof Building2;
    label: string;
    count?: number;
  }[] = [
    {
      id: "organizations",
      icon: Building2,
      label: t("super_admin_organizations"),
      count: overview.totals.organizations,
    },
    {
      id: "featureFlags",
      icon: Flag,
      label: t("super_admin_feature_flags"),
      count: overview.totals.activeFlags,
    },
    { id: "activity", icon: Activity, label: t("super_admin_activity") },
  ];

  return (
    <motion.div
      animate="visible"
      className="space-y-5"
      initial="hidden"
      variants={stagger}
    >
      <motion.header className="px-1 pt-2 sm:px-2 sm:pt-3" variants={rise}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#173e33] px-3 py-1.5 font-bold text-[10px] text-white uppercase tracking-[0.15em] dark:bg-[#f5a623] dark:text-[#173e33]">
                <ShieldCheck size={13} />
                {t("super_admin_badge")}
              </span>
              <span className="flex items-center gap-1.5 text-[#6f8e82] text-xs dark:text-[#9abcae]">
                <CircleDot className="text-emerald-500" size={12} />
                {t("super_admin_live_data")}
              </span>
            </div>
            <h1 className="font-display font-semibold text-3xl text-[#173e33] tracking-tight sm:text-4xl dark:text-[#f7f4df]">
              {t("super_admin_title")}
            </h1>
            <p className="mt-2 max-w-2xl text-[#5f7c71] text-sm leading-6 dark:text-[#a9cbbb]">
              {t("super_admin_subtitle")}
            </p>
          </div>
          <div className="relative flex w-full max-w-xl rounded-2xl bg-[#dfeee0]/75 p-1 lg:w-auto dark:bg-[#102f27]">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  className={`relative z-10 flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-bold text-xs transition sm:px-4 lg:flex-none ${
                    active
                      ? "text-white dark:text-[#173e33]"
                      : "text-[#6f8e82] hover:text-[#173e33] dark:text-[#9abcae] dark:hover:text-white"
                  }`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {active && (
                    <motion.span
                      className="absolute inset-0 -z-10 rounded-xl bg-[#1c4a3c] shadow-md dark:bg-[#f5a623]"
                      layoutId="super-admin-tab"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                  )}
                  <tab.icon size={15} />
                  <span className="truncate">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`font-mono text-[10px] ${active ? "opacity-70" : "opacity-55"}`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </motion.header>

      <motion.section
        className="grid grid-cols-2 divide-x divide-[#1c4a3c]/10 rounded-[2rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/65 px-5 backdrop-blur-sm sm:grid-cols-4 rtl:divide-x-reverse dark:divide-[#d2f2d4]/10 dark:border-[#d2f2d4]/10 dark:bg-[#143d32]/55"
        variants={stagger}
      >
        <Metric
          icon={Building2}
          label={t("super_admin_total_organizations")}
          value={overview.totals.organizations}
        />
        <Metric
          icon={ShieldCheck}
          label={t("super_admin_active_organizations")}
          value={overview.totals.activeOrganizations}
        />
        <Metric
          icon={Users}
          label={t("super_admin_total_members")}
          value={overview.totals.members}
        />
        <Metric
          icon={Flag}
          label={t("super_admin_active_flags")}
          value={overview.totals.activeFlags}
        />
      </motion.section>

      {(overview.limits.organizationsReached ||
        overview.limits.flagsReached ||
        overview.limits.overridesReached) && (
        <motion.p
          className="rounded-2xl bg-amber-100 px-4 py-3 text-amber-900 text-xs dark:bg-amber-900/30 dark:text-amber-100"
          variants={rise}
        >
          {t("super_admin_results_limited")}
        </motion.p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          initial={{ opacity: 0, y: 8 }}
          key={activeTab}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "organizations" && (
            <OrganizationsView overview={overview} />
          )}
          {activeTab === "featureFlags" && (
            <FeatureFlagsView overview={overview} />
          )}
          {activeTab === "activity" && (
            <ActivityView logs={overview.auditLogs} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default SuperAdmin;
