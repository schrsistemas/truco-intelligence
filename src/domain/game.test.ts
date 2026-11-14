import { describe, expect, it } from "vitest";
import { initialScore, reduceScore } from "./game";

describe("reduceScore", () => {
  it("starts with a zero score and selected target", () => {
    expect(initialScore(15)).toMatchObject({ teamA: 0, teamB: 0, targetScore: 15, finished: false, winner: null });
  });

  it("does not allow negative score", () => {
    const result = reduceScore(initialScore(), { type: "REMOVE_POINT", teamId: "team-a" });
    expect(result).toMatchObject({ ok: false, reason: "SCORE_AT_ZERO" });
  });

  it("increments the selected team only", () => {
    const result = reduceScore(initialScore(), { type: "ADD_POINT", teamId: "team-b" });
    expect(result.ok && result.state).toMatchObject({ teamA: 0, teamB: 1, finished: false });
  });

  it("finishes at target and identifies winner", () => {
    let state = initialScore(12);
    for (let index = 0; index < 11; index += 1) {
      const result = reduceScore(state, { type: "ADD_POINT", teamId: "team-a" });
      if (result.ok) state = result.state;
    }
    const finalResult = reduceScore(state, { type: "ADD_POINT", teamId: "team-a" });
    expect(finalResult.ok && finalResult.state).toMatchObject({ teamA: 12, finished: true, winner: "team-a" });
    expect(finalResult.ok && finalResult.events.map((event) => event.type)).toEqual(["SCORE_UPDATED", "GAME_FINISHED"]);
  });

  it("rejects score changes after match completion", () => {
    const finished = { ...initialScore(), teamA: 12, finished: true, winner: "team-a" as const };
    expect(reduceScore(finished, { type: "ADD_POINT", teamId: "team-b" })).toMatchObject({ ok: false, reason: "GAME_FINISHED" });
  });

  it("resets score and can change target", () => {
    const result = reduceScore({ ...initialScore(), teamA: 7 }, { type: "RESET", targetScore: 15 });
    expect(result.ok && result.state).toMatchObject({ teamA: 0, teamB: 0, targetScore: 15, finished: false });
  });
});
