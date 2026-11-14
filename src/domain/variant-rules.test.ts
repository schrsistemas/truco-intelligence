import { describe, expect, it } from "vitest";
import { validateTrucoVariantRules, type TrucoVariantRules } from "./variant-rules";

const validRules: TrucoVariantRules = {
  deck: {
    ranks: [
      { id: "low", label: "Baixa" },
      { id: "mid", label: "Média" },
      { id: "high", label: "Alta" }
    ],
    suits: [
      { id: "clubs", label: "Paus" },
      { id: "hearts", label: "Copas" }
    ]
  },
  cardsPerPlayer: 2,
  maxRounds: 2,
  rankStrength: { low: 1, mid: 2, high: 3 },
  suitStrength: { clubs: 1, hearts: 2 },
  manilha: { kind: "next-rank-after-vira" },
  handResolution: {
    kind: "best-of",
    winsRequired: 2,
    onExhaustion: "draw"
  }
};

describe("validateTrucoVariantRules", () => {
  it("accepts a complete neutral rules contract without choosing regional values", () => {
    expect(validateTrucoVariantRules(validRules, 1)).toEqual({
      ok: true,
      rules: validRules
    });
  });

  it("rejects a round limit greater than the cards available per player", () => {
    const result = validateTrucoVariantRules({ ...validRules, maxRounds: 3 }, 1);
    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["INVALID_MAX_ROUNDS"])
    });
  });

  it("rejects a deck that cannot deal the configured number of cards", () => {
    const result = validateTrucoVariantRules(validRules, 2);
    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["NOT_ENOUGH_CARDS"])
    });
  });

  it("requires one unique integer strength for every rank and suit", () => {
    const result = validateTrucoVariantRules({
      ...validRules,
      rankStrength: { low: 1, mid: 1, high: 3 },
      suitStrength: { clubs: 1 }
    }, 1);
    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["INVALID_RANK_STRENGTH", "INVALID_SUIT_STRENGTH"])
    });
  });

  it("rejects an impossible hand resolution threshold", () => {
    const result = validateTrucoVariantRules({
      ...validRules,
      handResolution: { ...validRules.handResolution, winsRequired: 3 }
    }, 1);
    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["INVALID_HAND_RESOLUTION"])
    });
  });

  it("returns defensive copies of deck and strength configuration", () => {
    const result = validateTrucoVariantRules(validRules, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rules.deck).not.toBe(validRules.deck);
    expect(result.rules.deck.ranks).not.toBe(validRules.deck.ranks);
    expect(result.rules.rankStrength).not.toBe(validRules.rankStrength);
  });
});
