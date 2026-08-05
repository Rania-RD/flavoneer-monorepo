import { createHotUpdaterBackendEnv } from "@flavoneer/config/env/server";
import { getUpdateInfo } from "@hot-updater/js";
import { internal } from "./_generated/api";
import { type ActionCtx, env, httpAction } from "./_generated/server";
import type { HotUpdaterBundle } from "./hotUpdaterValidators";

const hotUpdaterEnv = createHotUpdaterBackendEnv({
  HOT_UPDATER_API_TOKEN: env.HOT_UPDATER_API_TOKEN,
  HOT_UPDATER_S3_ACCESS_KEY_ID: env.HOT_UPDATER_S3_ACCESS_KEY_ID,
  HOT_UPDATER_S3_BASE_PATH: env.HOT_UPDATER_S3_BASE_PATH,
  HOT_UPDATER_S3_BUCKET: env.HOT_UPDATER_S3_BUCKET,
  HOT_UPDATER_S3_ENDPOINT: env.HOT_UPDATER_S3_ENDPOINT,
  HOT_UPDATER_S3_REGION: env.HOT_UPDATER_S3_REGION,
  HOT_UPDATER_S3_SECRET_ACCESS_KEY: env.HOT_UPDATER_S3_SECRET_ACCESS_KEY,
});

const HOT_UPDATER_SERVER_VERSION = "0.35.4";
const MAX_BUNDLES_PER_REQUEST = 10;
const MAX_LIST_LIMIT = 100;
const encoder = new TextEncoder();

type Platform = "ios" | "android";
type UpdateStrategy = "appVersion" | "fingerprint";

type BundleListResult = {
  data: HotUpdaterBundle[];
  pagination: {
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    currentPage: number;
    totalPages: number;
    nextCursor?: string | null;
    previousCursor?: string | null;
  };
};

function jsonResponse(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlatform(value: unknown): value is Platform {
  return value === "ios" || value === "android";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || isNullableString(value);
}

function isOptionalStringArray(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function isBundlePatch(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.baseBundleId === "string" &&
    typeof value.baseFileHash === "string" &&
    typeof value.patchFileHash === "string" &&
    typeof value.patchStorageUri === "string"
  );
}

function parseBundle(value: unknown): HotUpdaterBundle | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    !isPlatform(value.platform) ||
    typeof value.shouldForceUpdate !== "boolean" ||
    typeof value.enabled !== "boolean" ||
    typeof value.fileHash !== "string" ||
    typeof value.storageUri !== "string" ||
    !isNullableString(value.gitCommitHash) ||
    !isNullableString(value.message) ||
    typeof value.channel !== "string" ||
    !isNullableString(value.targetAppVersion) ||
    !isNullableString(value.fingerprintHash) ||
    !isOptionalNullableString(value.manifestStorageUri) ||
    !isOptionalNullableString(value.manifestFileHash) ||
    !isOptionalNullableString(value.assetBaseStorageUri) ||
    !isOptionalNullableString(value.patchBaseBundleId) ||
    !isOptionalNullableString(value.patchBaseFileHash) ||
    !isOptionalNullableString(value.patchFileHash) ||
    !isOptionalNullableString(value.patchStorageUri) ||
    !(
      value.rolloutCohortCount === undefined ||
      value.rolloutCohortCount === null ||
      typeof value.rolloutCohortCount === "number"
    ) ||
    !isOptionalStringArray(value.targetCohorts) ||
    !(
      value.patches === undefined ||
      value.patches === null ||
      (Array.isArray(value.patches) && value.patches.every(isBundlePatch))
    )
  ) {
    return null;
  }

  if (
    value.metadata !== undefined &&
    (!isRecord(value.metadata) ||
      (value.metadata.app_version !== undefined && typeof value.metadata.app_version !== "string"))
  ) {
    return null;
  }

  return value as HotUpdaterBundle;
}

function parseBoolean(value: string | null, name: string) {
  if (value === null) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${name} must be 'true' or 'false'`);
}

function parseNullableString(value: string | null) {
  if (value === null) {
    return undefined;
  }
  return value === "null" ? null : value;
}

function parsePositiveInteger(
  value: string | null,
  name: string,
  defaultValue: number,
  maximum: number,
) {
  if (value === null) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${name} must be between 1 and ${maximum}`);
  }
  return parsed;
}

function rfc3986Encode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function toHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return await crypto.subtle.digest("SHA-256", encoder.encode(value));
}

async function hmacSha256(key: BufferSource, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
}

async function signStorageUri(storageUri: string) {
  const storageUrl = new URL(storageUri);
  const bucket = storageUrl.hostname;
  const key = storageUrl.pathname.slice(1);
  if (
    storageUrl.protocol !== "s3:" ||
    bucket !== hotUpdaterEnv.s3Bucket ||
    !key.startsWith(`${hotUpdaterEnv.s3BasePath}/`)
  ) {
    throw new Error("Bundle uses an unexpected storage URI");
  }

  const endpoint = new URL(hotUpdaterEnv.s3Endpoint);
  const host = `${bucket}.${endpoint.host}`;
  const canonicalUri = `/${key.split("/").map(rfc3986Encode).join("/")}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${hotUpdaterEnv.s3Region}/s3/aws4_request`;
  const queryEntries = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD"],
    ["X-Amz-Credential", `${hotUpdaterEnv.s3AccessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", "3600"],
    ["X-Amz-SignedHeaders", "host"],
    ["x-amz-checksum-mode", "ENABLED"],
    ["x-id", "GetObject"],
  ] as const;
  const canonicalQuery = [...queryEntries]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([name, value]) => `${rfc3986Encode(name)}=${rfc3986Encode(value)}`)
    .join("&");
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join("\n");
  const dateKey = await hmacSha256(
    encoder.encode(`AWS4${hotUpdaterEnv.s3SecretAccessKey}`),
    dateStamp,
  );
  const regionKey = await hmacSha256(dateKey, hotUpdaterEnv.s3Region);
  const serviceKey = await hmacSha256(regionKey, "s3");
  const signingKey = await hmacSha256(serviceKey, "aws4_request");
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  return `${endpoint.protocol}//${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function hasValidApiToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${hotUpdaterEnv.apiToken}`;
  const [actualHash, expectedHash] = await Promise.all([sha256(authorization), sha256(expected)]);
  const actual = new Uint8Array(actualHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= actual[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

function decodePath(pathname: string) {
  try {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    throw new Error("Path contains invalid URL encoding");
  }
}

async function handleUpdateCheck(
  ctx: ActionCtx,
  request: Request,
  segments: string[],
  strategy: UpdateStrategy,
) {
  const platform = segments[2];
  const target = segments[3];
  const channel = segments[4];
  const minBundleId = segments[5];
  const bundleId = segments[6];
  const cohort = segments[7];
  if (
    !isPlatform(platform) ||
    !target ||
    !channel ||
    !minBundleId ||
    !bundleId ||
    segments.length > 8
  ) {
    return jsonResponse({ error: "Invalid update-check path" }, 400);
  }

  const bundles: HotUpdaterBundle[] = await ctx.runQuery(internal.hotUpdater.getUpdateCandidates, {
    platform,
    channel,
    minBundleId,
  });
  const updateInfo = await getUpdateInfo(
    bundles,
    strategy === "appVersion"
      ? {
          _updateStrategy: "appVersion",
          platform,
          appVersion: target,
          channel,
          minBundleId,
          bundleId,
          ...(cohort ? { cohort } : {}),
        }
      : {
          _updateStrategy: "fingerprint",
          platform,
          fingerprintHash: target,
          channel,
          minBundleId,
          bundleId,
          ...(cohort ? { cohort } : {}),
        },
  );

  if (!updateInfo) {
    const sdkVersion = request.headers.get("Hot-Updater-SDK-Version");
    return jsonResponse(sdkVersion ? { status: "UP_TO_DATE" } : null);
  }

  const { storageUri, ...response } = updateInfo;
  return jsonResponse({
    ...response,
    fileUrl: storageUri ? await signStorageUri(storageUri) : null,
  });
}

async function handleBundleList(ctx: ActionCtx, request: Request) {
  const url = new URL(request.url);
  const platformValue = url.searchParams.get("platform");
  if (platformValue !== null && !isPlatform(platformValue)) {
    return jsonResponse({ error: "platform must be 'ios' or 'android'" }, 400);
  }
  if (url.searchParams.has("offset")) {
    return jsonResponse({ error: "offset is unsupported; use after or before" }, 400);
  }

  try {
    const limit = parsePositiveInteger(url.searchParams.get("limit"), "limit", 50, MAX_LIST_LIMIT);
    const page = parsePositiveInteger(url.searchParams.get("page"), "page", 1, 10_000);
    const enabled = parseBoolean(url.searchParams.get("enabled"), "enabled");
    const targetAppVersionNotNull = parseBoolean(
      url.searchParams.get("targetAppVersionNotNull"),
      "targetAppVersionNotNull",
    );
    const result: BundleListResult = await ctx.runQuery(internal.hotUpdater.listBundles, {
      ...(url.searchParams.get("channel")
        ? { channel: url.searchParams.get("channel") as string }
        : {}),
      ...(platformValue ? { platform: platformValue } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
      ...(url.searchParams.has("targetAppVersion")
        ? {
            targetAppVersion: parseNullableString(url.searchParams.get("targetAppVersion")),
          }
        : {}),
      ...(url.searchParams.getAll("targetAppVersionIn").length > 0
        ? {
            targetAppVersionIn: url.searchParams.getAll("targetAppVersionIn"),
          }
        : {}),
      ...(targetAppVersionNotNull !== undefined ? { targetAppVersionNotNull } : {}),
      ...(url.searchParams.has("fingerprintHash")
        ? {
            fingerprintHash: parseNullableString(url.searchParams.get("fingerprintHash")),
          }
        : {}),
      ...Object.fromEntries(
        ["idEq", "idGt", "idGte", "idLt", "idLte", "after", "before"]
          .map((name) => [name, url.searchParams.get(name)])
          .filter((entry): entry is [string, string] => entry[1] !== null),
      ),
      ...(url.searchParams.getAll("idIn").length > 0
        ? { idIn: url.searchParams.getAll("idIn") }
        : {}),
      limit,
      page,
    });
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Invalid query" }, 400);
  }
}

async function handleManagementRequest(ctx: ActionCtx, request: Request, segments: string[]) {
  if (!(await hasValidApiToken(request))) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (request.method === "GET" && segments.length === 4 && segments[3] === "channels") {
    const channels: string[] = await ctx.runQuery(internal.hotUpdater.getChannels, {});
    return jsonResponse({ data: { channels } });
  }

  if (request.method === "GET" && segments.length === 3) {
    return await handleBundleList(ctx, request);
  }

  if (request.method === "GET" && segments.length === 4) {
    const bundle: HotUpdaterBundle | null = await ctx.runQuery(internal.hotUpdater.getBundle, {
      bundleId: segments[3],
    });
    return bundle ? jsonResponse(bundle) : jsonResponse({ error: "Bundle not found" }, 404);
  }

  if (request.method === "POST" && segments.length === 3) {
    const body: unknown = await request.json().catch(() => null);
    const values = Array.isArray(body) ? body : [body];
    if (values.length === 0 || values.length > MAX_BUNDLES_PER_REQUEST) {
      return jsonResponse({ error: "Invalid bundle count" }, 400);
    }
    const bundles = values.map(parseBundle);
    if (bundles.some((bundle) => bundle === null)) {
      return jsonResponse({ error: "Invalid bundle payload" }, 400);
    }
    await ctx.runMutation(internal.hotUpdater.upsertBundles, {
      bundles: bundles as HotUpdaterBundle[],
    });
    return jsonResponse({ success: true }, 201);
  }

  if (request.method === "PATCH" && segments.length === 4) {
    const bundleId = segments[3];
    const current: HotUpdaterBundle | null = await ctx.runQuery(internal.hotUpdater.getBundle, {
      bundleId,
    });
    if (!current) {
      return jsonResponse({ error: "Bundle not found" }, 404);
    }
    const body: unknown = await request.json().catch(() => null);
    const patch = Array.isArray(body) ? body[0] : body;
    if (!isRecord(patch) || (patch.id !== undefined && patch.id !== bundleId)) {
      return jsonResponse({ error: "Invalid bundle payload" }, 400);
    }
    const updated = parseBundle({ ...current, ...patch, id: bundleId });
    if (!updated) {
      return jsonResponse({ error: "Invalid bundle payload" }, 400);
    }
    await ctx.runMutation(internal.hotUpdater.upsertBundles, {
      bundles: [updated],
    });
    return jsonResponse({ success: true });
  }

  if (request.method === "DELETE" && segments.length === 4) {
    const deleted: boolean = await ctx.runMutation(internal.hotUpdater.deleteBundle, {
      bundleId: segments[3],
    });
    return deleted
      ? jsonResponse({ success: true })
      : jsonResponse({ error: "Bundle not found" }, 404);
  }

  return jsonResponse({ error: "Not found" }, 404);
}

export const handleHotUpdater = httpAction(async (ctx, request) => {
  try {
    const segments = decodePath(new URL(request.url).pathname);
    if (segments[0] !== "hot-updater") {
      return jsonResponse({ error: "Not found" }, 404);
    }
    if (request.method === "GET" && segments.length === 2 && segments[1] === "version") {
      return jsonResponse({ version: HOT_UPDATER_SERVER_VERSION });
    }
    if (
      request.method === "GET" &&
      segments[1] === "app-version" &&
      (segments.length === 7 || segments.length === 8)
    ) {
      return await handleUpdateCheck(ctx, request, segments, "appVersion");
    }
    if (
      request.method === "GET" &&
      segments[1] === "fingerprint" &&
      (segments.length === 7 || segments.length === 8)
    ) {
      return await handleUpdateCheck(ctx, request, segments, "fingerprint");
    }
    if (segments[1] === "api" && segments[2] === "bundles") {
      return await handleManagementRequest(ctx, request, segments);
    }
    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Hot Updater endpoint failed", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
