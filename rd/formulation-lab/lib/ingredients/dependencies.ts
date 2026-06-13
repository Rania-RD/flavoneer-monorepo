export interface CompositeDependencySource {
  _id: string;
  isComposite?: boolean;
  subIngredients?: Array<{ ingredientId: string }>;
}

export interface InventoryDependencySource {
  _id: string;
  ingredientCode?: string;
}

export interface RecipeStepDependencySource<ProjectId extends string = string> {
  ingredientId?: string;
  projectId: ProjectId;
}

export function findCompositeDependencies<T extends CompositeDependencySource>(
  ingredients: T[],
  ingredientId: string
): T[] {
  return ingredients.filter(
    (ingredient) =>
      ingredient.isComposite &&
      ingredient.subIngredients?.some(
        (subIngredient) => subIngredient.ingredientId === ingredientId
      )
  );
}

export function findProjectIdsUsingIngredientCode<ProjectId extends string = string>(
  args: {
  ingredientCode?: string;
  inventoryItems: InventoryDependencySource[];
  recipeSteps: RecipeStepDependencySource<ProjectId>[];
}
): ProjectId[] {
  const { ingredientCode, inventoryItems, recipeSteps } = args;
  const normalizedCode = ingredientCode?.trim();
  if (!normalizedCode) {
    return [];
  }

  const linkedInventoryIds = new Set(
    inventoryItems
      .filter((item) => item.ingredientCode === normalizedCode)
      .map((item) => item._id)
  );
  if (linkedInventoryIds.size === 0) {
    return [];
  }

  return [
    ...new Set(
      recipeSteps
        .filter(
          (step) => step.ingredientId && linkedInventoryIds.has(step.ingredientId)
        )
        .map((step) => step.projectId)
    ),
  ];
}
