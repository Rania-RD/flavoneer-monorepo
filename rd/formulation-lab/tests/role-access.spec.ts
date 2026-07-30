import { expect, test } from "@playwright/test";
import { isAdminRole } from "../lib/role-access";

test.describe("role-management access policy", () => {
  test("allows only the Admin system role", () => {
    expect(isAdminRole({ key: "admin" })).toBe(true);
    expect(isAdminRole({ key: "operator" })).toBe(false);
    expect(isAdminRole({ key: "supervisor" })).toBe(false);
    expect(isAdminRole({ key: "editor" })).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});
