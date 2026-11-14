export type TeamId = "team-a" | "team-b";

export interface ScoreState {
  readonly teamA: number;
  readonly teamB: number;
  readonly targetScore: 12 | 15;
  readonly finished: boolean;
  readonly winner: TeamId | null;
}

export type ScoreCommand =
  | { readonly type: "ADD_POINT"; readonly teamId: TeamId }
  | { readonly type: "REMOVE_POINT"; readonly teamId: TeamId }
  | { readonly type: "RESET"; readonly targetScore?: 12 | 15 };

export type ScoreEventType = "GAME_STARTED" | "SCORE_UPDATED" | "GAME_FINISHED" | "GAME_RESET";

export interface ScoreEvent {
  readonly eventId: string;
  readonly type: ScoreEventType;
  readonly teamId?: TeamId;
  readonly score: ScoreState;
  readonly occurredAt: string;
}

export type ScoreResult =
  | { readonly ok: true; readonly state: ScoreState; readonly events: readonly ScoreEvent[] }
  | { readonly ok: false; readonly reason: "GAME_FINISHED" | "SCORE_AT_ZERO" | "SCORE_AT_TARGET" };

export const initialScore = (targetScore: 12 | 15 = 12): ScoreState => ({
  teamA: 0,
  teamB: 0,
  targetScore,
  finished: false,
  winner: null
});

function createEvent(type: ScoreEventType, score: ScoreState, teamId?: TeamId): ScoreEvent {
  return {
    eventId: crypto.randomUUID(),
    type,
    ...(teamId ? { teamId } : {}),
    score,
    occurredAt: new Date().toISOString()
  };
}

/** Cria o evento inicial da partida para manter seu ciclo de vida auditável. */
export function createGameStartedEvent(score: ScoreState): ScoreEvent {
  return createEvent("GAME_STARTED", score);
}

export function reduceScore(state: ScoreState, command: ScoreCommand): ScoreResult {
  if (command.type === "RESET") {
    const reset = initialScore(command.targetScore ?? state.targetScore);
    return { ok: true, state: reset, events: [createEvent("GAME_RESET", reset)] };
  }

  if (state.finished) return { ok: false, reason: "GAME_FINISHED" };

  const current = command.teamId === "team-a" ? state.teamA : state.teamB;

  if (command.type === "REMOVE_POINT" && current === 0) {
    return { ok: false, reason: "SCORE_AT_ZERO" };
  }

  if (command.type === "ADD_POINT" && current >= state.targetScore) {
    return { ok: false, reason: "SCORE_AT_TARGET" };
  }

  const nextValue = current + (command.type === "ADD_POINT" ? 1 : -1);
  const next: ScoreState = {
    ...state,
    [command.teamId === "team-a" ? "teamA" : "teamB"]: nextValue,
    finished: nextValue >= state.targetScore,
    winner: nextValue >= state.targetScore ? command.teamId : null
  };

  const events = [createEvent("SCORE_UPDATED", next, command.teamId)];
  if (next.finished) events.push(createEvent("GAME_FINISHED", next, command.teamId));

  return { ok: true, state: next, events };
}
