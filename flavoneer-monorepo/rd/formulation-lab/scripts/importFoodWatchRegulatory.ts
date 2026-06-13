import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface FoodWatchCategory {
  code: string;
  name: string;
}

interface FoodWatchAdditive {
  id: number;
  name: string;
  e_number: string | null;
  codex_id: number | null;
  group_name: string | null;
}

interface FoodWatchLimit {
  category_code: string;
  e_number: string | null;
  max_allowed_mg_per_kg: string;
}

interface RegulatoryCategoryImport {
  code: string;
  name: string;
}

interface RegulatoryAdditiveImport {
  name: string;
  insNumber: string;
  sourceENumber?: string;
  codexId?: number;
  groupName?: string;
}

interface RegulatoryLimitImport {
  categoryCode: string;
  insNumber: string;
  mgPerKg: number;
  source: "FoodWatch";
}

interface RegulatoryImportPayload {
  categories?: RegulatoryCategoryImport[];
  additives?: RegulatoryAdditiveImport[];
  limits?: RegulatoryLimitImport[];
}

interface FoodWatchSql {
  <T extends unknown[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  end: () => Promise<void>;
}

type FoodWatchPostgres = (
  databaseUrl: string,
  options: { max: number }
) => FoodWatchSql;

const FOODWATCH_BACKEND_DIR =
  process.env.FOODWATCH_BACKEND_DIR ??
  "/Users/subhi/Documents/GitHub/FoodWatch/packages/backend";
const FOODWATCH_ENV_PATH = resolve(FOODWATCH_BACKEND_DIR, ".env");
const BATCH_SIZE = 500;

function readEnvValue(path: string, key: string): string | undefined {
  const file = readFileSync(path, "utf8");
  const line = file
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));
  if (!line) {
    return undefined;
  }
  return line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
}

function normalizeInsNumber(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .trim()
    .replace(/^INS\s*/i, "")
    .replace(/^E\s*/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function runConvexImport(payload: RegulatoryImportPayload) {
  execFileSync(
    "pnpm",
    [
      "exec",
      "convex",
      "run",
      "regulatory:importCatalogBatch",
      JSON.stringify({
        token: process.env.REGULATORY_IMPORT_TOKEN,
        ...payload,
      }),
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
    }
  );
}

async function main() {
  const databaseUrl =
    process.env.FOODWATCH_DATABASE_URL ??
    readEnvValue(FOODWATCH_ENV_PATH, "DATABASE_URL");

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL not found in ${FOODWATCH_ENV_PATH}`);
  }

  const requireFromFoodWatch = createRequire(
    resolve(FOODWATCH_BACKEND_DIR, "package.json")
  );
  const postgres = requireFromFoodWatch("postgres") as FoodWatchPostgres;
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const categories = await sql<FoodWatchCategory[]>`
      select code, name
      from fw_food_categories
      order by code
    `;
    const additives = await sql<FoodWatchAdditive[]>`
      select
        a.id,
        a.name,
        a.e_number,
        a.codex_id,
        g.name as group_name
      from fw_additives a
      left join fw_additive_groups g on g.id = a.group_id
      where a.e_number is not null
      order by a.e_number
    `;
    const limits = await sql<FoodWatchLimit[]>`
      select
        c.code as category_code,
        a.e_number,
        l.max_allowed_mg_per_kg
      from fw_additive_limits l
      inner join fw_food_categories c on c.id = l.food_category_id
      inner join fw_additives a on a.id = l.additive_id
      where a.e_number is not null
      order by c.code, a.e_number
    `;

    runConvexImport({
      categories: categories.map((category) => ({
        code: category.code,
        name: category.name,
      })),
    });

    for (let index = 0; index < additives.length; index += BATCH_SIZE) {
      runConvexImport({
        additives: additives.slice(index, index + BATCH_SIZE).map((additive) => ({
          name: additive.name,
          insNumber: normalizeInsNumber(additive.e_number),
          sourceENumber: additive.e_number ?? undefined,
          codexId: additive.codex_id ?? undefined,
          groupName: additive.group_name ?? undefined,
        })),
      });
    }

    for (let index = 0; index < limits.length; index += BATCH_SIZE) {
      runConvexImport({
        limits: limits
          .slice(index, index + BATCH_SIZE)
          .map((limit) => ({
            categoryCode: limit.category_code,
            insNumber: normalizeInsNumber(limit.e_number),
            mgPerKg: Number.parseFloat(limit.max_allowed_mg_per_kg),
            source: "FoodWatch" as const,
          }))
          .filter((limit) => Number.isFinite(limit.mgPerKg)),
      });
    }

    console.log(
      `Imported ${categories.length} categories, ${additives.length} additives, and ${limits.length} limits.`
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
