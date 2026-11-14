import { validateBidRules, type BidRules } from "./bidding";
import { validateDeckDefinition, type DeckDefinition } from "./cards";

/**
 * Política contextual: o avaliador recebe a carta vira da mão e calcula
 * a próxima posição segundo rankStrength. Nenhum rank é fixado aqui.
 */
export type ManilhaPolicy =
  | { readonly kind: "disabled" }
  | { readonly kind: "next-rank-after-vira" };

export interface HandResolutionRules {
  readonly kind: "best-of";
  readonly winsRequired: number;
  readonly onExhaustion: "draw" | "most-round-wins";
}

export interface TrucoVariantRules {
  readonly deck: DeckDefinition;
  readonly cardsPerPlayer: number;
  readonly maxRounds: number;
  /** Força inteira e única para cada rank presente no baralho. */
  readonly rankStrength: Readonly<Record<string, number>>;
  /** Força inteira e única para cada naipe presente no baralho. */
  readonly suitStrength: Readonly<Record<string, number>>;
  readonly manilha: ManilhaPolicy;
  readonly handResolution: HandResolutionRules;
  readonly bidding?: BidRules;
}

export type TrucoVariantRulesError =
  | "INVALID_INPUT"
  | "INVALID_PLAYERS_PER_TEAM"
  | "INVALID_DECK"
  | "INVALID_CARDS_PER_PLAYER"
  | "INVALID_MAX_ROUNDS"
  | "NOT_ENOUGH_CARDS"
  | "INVALID_RANK_STRENGTH"
  | "INVALID_SUIT_STRENGTH"
  | "INVALID_MANILHA_POLICY"
  | "INVALID_HAND_RESOLUTION"
  | "INVALID_BIDDING_RULES";

export type TrucoVariantRulesResult =
  | { readonly ok: true; readonly rules: TrucoVariantRules }
  | { readonly ok: false; readonly errors: readonly TrucoVariantRulesError[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateStrengthMap(
  value: unknown,
  ids: readonly string[]
): value is Readonly<Record<string, number>> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== ids.length || ids.some((id) => !Object.hasOwn(value, id))) {
    return false;
  }
  const strengths = ids.map((id) => value[id]);
  return strengths.every((strength) => Number.isSafeInteger(strength)) &&
    new Set(strengths).size === strengths.length;
}

/**
 * Valida o contrato sem selecionar regras regionais.
 * playersPerTeam vem dos metadados da GameVariant.
 */
export function validateTrucoVariantRules(
  input: unknown,
  playersPerTeam: number
): TrucoVariantRulesResult {
  if (!isRecord(input)) return { ok: false, errors: ["INVALID_INPUT"] };

  const errors: TrucoVariantRulesError[] = [];
  if (!Number.isInteger(playersPerTeam) || playersPerTeam < 1 || playersPerTeam > 4) {
    errors.push("INVALID_PLAYERS_PER_TEAM");
  }

  const deckResult = validateDeckDefinition(input.deck);
  if (!deckResult.ok) errors.push("INVALID_DECK");

  const cardsPerPlayer = input.cardsPerPlayer;
  if (!Number.isInteger(cardsPerPlayer) || (cardsPerPlayer as number) < 1) {
    errors.push("INVALID_CARDS_PER_PLAYER");
  }

  const maxRounds = input.maxRounds;
  if (
    !Number.isInteger(maxRounds) ||
    (maxRounds as number) < 1 ||
    (Number.isInteger(cardsPerPlayer) && (maxRounds as number) > (cardsPerPlayer as number))
  ) {
    errors.push("INVALID_MAX_ROUNDS");
  }

  if (
    deckResult.ok &&
    Number.isInteger(cardsPerPlayer) &&
    (cardsPerPlayer as number) > 0 &&
    Number.isInteger(playersPerTeam) &&
    playersPerTeam >= 1 &&
    playersPerTeam <= 4 &&
    deckResult.definition.ranks.length * deckResult.definition.suits.length <
      playersPerTeam * 2 * (cardsPerPlayer as number)
  ) {
    errors.push("NOT_ENOUGH_CARDS");
  }

  const rankIds = deckResult.ok ? deckResult.definition.ranks.map((rank) => rank.id) : [];
  const suitIds = deckResult.ok ? deckResult.definition.suits.map((suit) => suit.id) : [];
  const validRanks = validateStrengthMap(input.rankStrength, rankIds);
  const validSuits = validateStrengthMap(input.suitStrength, suitIds);
  if (!validRanks) errors.push("INVALID_RANK_STRENGTH");
  if (!validSuits) errors.push("INVALID_SUIT_STRENGTH");

  const manilha = input.manilha;
  if (
    !isRecord(manilha) ||
    (manilha.kind !== "disabled" && manilha.kind !== "next-rank-after-vira") ||
    Object.keys(manilha).length !== 1
  ) {
    errors.push("INVALID_MANILHA_POLICY");
  }

  const handResolution = input.handResolution;
  if (
    !isRecord(handResolution) ||
    handResolution.kind !== "best-of" ||
    !Number.isInteger(handResolution.winsRequired) ||
    (handResolution.winsRequired as number) < 1 ||
    (Number.isInteger(maxRounds) && (handResolution.winsRequired as number) > (maxRounds as number)) ||
    (handResolution.onExhaustion !== "draw" && handResolution.onExhaustion !== "most-round-wins") ||
    Object.keys(handResolution).length !== 3
  ) {
    errors.push("INVALID_HAND_RESOLUTION");
  }

  let bidding: BidRules | undefined;
  if (input.bidding !== undefined) {
    const bidResult = validateBidRules(input.bidding);
    if (!bidResult.ok) errors.push("INVALID_BIDDING_RULES");
    else {
      bidding = {
        initialStake: bidResult.rules.initialStake,
        levels: bidResult.rules.levels.map((level) => ({ ...level }))
      };
    }
  }

  if (errors.length > 0 || !deckResult.ok || !validRanks || !validSuits ||
      !isRecord(manilha) || !isRecord(handResolution)) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  const rules: TrucoVariantRules = {
    deck: {
      ranks: deckResult.definition.ranks.map((rank) => ({ ...rank })),
      suits: deckResult.definition.suits.map((suit) => ({ ...suit }))
    },
    cardsPerPlayer: cardsPerPlayer as number,
    maxRounds: maxRounds as number,
    rankStrength: { ...input.rankStrength as Record<string, number> },
    suitStrength: { ...input.suitStrength as Record<string, number> },
    manilha: { kind: manilha.kind as ManilhaPolicy["kind"] },
    handResolution: {
      kind: "best-of",
      winsRequired: handResolution.winsRequired as number,
      onExhaustion: handResolution.onExhaustion as HandResolutionRules["onExhaustion"]
    },
    ...(bidding ? { bidding } : {})
  };

  return { ok: true, rules };
}
