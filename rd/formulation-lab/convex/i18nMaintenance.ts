import { mutation } from "./_generated/server";
import { type LocalizedString, isCorruptedLocalizedText } from "./localization";

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && !isCorruptedLocalizedText(trimmed) ? trimmed : undefined;
}

function repairLocalizedString(
  legacyValue?: string | null,
  localized?: LocalizedString
) {
  if (!localized) {
    return undefined;
  }

  const en =
    cleanText(localized.en) ||
    cleanText(legacyValue) ||
    cleanText(localized.ar);
  const ar =
    cleanText(localized.ar) ||
    cleanText(localized.en) ||
    cleanText(legacyValue);

  if (!(en || ar)) {
    return undefined;
  }

  const repaired = {
    ...(en ? { en } : {}),
    ...(ar ? { ar } : {}),
  };

  if (localized.en === repaired.en && localized.ar === repaired.ar) {
    return undefined;
  }

  return repaired;
}

function repairLocalizedStringArray(
  legacyValues?: string[] | null,
  localizedValues?: LocalizedString[] | null
) {
  if (!localizedValues) {
    return undefined;
  }

  let changed = false;
  const repairedValues = localizedValues.map((localized, index) => {
    const repaired = repairLocalizedString(legacyValues?.[index], localized);
    if (repaired) {
      changed = true;
      return repaired;
    }
    return localized;
  });

  return changed ? repairedValues : undefined;
}

function addRepair(
  patch: Record<string, unknown>,
  key: string,
  legacyValue?: string | null,
  localized?: LocalizedString
) {
  const repaired = repairLocalizedString(legacyValue, localized);
  if (repaired) {
    patch[key] = repaired;
    return 1;
  }
  return 0;
}

function addArrayRepair(
  patch: Record<string, unknown>,
  key: string,
  legacyValues?: string[] | null,
  localizedValues?: LocalizedString[] | null
) {
  const repaired = repairLocalizedStringArray(legacyValues, localizedValues);
  if (repaired) {
    patch[key] = repaired;
    return 1;
  }
  return 0;
}

export const repairCorruptedArabicFields = mutation({
  args: {},
  handler: async (ctx) => {
    let recordsRepaired = 0;
    let fieldsRepaired = 0;

    const patchIfNeeded = async (
      id: Parameters<typeof ctx.db.patch>[0],
      patch: Record<string, unknown>
    ) => {
      if (Object.keys(patch).length === 0) {
        return;
      }
      await ctx.db.patch(id, patch as never);
      recordsRepaired += 1;
    };

    for (const project of await ctx.db.query("projects").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "nameI18n",
        project.name,
        project.nameI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "descriptionI18n",
        project.description,
        project.descriptionI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "categoryI18n",
        project.category,
        project.categoryI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "gsfaCategoryNameI18n",
        project.gsfaCategoryName,
        project.gsfaCategoryNameI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "packagingItemNameI18n",
        project.packagingItemName,
        project.packagingItemNameI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "productTypeI18n",
        project.productType,
        project.productTypeI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "processingMethodI18n",
        project.processingMethod,
        project.processingMethodI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "targetOutcomeI18n",
        project.targetOutcome,
        project.targetOutcomeI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "nutritionalGoalI18n",
        project.nutritionalGoal,
        project.nutritionalGoalI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "targetTextureI18n",
        project.targetTexture,
        project.targetTextureI18n
      );
      fieldsRepaired += addArrayRepair(
        patch,
        "testingRequirementsI18n",
        project.testingRequirements,
        project.testingRequirementsI18n
      );
      await patchIfNeeded(project._id, patch);
    }

    for (const ingredient of await ctx.db.query("ingredients").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "nameI18n",
        ingredient.name,
        ingredient.nameI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "commonNameI18n",
        ingredient.commonName,
        ingredient.commonNameI18n
      );
      await patchIfNeeded(ingredient._id, patch);
    }

    for (const item of await ctx.db.query("inventoryItems").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(patch, "nameI18n", item.name, item.nameI18n);
      fieldsRepaired += addRepair(
        patch,
        "descriptionI18n",
        item.description,
        item.descriptionI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "categoryI18n",
        item.category,
        item.categoryI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "supplierI18n",
        item.supplier,
        item.supplierI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "storageConditionsI18n",
        item.storageConditions,
        item.storageConditionsI18n
      );
      await patchIfNeeded(item._id, patch);
    }

    for (const item of await ctx.db.query("projectIngredients").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(patch, "nameI18n", item.name, item.nameI18n);
      await patchIfNeeded(item._id, patch);
    }

    for (const phase of await ctx.db.query("recipePhases").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "nameI18n",
        phase.name,
        phase.nameI18n
      );
      await patchIfNeeded(phase._id, patch);
    }

    for (const step of await ctx.db.query("recipeSteps").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "labelI18n",
        step.label,
        step.labelI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "notesI18n",
        step.notes,
        step.notesI18n
      );
      await patchIfNeeded(step._id, patch);
    }

    for (const report of await ctx.db.query("labReports").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "projectNameI18n",
        report.projectName,
        report.projectNameI18n
      );
      await patchIfNeeded(report._id, patch);
    }

    for (const result of await ctx.db.query("labTestResults").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "parameterI18n",
        result.parameter,
        result.parameterI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "methodI18n",
        result.method,
        result.methodI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "targetRangeI18n",
        result.targetRange,
        result.targetRangeI18n
      );
      await patchIfNeeded(result._id, patch);
    }

    for (const run of await ctx.db.query("runs").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "projectNameI18n",
        run.projectName,
        run.projectNameI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "sensoryNotesI18n",
        run.sensoryNotes,
        run.sensoryNotesI18n
      );
      await patchIfNeeded(run._id, patch);
    }

    for (const phase of await ctx.db.query("runPhases").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "nameI18n",
        phase.name,
        phase.nameI18n
      );
      await patchIfNeeded(phase._id, patch);
    }

    for (const step of await ctx.db.query("runSteps").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "labelI18n",
        step.label,
        step.labelI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "notesI18n",
        step.notes,
        step.notesI18n
      );
      await patchIfNeeded(step._id, patch);
    }

    for (const category of await ctx.db.query("foodCategories").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "nameI18n",
        category.name,
        category.nameI18n
      );
      await patchIfNeeded(category._id, patch);
    }

    for (const additive of await ctx.db.query("foodAdditives").collect()) {
      const patch: Record<string, unknown> = {};
      fieldsRepaired += addRepair(
        patch,
        "nameI18n",
        additive.name,
        additive.nameI18n
      );
      fieldsRepaired += addRepair(
        patch,
        "groupNameI18n",
        additive.groupName,
        additive.groupNameI18n
      );
      await patchIfNeeded(additive._id, patch);
    }

    return { fieldsRepaired, recordsRepaired };
  },
});
