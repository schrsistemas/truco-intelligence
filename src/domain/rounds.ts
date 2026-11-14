import type { TeamId } from "./game";
import type { Card, DealtHand } from "./cards";
import type { Player } from "./players";

export interface PlayedCard {
  readonly playerId: string;
  readonly teamId: TeamId;
  readonly card: Card;
  readonly playedAt: string;
}
export interface RoundResult {
  readonly winnerPlayerId: string | null;
  readonly tied: boolean;
}
export interface RoundState {
  readonly number: number;
  readonly plays: readonly PlayedCard[];
  readonly result: RoundResult | null;
}
export interface HandState {
  readonly handId: string;
  readonly variantId: string;
  readonly rulesVersion: number;
  readonly maxRounds: number;
  readonly players: readonly Player[];
  readonly hands: readonly DealtHand[];
  readonly rounds: readonly RoundState[];
  readonly status: "in-progress" | "finished";
  readonly winnerTeamId: TeamId | null;
}
export type HandEventType = "HAND_STARTED" | "CARD_PLAYED" | "ROUND_FINISHED" | "HAND_FINISHED";
export interface HandEvent {
  readonly eventId: string;
  readonly type: HandEventType;
  readonly handId: string;
  readonly roundNumber?: number;
  readonly playerId?: string;
  readonly cardId?: string;
  readonly winnerPlayerId?: string | null;
  readonly winnerTeamId?: TeamId | null;
  readonly occurredAt: string;
}
export type HandError =
  | "INVALID_HAND" | "HAND_FINISHED" | "INVALID_PLAYER" | "PLAYER_ALREADY_PLAYED"
  | "CARD_NOT_IN_HAND" | "CARD_ALREADY_PLAYED" | "ROUND_ALREADY_COMPLETE"
  | "ROUND_NOT_COMPLETE" | "MAX_ROUNDS_REACHED" | "INVALID_ROUND_WINNER"
  | "INVALID_HAND_RESULT";
export type HandResult =
  | { readonly ok: true; readonly state: HandState; readonly events: readonly HandEvent[] }
  | { readonly ok: false; readonly reason: HandError };
export type RoundEvaluator = (plays: readonly PlayedCard[], players: readonly Player[]) => string | null;
export interface HandResolution {
  readonly finished: boolean;
  readonly winnerTeamId: TeamId | null;
}
export type HandResolver = (rounds: readonly RoundState[], players: readonly Player[]) => HandResolution;

function createEvent(
  type: HandEventType,
  handId: string,
  details: Omit<HandEvent, "eventId" | "type" | "handId" | "occurredAt"> = {}
): HandEvent {
  return { eventId: crypto.randomUUID(), type, handId, ...details, occurredAt: new Date().toISOString() };
}

/** Inicializa a mão com cartas já distribuídas pela política da variante. */
export function startHand(input: {
  readonly handId: string;
  readonly variantId: string;
  readonly rulesVersion: number;
  readonly maxRounds: number;
  readonly players: readonly Player[];
  readonly hands: readonly DealtHand[];
}): HandResult {
  if (
    !input.handId.trim() || !input.variantId.trim() ||
    !Number.isInteger(input.rulesVersion) || input.rulesVersion < 1 ||
    !Number.isInteger(input.maxRounds) || input.maxRounds < 1 ||
    input.players.length < 2 || input.hands.length !== input.players.length
  ) return { ok: false, reason: "INVALID_HAND" };

  const playerIds = input.players.map((player) => player.playerId);
  const handPlayerIds = input.hands.map((hand) => hand.playerId);
  const cardIds = input.hands.flatMap((hand) => hand.cards.map((card) => card.cardId));
  const cardsPerHand = input.hands[0]?.cards.length ?? 0;
  if (
    playerIds.some((id) => !id.trim()) || new Set(playerIds).size !== playerIds.length ||
    new Set(handPlayerIds).size !== handPlayerIds.length ||
    playerIds.some((id) => !handPlayerIds.includes(id)) ||
    handPlayerIds.some((id) => !playerIds.includes(id)) ||
    cardsPerHand < 1 || input.hands.some((hand) => hand.cards.length !== cardsPerHand) ||
    new Set(cardIds).size !== cardIds.length
  ) return { ok: false, reason: "INVALID_HAND" };

  const state: HandState = {
    handId: input.handId, variantId: input.variantId, rulesVersion: input.rulesVersion,
    maxRounds: input.maxRounds, players: input.players, hands: input.hands,
    rounds: [{ number: 1, plays: [], result: null }],
    status: "in-progress", winnerTeamId: null
  };
  return { ok: true, state, events: [createEvent("HAND_STARTED", input.handId)] };
}

/** Registra uma carta e avalia a rodada somente após todos os jogadores atuarem. */
export function playCard(
  state: HandState,
  playerId: string,
  cardId: string,
  evaluateRound: RoundEvaluator
): HandResult {
  if (state.status === "finished") return { ok: false, reason: "HAND_FINISHED" };
  const round = state.rounds[state.rounds.length - 1];
  if (!round || round.result) return { ok: false, reason: "ROUND_ALREADY_COMPLETE" };
  const player = state.players.find((item) => item.playerId === playerId);
  if (!player) return { ok: false, reason: "INVALID_PLAYER" };
  if (round.plays.some((play) => play.playerId === playerId)) {
    return { ok: false, reason: "PLAYER_ALREADY_PLAYED" };
  }

  const playerHand = state.hands.find((hand) => hand.playerId === playerId);
  const cardIndex = playerHand?.cards.findIndex((card) => card.cardId === cardId) ?? -1;
  if (!playerHand || cardIndex < 0) {
    const alreadyPlayed = state.rounds.some((item) => item.plays.some((play) => play.card.cardId === cardId));
    return { ok: false, reason: alreadyPlayed ? "CARD_ALREADY_PLAYED" : "CARD_NOT_IN_HAND" };
  }

  const card = playerHand.cards[cardIndex];
  const play: PlayedCard = { playerId, teamId: player.teamId, card, playedAt: new Date().toISOString() };
  const nextHands = state.hands.map((hand) => hand.playerId === playerId
    ? { ...hand, cards: hand.cards.filter((item) => item.cardId !== cardId) }
    : hand);
  const nextPlays = [...round.plays, play];
  const nextRounds = state.rounds.map((item, index) =>
    index === state.rounds.length - 1 ? { ...item, plays: nextPlays } : item);
  const events: HandEvent[] = [createEvent("CARD_PLAYED", state.handId, {
    roundNumber: round.number, playerId, cardId
  })];
  let nextState: HandState = { ...state, hands: nextHands, rounds: nextRounds };

  if (nextPlays.length === state.players.length) {
    const winnerPlayerId = evaluateRound(nextPlays, state.players);
    if (winnerPlayerId !== null && !nextPlays.some((item) => item.playerId === winnerPlayerId)) {
      return { ok: false, reason: "INVALID_ROUND_WINNER" };
    }
    const result: RoundResult = { winnerPlayerId, tied: winnerPlayerId === null };
    nextState = {
      ...nextState,
      rounds: nextRounds.map((item, index) =>
        index === nextRounds.length - 1 ? { ...item, result } : item)
    };
    events.push(createEvent("ROUND_FINISHED", state.handId, { roundNumber: round.number, winnerPlayerId }));
  }
  return { ok: true, state: nextState, events };
}

/** Abre a rodada seguinte somente após a anterior ter sido avaliada. */
export function startNextRound(state: HandState): HandResult {
  if (state.status === "finished") return { ok: false, reason: "HAND_FINISHED" };
  const current = state.rounds[state.rounds.length - 1];
  if (!current?.result) return { ok: false, reason: "ROUND_NOT_COMPLETE" };
  if (state.rounds.length >= state.maxRounds) return { ok: false, reason: "MAX_ROUNDS_REACHED" };
  return {
    ok: true,
    state: { ...state, rounds: [...state.rounds, { number: current.number + 1, plays: [], result: null }] },
    events: []
  };
}

/** A variante define quando a mão termina e como empates afetam o resultado. */
export function finishHand(state: HandState, resolveHand: HandResolver): HandResult {
  if (state.status === "finished") return { ok: false, reason: "HAND_FINISHED" };
  if (state.rounds.length === 0 || state.rounds.some((round) => round.result === null)) {
    return { ok: false, reason: "ROUND_NOT_COMPLETE" };
  }
  const resolution = resolveHand(state.rounds, state.players);
  if (
    typeof resolution.finished !== "boolean" ||
    (resolution.winnerTeamId !== null && resolution.winnerTeamId !== "team-a" && resolution.winnerTeamId !== "team-b") ||
    (!resolution.finished && resolution.winnerTeamId !== null)
  ) return { ok: false, reason: "INVALID_HAND_RESULT" };
  if (!resolution.finished) return { ok: false, reason: "ROUND_NOT_COMPLETE" };

  const nextState: HandState = { ...state, status: "finished", winnerTeamId: resolution.winnerTeamId };
  return {
    ok: true, state: nextState,
    events: [createEvent("HAND_FINISHED", state.handId, { winnerTeamId: resolution.winnerTeamId })]
  };
}
