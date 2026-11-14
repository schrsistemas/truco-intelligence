import type { TeamId } from "./game";

export interface Player {
  readonly playerId: string;
  readonly teamId: TeamId;
  readonly seat: number;
  readonly name: string;
}

export type PlayerRosterError = "INVALID_PLAYERS_PER_TEAM" | "INVALID_ROSTER" | "DUPLICATE_PLAYER" | "INVALID_PLAYER_NAME";

/** Cria assentos estáveis dentro da partida; nomes podem ser preenchidos depois. */
export function createPlayerRoster(playersPerTeam: number): Player[] {
  if (!Number.isInteger(playersPerTeam) || playersPerTeam < 1 || playersPerTeam > 4) {
    throw new RangeError("playersPerTeam deve estar entre 1 e 4.");
  }

  return (["team-a", "team-b"] as const).flatMap((teamId) =>
    Array.from({ length: playersPerTeam }, (_, index) => ({
      playerId: crypto.randomUUID(),
      teamId,
      seat: index + 1,
      name: ""
    }))
  );
}

/** Valida roster completo sem impor nomes ou posições específicas de uma variante. */
export function validatePlayerRoster(
  players: readonly Player[],
  playersPerTeam: number
): { readonly ok: true } | { readonly ok: false; readonly errors: readonly PlayerRosterError[] } {
  if (!Number.isInteger(playersPerTeam) || playersPerTeam < 1 || playersPerTeam > 4) {
    return { ok: false, errors: ["INVALID_PLAYERS_PER_TEAM"] };
  }

  const errors: PlayerRosterError[] = [];
  if (players.length !== playersPerTeam * 2) errors.push("INVALID_ROSTER");

  const ids = players.map((player) => player.playerId);
  if (new Set(ids).size !== ids.length) errors.push("DUPLICATE_PLAYER");

  for (const teamId of ["team-a", "team-b"] as const) {
    const teamPlayers = players.filter((player) => player.teamId === teamId);
    if (teamPlayers.length !== playersPerTeam) errors.push("INVALID_ROSTER");
    const seats = teamPlayers.map((player) => player.seat);
    if (new Set(seats).size !== seats.length || seats.some((seat) => !Number.isInteger(seat) || seat < 1 || seat > playersPerTeam)) {
      errors.push("INVALID_ROSTER");
    }
  }

  if (players.some((player) =>
    typeof player.name !== "string" ||
    player.name.trim().length > 40
  )) {
    errors.push("INVALID_PLAYER_NAME");
  }

  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true };
}
