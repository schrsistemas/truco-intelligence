import { describe, expect, it } from "vitest";
import { calculateTeamStatistics, type StatisticsGame } from "./statistics";

describe("calculateTeamStatistics", () => {
  it("aggregates wins, losses and points for completed matches", () => {
    const games: StatisticsGame[] = [
      { teamAName: "Águias", teamBName: "Feras", teamAScore: 12, teamBScore: 8, finished: true, winner: "team-a" },
      { teamAName: "Feras", teamBName: "Águias", teamAScore: 9, teamBScore: 12, finished: true, winner: "team-b" },
      { teamAName: "Águias", teamBName: "Feras", teamAScore: 5, teamBScore: 3, finished: false, winner: null }
    ];
    const result = calculateTeamStatistics(games);
    expect(result.find((team) => team.teamName === "Águias")).toMatchObject({ gamesPlayed: 2, wins: 2, losses: 0, pointsFor: 24, pointsAgainst: 17, winRate: 100 });
    expect(result.find((team) => team.teamName === "Feras")).toMatchObject({ gamesPlayed: 2, wins: 0, losses: 2, pointsFor: 17, pointsAgainst: 24, winRate: 0 });
  });

  it("does not count unfinished matches", () => {
    const result = calculateTeamStatistics([{ teamAName: "A", teamBName: "B", teamAScore: 7, teamBScore: 4, finished: false, winner: null }]);
    expect(result).toEqual([]);
  });

  it("groups team names without case or surrounding-space differences", () => {
    const result = calculateTeamStatistics([
      { teamAName: " Águias ", teamBName: "Feras", teamAScore: 12, teamBScore: 4, finished: true, winner: "team-a" },
      { teamAName: "áGUIAS", teamBName: "Feras", teamAScore: 12, teamBScore: 2, finished: true, winner: "team-a" }
    ]);
    expect(result.find((team) => team.teamName === "Águias")).toMatchObject({ gamesPlayed: 2, wins: 2 });
  });
});