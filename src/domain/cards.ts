/**
 * Cartas são identificadas por rankId e suitId. Este módulo não atribui
 * força, manilha ou precedência: essas regras pertencem ao interpretador
 * versionado da variante.
 */
export interface DeckDefinition {
  readonly ranks: readonly { readonly id: string; readonly label: string }[];
  readonly suits: readonly { readonly id: string; readonly label: string }[];
}

export interface Card {
  readonly cardId: string;
  readonly rankId: string;
  readonly suitId: string;
}

export interface DealtHand {
  readonly playerId: string;
  readonly cards: readonly Card[];
}

export type DeckValidationError =
  | "INVALID_DEFINITION"
  | "EMPTY_RANKS"
  | "EMPTY_SUITS"
  | "DUPLICATE_RANK"
  | "DUPLICATE_SUIT"
  | "INVALID_LABEL";

export type DealError =
  | "INVALID_PLAYERS"
  | "INVALID_CARDS_PER_PLAYER"
  | "DUPLICATE_PLAYER"
  | "DUPLICATE_CARD"
  | "NOT_ENOUGH_CARDS";

const validId = (value: string): boolean => /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value);

/** Valida composição do baralho sem assumir naipes ou ranks regionais. */
export function validateDeckDefinition(input: unknown):
  | { readonly ok: true; readonly definition: DeckDefinition }
  | { readonly ok: false; readonly errors: readonly DeckValidationError[] } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["INVALID_DEFINITION"] };
  }

  const candidate = input as Record<string, unknown>;
  const errors: DeckValidationError[] = [];
  const ranks = candidate.ranks;
  const suits = candidate.suits;

  if (!Array.isArray(ranks)) errors.push("EMPTY_RANKS");
  else if (ranks.length === 0) errors.push("EMPTY_RANKS");
  if (!Array.isArray(suits)) errors.push("EMPTY_SUITS");
  else if (suits.length === 0) errors.push("EMPTY_SUITS");

  if (Array.isArray(ranks)) {
    const ids = ranks.map((rank) => typeof rank === "object" && rank !== null ? (rank as Record<string, unknown>).id : null);
    if (ids.some((id) => typeof id !== "string" || !validId(id)) ||
        ranks.some((rank) => typeof rank !== "object" || rank === null || typeof (rank as Record<string, unknown>).label !== "string" || !(rank as Record<string, unknown>).label)) {
      errors.push("INVALID_LABEL");
    }
    if (new Set(ids).size !== ids.length) errors.push("DUPLICATE_RANK");
  }

  if (Array.isArray(suits)) {
    const ids = suits.map((suit) => typeof suit === "object" && suit !== null ? (suit as Record<string, unknown>).id : null);
    if (ids.some((id) => typeof id !== "string" || !validId(id)) ||
        suits.some((suit) => typeof suit !== "object" || suit === null || typeof (suit as Record<string, unknown>).label !== "string" || !(suit as Record<string, unknown>).label)) {
      errors.push("INVALID_LABEL");
    }
    if (new Set(ids).size !== ids.length) errors.push("DUPLICATE_SUIT");
  }

  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  return {
    ok: true,
    definition: {
      ranks: ranks as DeckDefinition["ranks"],
      suits: suits as DeckDefinition["suits"]
    }
  };
}

/** Gera o produto cartesiano ranks × suits; não embaralha nem ordena por força. */
export function createDeck(definition: DeckDefinition): Card[] {
  const validation = validateDeckDefinition(definition);
  if (!validation.ok) throw new TypeError("Definição de baralho inválida.");
  return validation.definition.ranks.flatMap((rank) =>
    validation.definition.suits.map((suit) => ({
      cardId: `${rank.id}:${suit.id}`,
      rankId: rank.id,
      suitId: suit.id
    }))
  );
}

/**
 * Distribui cartas da ordem recebida. A ordem de entrada deve ser a ordem
 * de distribuição definida pela variante/embaralhador; nenhuma regra é inferida.
 */
export function dealCards(
  orderedDeck: readonly Card[],
  playerIds: readonly string[],
  cardsPerPlayer: number
): { readonly ok: true; readonly hands: readonly DealtHand[]; readonly remaining: readonly Card[] }
  | { readonly ok: false; readonly reason: DealError } {
  if (playerIds.length === 0 || playerIds.some((id) => !id.trim())) {
    return { ok: false, reason: "INVALID_PLAYERS" };
  }
  if (new Set(playerIds).size !== playerIds.length) return { ok: false, reason: "DUPLICATE_PLAYER" };
  if (!Number.isInteger(cardsPerPlayer) || cardsPerPlayer < 1) {
    return { ok: false, reason: "INVALID_CARDS_PER_PLAYER" };
  }
  const cardIds = orderedDeck.map((card) => card.cardId);
  if (new Set(cardIds).size !== cardIds.length) return { ok: false, reason: "DUPLICATE_CARD" };
  if (orderedDeck.length < playerIds.length * cardsPerPlayer) {
    return { ok: false, reason: "NOT_ENOUGH_CARDS" };
  }

  const hands = playerIds.map((playerId) => ({ playerId, cards: [] as Card[] }));
  let cursor = 0;
  for (let cardIndex = 0; cardIndex < cardsPerPlayer; cardIndex += 1) {
    for (const hand of hands) hand.cards.push(orderedDeck[cursor++]);
  }

  return { ok: true, hands, remaining: orderedDeck.slice(cursor) };
}
