import { getAvatarIdentity, getInitials } from "@flavoneer/ui/avatar";
import { expect, test } from "@playwright/test";

test.describe("shared avatar identity", () => {
  test("builds initials from one name or the first and last names", () => {
    expect(getInitials("Rania")).toBe("RA");
    expect(getInitials("Rania Ahmad Saleh")).toBe("RS");
    expect(getInitials("سارة أحمد")).toBe("سأ");
    expect(getInitials("   ")).toBe("?");
  });

  test("keeps the same color for equivalent stable seeds", () => {
    const first = getAvatarIdentity("Rania Saleh", "USER@example.com");
    const second = getAvatarIdentity("Renamed User", "user@example.com");

    expect(second.backgroundColor).toBe(first.backgroundColor);
    expect(second.color).toBe(first.color);
    expect(second.initials).toBe("RU");
  });
});
