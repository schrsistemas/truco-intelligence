export type StatisticsWinner = "team-a" | "team-b" | null;

export interface StatisticsGame {
  readonly teamAName: string;
  readonly teamBName: string;
  readonly teamAScore: number;
  readonly teamBScore: number;
  readonly finished: boolean;
  readonly winner: StatisticsWinner;
}

export interface TeamStatistics {
  readonly teamName: string;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
  readonly winRate: number;
}

interface MutableStatistics {
  teamName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
}

function normalizeTeamName(name: string): string {
  return name.trim().toLocaleLowerCase("pt-BR");
}

/**
 * Calcula estatísticas exclusivamente com partidas encerradas.
 * Partidas em andamento não distorcem vitórias, derrotas ou aproveitamento.
 * Nomes iguais são tratados como a mesma identidade estatística.
 */
export function calculateTeamStatistics(games: readonly StatisticsGame[]): TeamStatistics[] {
  const totals = new Map<string, MutableStatistics>();

  const getTeam = (name: string): MutableStatistics => {
    const key = normalizeTeamName(name);
    const current = totals.get(key);
    if (current) return current;
    const created: MutableStatistics = { teamName: name.trim(), gamesPlayed: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0 };
    totals.set(key, created);
    return created;
  };

  for (const game of games) {
    if (!game.finished) continue;
    const teamA = getTeam(game.teamAName);
    const teamB = getTeam(game.teamBName);
    teamA.gamesPlayed += 1;
    teamB.gamesPlayed += 1;
    teamA.pointsFor += game.teamAScore;
    teamA.pointsAgainst += game.teamBScore;
    teamB.pointsFor += game.teamBScore;
    teamB.pointsAgainst += game.teamAScore;
    if (game.winner === 'team-a') {
      teamA.wins += 1;
      teamB.losses += 1;
    } else if (game.winner === 'team-b') {
      teamB.wins += 1;
      teamA.losses += 1;
    } else {
      teamA.draws += 1;
      teamB.draws += 1;
    }
  }

  return [...totals.values()]
    .map((team) => ({ ...team, winRate: team.gamesPlayed === 0 ? 0 : (team.wins / team.gamesPlayed) * 100 }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.teamName.localeCompare(b.teamName, "pt-BR"));
}