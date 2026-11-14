import { describe, expect, it } from "vitest";
import { createDeck, dealCards, validateDeckDefinition, type DeckDefinition } from "./cards";

const definition: DeckDefinition = {
  ranks: [{ id: "a", label: "Ás" }, { id: "k", label: "Rei" }, { id: "q", label: "Dama" }],
  suits: [{ id: "clubs", label: "Paus" }, { id: "hearts", label: "Copas" }]
};

describe("deck definition", () => {
  it("validates a configurable ranks and suits catalog", () => {
    expect(validateDeckDefinition(definition)).toMatchObject({ ok: true });
  });

  it("rejects duplicate rank and suit identifiers", () => {
    const result = validateDeckDefinition({
      ranks: [{ id: "a", label: "Ás" }, { id: "a", label: "Outro" }],
      suits: [{ id: "x", label: "X" }, { id: "x", label: "Y" }]
    });
    expect(result).toMatchObject({ ok: false, errors: ["DUPLICATE_RANK", "DUPLICATE_SUIT"] });
  });

  it("builds the cartesian product without assigning card strength", () => {
    const deck = createDeck(definition);
    expect(deck).toHaveLength(6);
    expect(deck[0]).toEqual({ cardId: "a:clubs", rankId: "a", suitId: "clubs" });
  });
});

describe("dealCards", () => {
  it("deals in round-robin order and preserves the remaining deck", () => {
    const deck = createDeck(definition);
    const result = dealCards(deck, ["p1", "p2"], 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hands.map((hand) => hand.cards.map((card) => card.cardId))).toEqual([
      ["a:clubs", "k:clubs"],
      ["a:hearts", "k:hearts"]
    ]);
    expect(result.remaining).toHaveLength(2);
  });

  it("rejects duplicate players, duplicate cards and insufficient cards", () => {
    const deck = createDeck(definition);
    expect(dealCards(deck, ["p1", "p1"], 1)).toMatchObject({ ok: false, reason: "DUPLICATE_PLAYER" });
    expect(dealCards([deck[0], deck[0]], ["p1"], 1)).toMatchObject({ ok: false, reason: "DUPLICATE_CARD" });
    expect(dealCards(deck, ["p1", "p2", "p3"], 3)).toMatchObject({ ok: false, reason: "NOT_ENOUGH_CARDS" });
  });

  it("rejects invalid deal sizes", () => {
    const deck = createDeck(definition);
    expect(dealCards(deck, ["p1"], 0)).toMatchObject({ ok: false, reason: "INVALID_CARDS_PER_PLAYER" });
    expect(dealCards(deck, [], 1)).toMatchObject({ ok: false, reason: "INVALID_PLAYERS" });
  });
});
