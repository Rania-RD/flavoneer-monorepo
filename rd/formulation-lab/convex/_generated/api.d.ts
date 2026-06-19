/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as auth from "../auth.js";
import type * as backdoor from "../backdoor.js";
import type * as clearAllAppTables from "../clearAllAppTables.js";
import type * as comments from "../comments.js";
import type * as equipment from "../equipment.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as ingredients from "../ingredients.js";
import type * as inventory from "../inventory.js";
import type * as labReports from "../labReports.js";
import type * as labTestResults from "../labTestResults.js";
import type * as localization from "../localization.js";
import type * as permissions from "../permissions.js";
import type * as projectIngredients from "../projectIngredients.js";
import type * as projectVersions from "../projectVersions.js";
import type * as projects from "../projects.js";
import type * as recipePhases from "../recipePhases.js";
import type * as regulatory from "../regulatory.js";
import type * as regulatoryHelpers from "../regulatoryHelpers.js";
import type * as roles from "../roles.js";
import type * as runs from "../runs.js";
import type * as sensory from "../sensory.js";
import type * as settings from "../settings.js";
import type * as sharedLinks from "../sharedLinks.js";
import type * as spreadsheetSteps from "../spreadsheetSteps.js";
import type * as stepDependencies from "../stepDependencies.js";
import type * as systemConfig from "../systemConfig.js";
import type * as teamAuditLogs from "../teamAuditLogs.js";
import type * as teamInvites from "../teamInvites.js";
import type * as teamMembers from "../teamMembers.js";
import type * as teams from "../teams.js";
import type * as units from "../units.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  auth: typeof auth;
  backdoor: typeof backdoor;
  clearAllAppTables: typeof clearAllAppTables;
  comments: typeof comments;
  equipment: typeof equipment;
  files: typeof files;
  http: typeof http;
  ingredients: typeof ingredients;
  inventory: typeof inventory;
  labReports: typeof labReports;
  labTestResults: typeof labTestResults;
  localization: typeof localization;
  permissions: typeof permissions;
  projectIngredients: typeof projectIngredients;
  projectVersions: typeof projectVersions;
  projects: typeof projects;
  recipePhases: typeof recipePhases;
  regulatory: typeof regulatory;
  regulatoryHelpers: typeof regulatoryHelpers;
  roles: typeof roles;
  runs: typeof runs;
  sensory: typeof sensory;
  settings: typeof settings;
  sharedLinks: typeof sharedLinks;
  spreadsheetSteps: typeof spreadsheetSteps;
  stepDependencies: typeof stepDependencies;
  systemConfig: typeof systemConfig;
  teamAuditLogs: typeof teamAuditLogs;
  teamInvites: typeof teamInvites;
  teamMembers: typeof teamMembers;
  teams: typeof teams;
  units: typeof units;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
