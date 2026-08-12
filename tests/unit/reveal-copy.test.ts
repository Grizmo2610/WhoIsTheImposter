import { describe, expect, it } from "vitest";
import { revealedSecretCardArt, visibleSecretCopy } from "../../src/ui/screens/app-renderer";

describe("visible secret copy", () => {
  it("never exposes a player's role while dealing words", () => {
    const civilian = visibleSecretCopy({ role: "civilian", word: "Mặt trời", hint: null });
    const imposter = visibleSecretCopy({ role: "imposter", word: "Mặt trăng", hint: null });

    expect(civilian).toEqual({ caption: "TỪ CỦA BẠN", value: "Mặt trời" });
    expect(imposter).toEqual({ caption: "TỪ CỦA BẠN", value: "Mặt trăng" });
    expect(civilian).not.toHaveProperty("role");
    expect(imposter).not.toHaveProperty("role");
  });

  it("shows the configured hint when an imposter receives no word", () => {
    expect(visibleSecretCopy({ role: "imposter", word: null, hint: "Hãy hòa nhập" })).toEqual({
      caption: "GỢI Ý CỦA BẠN",
      value: "Hãy hòa nhập",
    });
  });

  it("uses the dedicated red face only for the no-word imposter", () => {
    const imposter = { role: "imposter", word: null, hint: "Hãy hòa nhập" } as const;
    const civilian = { role: "civilian", word: "Mặt trời", hint: null } as const;

    expect(revealedSecretCardArt(imposter, "no-word")).toContain("card-imposter-front.png");
    expect(revealedSecretCardArt(imposter, "similar")).toContain("secret-card-front.png");
    expect(revealedSecretCardArt(civilian, "no-word")).toContain("secret-card-front.png");
  });
});
