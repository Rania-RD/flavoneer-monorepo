export interface GsfaCategoryOption {
  code: string;
  name: string;
}

export function formatGsfaCategoryCode(code: string): string {
  const trimmedCode = code.trim();
  if (!/^\d+(?:\.\d+)*$/.test(trimmedCode)) {
    return trimmedCode;
  }

  const [majorCode, ...subcategories] = trimmedCode.split(".");
  const normalizedMajorCode = majorCode
    .replace(/^0+(?=\d)/, "")
    .padStart(2, "0");
  const normalizedSubcategories = subcategories.length
    ? subcategories
    : ["0"];

  return [normalizedMajorCode, ...normalizedSubcategories].join(".");
}

export function formatGsfaCategoryLabel(
  category: Pick<GsfaCategoryOption, "code"> &
    Partial<Pick<GsfaCategoryOption, "name">>
): string {
  const formattedCode = formatGsfaCategoryCode(category.code);
  const name = category.name?.trim();

  if (!(name && name !== category.code.trim() && name !== formattedCode)) {
    return formattedCode;
  }

  return `${formattedCode} · ${name}`;
}

export function matchesGsfaCategory(
  category: GsfaCategoryOption,
  search: string
): boolean {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return (
    category.code.toLocaleLowerCase().includes(normalizedSearch) ||
    formatGsfaCategoryCode(category.code)
      .toLocaleLowerCase()
      .includes(normalizedSearch) ||
    category.name.toLocaleLowerCase().includes(normalizedSearch)
  );
}
