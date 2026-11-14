import Dexie, { type EntityTable } from "dexie";
import type { ScoreEvent, ScoreState } from "../domain/game";

export interface LocalGame {
  id: "active";
  teamAName: string;
  teamBName: string;
  score: ScoreState;
  updatedAt: string;
}

export interface StoredGameEvent extends ScoreEvent {
  gameId: "active";
  sequence: number;
}

class TrucoDatabase extends Dexie {
  games!: EntityTable<LocalGame, "id">;
  events!: EntityTable<StoredGameEvent, "eventId">;

  constructor() {
    super("truco-intelligence");
    this.version(1).stores({
      games: "id, updatedAt",
      events: "eventId, gameId, sequence, occurredAt"
    });
  }
}

export const database = new TrucoDatabase();

export async function saveGameAndEvents(
  game: LocalGame,
  events: readonly ScoreEvent[]
): Promise<void> {
  await database.transaction("rw", database.games, database.events, async () => {
    const previous = await database.events.where("gameId").equals("active").last();
    let sequence = (previous?.sequence ?? 0) + 1;

    await database.games.put(game);
    for (const event of events) {
      await database.events.put({
        ...event,
        gameId: "active",
        sequence: sequence++
      });
    }
  });
}
