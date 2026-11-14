import { describe, expect, it } from "vitest";
import { createPlayerRoster, validatePlayerRoster } from "./players";

describe("player roster", () => {
  it("creates the configured number of player seats for both teams", () => {
    const roster = createPlayerRoster(2);
    expect(roster).toHaveLength(4);
    expect(roster.filter((player) => player.teamId === "team-a")).toHaveLength(2);
    expect(roster.filter((player) => player.teamId === "team-b")).toHaveLength(2);
    expect(validatePlayerRoster(roster, 2)).toEqual({ ok: true });
  });

  it("supports configurable team sizes from one to four", () => {
    for (let count = 1; count <= 4; count += 1) {
      expect(createPlayerRoster(count)).toHaveLength(count * 2);
    }
  });

  it("rejects invalid team sizes", () => {
    expect(() => createPlayerRoster(0)).toThrow(RangeError);
    expect(validatePlayerRoster([], 5)).toMatchObject({ ok: false, errors: ["INVALID_PLAYERS_PER_TEAM"] });
  });

  it("rejects duplicate ids and incomplete rosters", () => {
    const roster = createPlayerRoster(2);
    const invalid = [{ ...roster[0], playerId: "duplicate" }, { ...roster[1], playerId: "duplicate" }];
    expect(validatePlayerRoster(invalid, 2).ok).toBe(false);
  });

  it("rejects names longer than forty characters", () => {
    const roster = createPlayerRoster(2).map((player, index) =>
      index === 0 ? { ...player, name: "x".repeat(41) } : player
    );
    expect(validatePlayerRoster(roster, 2)).toMatchObject({ ok: false, errors: ["INVALID_PLAYER_NAME"] });
  });
});
