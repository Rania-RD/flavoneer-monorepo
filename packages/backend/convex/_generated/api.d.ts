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
import type * as betterAuthOrganizationMigration from "../betterAuthOrganizationMigration.js";
import type * as clearAllAppTables from "../clearAllAppTables.js";
import type * as comments from "../comments.js";
import type * as components_ from "../components.js";
import type * as equipment from "../equipment.js";
import type * as featureFlags from "../featureFlags.js";
import type * as files from "../files.js";
import type * as hotUpdater from "../hotUpdater.js";
import type * as hotUpdaterHttp from "../hotUpdaterHttp.js";
import type * as hotUpdaterValidators from "../hotUpdaterValidators.js";
import type * as http from "../http.js";
import type * as i18nMaintenance from "../i18nMaintenance.js";
import type * as ingredients from "../ingredients.js";
import type * as inventory from "../inventory.js";
import type * as labReports from "../labReports.js";
import type * as labSampleHelpers from "../labSampleHelpers.js";
import type * as labSamples from "../labSamples.js";
import type * as labTestResults from "../labTestResults.js";
import type * as localization from "../localization.js";
import type * as migrations from "../migrations.js";
import type * as organizationAuditLogs from "../organizationAuditLogs.js";
import type * as organizationInvites from "../organizationInvites.js";
import type * as organizationMembers from "../organizationMembers.js";
import type * as organizations from "../organizations.js";
import type * as permissions from "../permissions.js";
import type * as productionLineRecordHelpers from "../productionLineRecordHelpers.js";
import type * as productionLineRecords from "../productionLineRecords.js";
import type * as productionLineSettings from "../productionLineSettings.js";
import type * as productionLineSpecifications from "../productionLineSpecifications.js";
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
import type * as sharedAccess from "../sharedAccess.js";
import type * as sharedLinks from "../sharedLinks.js";
import type * as spreadsheetSteps from "../spreadsheetSteps.js";
import type * as stepDependencies from "../stepDependencies.js";
import type * as superAdmin from "../superAdmin.js";
import type * as superAdminAccess from "../superAdminAccess.js";
import type * as systemConfig from "../systemConfig.js";
import type * as units from "../units.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as workspaceAccess from "../workspaceAccess.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  auth: typeof auth;
  backdoor: typeof backdoor;
  betterAuthOrganizationMigration: typeof betterAuthOrganizationMigration;
  clearAllAppTables: typeof clearAllAppTables;
  comments: typeof comments;
  components: typeof components_;
  equipment: typeof equipment;
  featureFlags: typeof featureFlags;
  files: typeof files;
  hotUpdater: typeof hotUpdater;
  hotUpdaterHttp: typeof hotUpdaterHttp;
  hotUpdaterValidators: typeof hotUpdaterValidators;
  http: typeof http;
  i18nMaintenance: typeof i18nMaintenance;
  ingredients: typeof ingredients;
  inventory: typeof inventory;
  labReports: typeof labReports;
  labSampleHelpers: typeof labSampleHelpers;
  labSamples: typeof labSamples;
  labTestResults: typeof labTestResults;
  localization: typeof localization;
  migrations: typeof migrations;
  organizationAuditLogs: typeof organizationAuditLogs;
  organizationInvites: typeof organizationInvites;
  organizationMembers: typeof organizationMembers;
  organizations: typeof organizations;
  permissions: typeof permissions;
  productionLineRecordHelpers: typeof productionLineRecordHelpers;
  productionLineRecords: typeof productionLineRecords;
  productionLineSettings: typeof productionLineSettings;
  productionLineSpecifications: typeof productionLineSpecifications;
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
  sharedAccess: typeof sharedAccess;
  sharedLinks: typeof sharedLinks;
  spreadsheetSteps: typeof spreadsheetSteps;
  stepDependencies: typeof stepDependencies;
  superAdmin: typeof superAdmin;
  superAdminAccess: typeof superAdminAccess;
  systemConfig: typeof systemConfig;
  units: typeof units;
  users: typeof users;
  validators: typeof validators;
  workspaceAccess: typeof workspaceAccess;
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
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
