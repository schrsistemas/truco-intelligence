import { describe, expect, it } from "vitest";
import { DEFAULT_VARIANT, validateVariant } from "./variant";

describe("validateVariant", () => {
  it("accepts the default versioned scoreboard variant", () => {
    expect(validateVariant(DEFAULT_VARIANT)).toEqual({
      ok: true,
      variant: DEFAULT_VARIANT
    });
  });

  it("trims the variant name", () => {
    const result = validateVariant({ ...DEFAULT_VARIANT, name: "  Truco local  " });
    expect(result.ok && result.variant.name).toBe("Truco local");
  });

  it("rejects invalid identifiers and unsupported target scores", () => {
    const result = validateVariant({
      ...DEFAULT_VARIANT,
      variantId: "Truco Paulista",
      targetScore: 10
    });

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["INVALID_ID", "INVALID_TARGET_SCORE"])
    });
  });

  it("rejects non-JSON values inside custom rules", () => {
    const result = validateVariant({
      ...DEFAULT_VARIANT,
      rules: { invalid: Number.NaN }
    });

    expect(result).toMatchObject({
      ok: false,
      errors: ["RULES_MUST_BE_JSON"]
    });
  });

  it("rejects cyclic custom rule objects instead of recursing indefinitely", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const result = validateVariant({ ...DEFAULT_VARIANT, rules: cyclic });

    expect(result).toMatchObject({ ok: false, errors: ["RULES_MUST_BE_JSON"] });
  });

  it("rejects an invalid number of players per team", () => {
    const result = validateVariant({
      ...DEFAULT_VARIANT,
      playersPerTeam: 0
    });

    expect(result).toMatchObject({
      ok: false,
      errors: ["INVALID_PLAYERS_PER_TEAM"]
    });
  });
});
