import type { TeamId } from "./game";

export interface BidLevel {
  readonly id: string;
  readonly label: string;
  readonly stake: number;
  readonly refusalAward: number;
}
export interface BidRules {
  readonly initialStake: number;
  readonly levels: readonly BidLevel[];
}
export interface PendingBid {
  readonly levelId: string;
  readonly requestingTeam: TeamId;
}
export interface BidState {
  readonly rules: BidRules;
  readonly currentLevelIndex: number;
  readonly currentStake: number;
  readonly pending: PendingBid | null;
  readonly status: "open" | "settled";
  readonly awardedTeam: TeamId | null;
  readonly awardedPoints: number;
}
export type BidEventType = "BID_REQUESTED" | "BID_ACCEPTED" | "BID_DECLINED";
export interface BidEvent {
  readonly eventId: string;
  readonly type: BidEventType;
  readonly requestingTeam: TeamId;
  readonly respondingTeam?: TeamId;
  readonly levelId: string;
  readonly stake: number;
  readonly awardedTeam?: TeamId;
  readonly awardedPoints?: number;
  readonly occurredAt: string;
}
export type BidError =
  | "INVALID_RULES" | "BID_SETTLED" | "BID_ALREADY_PENDING" | "NO_PENDING_BID"
  | "INVALID_LEVEL" | "LEVEL_NOT_NEXT" | "SAME_TEAM_CANNOT_RESPOND";
export type BidResult =
  | { readonly ok: true; readonly state: BidState; readonly events: readonly BidEvent[] }
  | { readonly ok: false; readonly reason: BidError };
export type BidRulesValidation =
  | { readonly ok: true; readonly rules: BidRules }
  | { readonly ok: false; readonly reason: "INVALID_RULES" };

/** Valida escada crescente sem impor níveis ou valores regionais. */
export function validateBidRules(input: unknown): BidRulesValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, reason: "INVALID_RULES" };
  }
  const candidate = input as Record<string, unknown>;
  if (
    !Number.isInteger(candidate.initialStake) ||
    (candidate.initialStake as number) < 1 ||
    !Array.isArray(candidate.levels) ||
    candidate.levels.length === 0
  ) return { ok: false, reason: "INVALID_RULES" };

  const levels = candidate.levels as unknown[];
  const ids = levels.map((item) =>
    typeof item === "object" && item !== null ? (item as Record<string, unknown>).id : null
  );
  if (new Set(ids).size !== ids.length) return { ok: false, reason: "INVALID_RULES" };

  let previousStake = candidate.initialStake as number;
  for (const item of levels) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { ok: false, reason: "INVALID_RULES" };
    }
    const level = item as Record<string, unknown>;
    if (
      typeof level.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(level.id) ||
      typeof level.label !== "string" || !level.label.trim() ||
      !Number.isInteger(level.stake) || (level.stake as number) <= previousStake ||
      !Number.isInteger(level.refusalAward) || (level.refusalAward as number) < 1 ||
      (level.refusalAward as number) > previousStake
    ) return { ok: false, reason: "INVALID_RULES" };
    previousStake = level.stake as number;
  }
  return {
    ok: true,
    rules: { initialStake: candidate.initialStake as number, levels: levels as BidLevel[] }
  };
}

function createEvent(
  type: BidEventType,
  pending: PendingBid,
  details: Omit<BidEvent, "eventId" | "type" | "requestingTeam" | "levelId" | "occurredAt">
): BidEvent {
  return {
    eventId: crypto.randomUUID(), type, requestingTeam: pending.requestingTeam,
    levelId: pending.levelId, ...details, occurredAt: new Date().toISOString()
  };
}

export function createBidState(input: unknown): BidResult {
  const validation = validateBidRules(input);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  return {
    ok: true,
    state: {
      rules: validation.rules, currentLevelIndex: -1,
      currentStake: validation.rules.initialStake, pending: null,
      status: "open", awardedTeam: null, awardedPoints: 0
    },
    events: []
  };
}

/** Solicita somente o próximo nível da escada configurada. */
export function requestBid(state: BidState, requestingTeam: TeamId, levelId: string): BidResult {
  if (state.status === "settled") return { ok: false, reason: "BID_SETTLED" };
  if (state.pending) return { ok: false, reason: "BID_ALREADY_PENDING" };
  const levelIndex = state.rules.levels.findIndex((level) => level.id === levelId);
  if (levelIndex < 0) return { ok: false, reason: "INVALID_LEVEL" };
  if (levelIndex !== state.currentLevelIndex + 1) return { ok: false, reason: "LEVEL_NOT_NEXT" };
  const pending: PendingBid = { levelId, requestingTeam };
  const level = state.rules.levels[levelIndex];
  return {
    ok: true,
    state: { ...state, pending },
    events: [createEvent("BID_REQUESTED", pending, { stake: level.stake })]
  };
}

export function acceptBid(state: BidState, respondingTeam: TeamId): BidResult {
  if (state.status === "settled") return { ok: false, reason: "BID_SETTLED" };
  if (!state.pending) return { ok: false, reason: "NO_PENDING_BID" };
  if (respondingTeam === state.pending.requestingTeam) {
    return { ok: false, reason: "SAME_TEAM_CANNOT_RESPOND" };
  }
  const levelIndex = state.rules.levels.findIndex((level) => level.id === state.pending!.levelId);
  const level = state.rules.levels[levelIndex];
  if (!level || levelIndex !== state.currentLevelIndex + 1) {
    return { ok: false, reason: "INVALID_LEVEL" };
  }
  const nextState: BidState = {
    ...state, currentLevelIndex: levelIndex, currentStake: level.stake, pending: null
  };
  return {
    ok: true, state: nextState,
    events: [createEvent("BID_ACCEPTED", state.pending, { respondingTeam, stake: level.stake })]
  };
}

export function declineBid(state: BidState, respondingTeam: TeamId): BidResult {
  if (state.status === "settled") return { ok: false, reason: "BID_SETTLED" };
  if (!state.pending) return { ok: false, reason: "NO_PENDING_BID" };
  if (respondingTeam === state.pending.requestingTeam) {
    return { ok: false, reason: "SAME_TEAM_CANNOT_RESPOND" };
  }
  const level = state.rules.levels.find((item) => item.id === state.pending!.levelId);
  if (!level || state.rules.levels.indexOf(level) !== state.currentLevelIndex + 1) {
    return { ok: false, reason: "INVALID_LEVEL" };
  }
  const nextState: BidState = {
    ...state, pending: null, status: "settled",
    awardedTeam: state.pending.requestingTeam, awardedPoints: level.refusalAward
  };
  return {
    ok: true, state: nextState,
    events: [createEvent("BID_DECLINED", state.pending, {
      respondingTeam, stake: level.stake,
      awardedTeam: state.pending.requestingTeam, awardedPoints: level.refusalAward
    })]
  };
}
