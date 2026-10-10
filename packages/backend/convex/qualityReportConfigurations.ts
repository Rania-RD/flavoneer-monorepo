import { v } from "convex/values";
import {
  QUALITY_REPORT_SECTION_DEFINITIONS,
  QUALITY_REPORT_SECTION_KEYS,
} from "../lib/quality-report-sections";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./permissions";
import { qualityReportSectionConfigValidator } from "./validators";

const MAXIMUM_LABEL_LENGTH = 80;

const configurationValidator = v.object({
  sections: v.array(qualityReportSectionConfigValidator),
  updatedAt: v.optional(v.number()),
  updatedBy: v.optional(v.string()),
});

function defaultSections() {
  return QUALITY_REPORT_SECTION_DEFINITIONS.map(({ key }) => ({
    key,
    labelI18n: {},
    visible: true,
  }));
}

function normalizeLabel(value: string | undefined) {
  const normalized = value?.trim();
  if (normalized && normalized.length > MAXIMUM_LABEL_LENGTH) {
    throw new Error(`Report section labels are limited to ${MAXIMUM_LABEL_LENGTH} characters`);
  }
  return normalized || undefined;
}

function normalizeSections(
  sections: Array<{
    key: (typeof QUALITY_REPORT_SECTION_KEYS)[number];
    labelI18n: { ar?: string; en?: string };
    visible: boolean;
  }>,
) {
  const submittedKeys = new Set(sections.map(({ key }) => key));
  if (
    sections.length !== QUALITY_REPORT_SECTION_KEYS.length ||
    submittedKeys.size !== QUALITY_REPORT_SECTION_KEYS.length ||
    QUALITY_REPORT_SECTION_KEYS.some((key) => !submittedKeys.has(key))
  ) {
    throw new Error("Every supported report section must be included exactly once");
  }
  if (!sections.some(({ visible }) => visible)) {
    throw new Error("At least one report section must remain visible");
  }

  return sections.map(({ key, labelI18n, visible }) => ({
    key,
    labelI18n: {
      ar: normalizeLabel(labelI18n.ar),
      en: normalizeLabel(labelI18n.en),
    },
    visible,
  }));
}

export const get = query({
  args: { organizationId: v.id("organizations") },
  returns: configurationValidator,
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.organizationId, "review_production_checks");
    const configuration = await ctx.db
      .query("qualityReportConfigurations")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    return configuration
      ? {
          sections: configuration.sections,
          updatedAt: configuration.updatedAt,
          updatedBy: configuration.updatedBy,
        }
      : { sections: defaultSections() };
  },
});

export const upsert = mutation({
  args: {
    organizationId: v.id("organizations"),
    sections: v.array(qualityReportSectionConfigValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requirePermission(ctx, args.organizationId, "review_production_checks");
    const sections = normalizeSections(args.sections);
    const existing = await ctx.db
      .query("qualityReportConfigurations")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    const update = {
      sections,
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, update);
    } else {
      await ctx.db.insert("qualityReportConfigurations", {
        organizationId: args.organizationId,
        ...update,
      });
    }
    return null;
  },
});
