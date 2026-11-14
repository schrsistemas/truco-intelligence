import { describe, expect, it } from "vitest";
import { createDeck, dealCards } from "./cards";
import { createPlayerRoster } from "./players";
import { finishHand, playCard, startHand, startNextRound, type HandState } from "./rounds";

const players = createPlayerRoster(1);
const deck = createDeck({
  ranks: [{ id: "a", label: "Ás" }, { id: "k", label: "Rei" }, { id: "q", label: "Dama" }],
  suits: [{ id: "clubs", label: "Paus" }, { id: "hearts", label: "Copas" }]
});
const dealResult = dealCards(deck, players.map((player) => player.playerId), 3);
if (!dealResult.ok) throw new Error("Fixture de distribuição inválida.");
const dealtHands = dealResult.hands;

function newHand(): HandState {
  const result = startHand({
    handId: "hand-1", variantId: "test-variant", rulesVersion: 1,
    maxRounds: 3, players, hands: dealtHands
  });
  if (!result.ok) throw new Error("Fixture de mão inválida.");
  return result.state;
}

function playOneRound(state: HandState, evaluator: (plays: readonly { playerId: string }[]) => string | null) {
  let current = state;
  for (const player of players) {
    const card = current.hands.find((hand) => hand.playerId === player.playerId)!.cards[0];
    const result = playCard(current, player.playerId, card.cardId, evaluator);
    if (!result.ok) throw new Error(`Jogada inválida: ${result.reason}`);
    current = result.state;
  }
  return current;
}

describe("hand and round engine", () => {
  it("starts a versioned hand and emits HAND_STARTED", () => {
    const result = startHand({
      handId: "hand-1", variantId: "test-variant", rulesVersion: 1,
      maxRounds: 3, players, hands: dealtHands
    });
    expect(result).toMatchObject({ ok: true, state: { rounds: [{ number: 1, plays: [] }] } });
    if (result.ok) expect(result.events[0].type).toBe("HAND_STARTED");
  });

  it("rejects mismatched players, empty hands and duplicate cards", () => {
    expect(startHand({
      handId: "hand-1", variantId: "test", rulesVersion: 1, maxRounds: 3,
      players, hands: [dealtHands[0], { ...dealtHands[1], playerId: dealtHands[0].playerId }]
    })).toMatchObject({ ok: false, reason: "INVALID_HAND" });
    expect(startHand({
      handId: "hand-1", variantId: "test", rulesVersion: 1, maxRounds: 3,
      players, hands: dealtHands.map((hand) => ({ ...hand, cards: [] }))
    })).toMatchObject({ ok: false, reason: "INVALID_HAND" });
    expect(startHand({
      handId: "hand-1", variantId: "test", rulesVersion: 1, maxRounds: 3,
      players, hands: dealtHands.map((hand) => ({ ...hand, cards: [deck[0]] }))
    })).toMatchObject({ ok: false, reason: "INVALID_HAND" });
  });

  it("rejects a card that belongs to another player", () => {
    const state = newHand();
    const foreign = state.hands[1].cards[0];
    expect(playCard(state, players[0].playerId, foreign.cardId, () => null))
      .toMatchObject({ ok: false, reason: "CARD_NOT_IN_HAND" });
  });

  it("prevents the same player from playing twice in one round", () => {
    const state = newHand();
    const first = playCard(state, players[0].playerId, state.hands[0].cards[0].cardId, () => null);
    if (!first.ok) throw new Error("Primeira jogada inválida.");
    expect(playCard(first.state, players[0].playerId, first.state.hands[0].cards[0].cardId, () => null))
      .toMatchObject({ ok: false, reason: "PLAYER_ALREADY_PLAYED" });
  });

  it("evaluates only after every player has played and emits round events", () => {
    const state = newHand();
    const result = playOneRound(state, (plays) => plays[0]?.playerId ?? null);
    expect(result.rounds[0].result).toEqual({ winnerPlayerId: players[0].playerId, tied: false });
  });

  it("represents a tie without imposing regional tie behavior", () => {
    const result = playOneRound(newHand(), () => null);
    expect(result.rounds[0].result).toEqual({ winnerPlayerId: null, tied: true });
  });

  it("opens the next round only after the current round is complete", () => {
    expect(startNextRound(newHand())).toMatchObject({ ok: false, reason: "ROUND_NOT_COMPLETE" });
    const completed = playOneRound(newHand(), (plays) => plays[0].playerId);
    expect(startNextRound(completed)).toMatchObject({ ok: true, state: { rounds: [{ number: 1 }, { number: 2 }] } });
  });

  it("delegates hand completion and team winner to the variant resolver", () => {
    const completed = playOneRound(newHand(), (plays) => plays[0].playerId);
    const unresolved = finishHand(completed, () => ({ finished: false, winnerTeamId: null }));
    expect(unresolved).toMatchObject({ ok: false, reason: "ROUND_NOT_COMPLETE" });
    const finished = finishHand(completed, () => ({ finished: true, winnerTeamId: "team-a" }));
    expect(finished).toMatchObject({ ok: true, state: { status: "finished", winnerTeamId: "team-a" } });
    if (finished.ok) expect(finished.events[0].type).toBe("HAND_FINISHED");
  });

  it("rejects an evaluator winner who did not play the round", () => {
    const state = newHand();
    const first = playCard(state, players[0].playerId, state.hands[0].cards[0].cardId, () => "outsider");
    if (!first.ok) throw new Error("Primeira jogada inválida.");
    const second = playCard(first.state, players[1].playerId, first.state.hands[1].cards[0].cardId, () => "outsider");
    expect(second).toMatchObject({ ok: false, reason: "INVALID_ROUND_WINNER" });
  });

  it("enforces the configured maximum number of rounds", () => {
    let state = newHand();
    for (let round = 0; round < 3; round += 1) {
      state = playOneRound(state, (plays) => plays[0].playerId);
      if (round < 2) {
        const next = startNextRound(state);
        if (!next.ok) throw new Error("Próxima rodada deveria iniciar.");
        state = next.state;
      }
    }
    expect(startNextRound(state)).toMatchObject({ ok: false, reason: "MAX_ROUNDS_REACHED" });
  });
});
