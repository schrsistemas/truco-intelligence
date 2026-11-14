import Dexie, { type EntityTable } from "dexie";
import { DEFAULT_VARIANT, type GameVariant } from "../domain/variant";
import { createGameStartedEvent, type ScoreEvent, type ScoreState } from "../domain/game";
import { createPlayerRoster, type Player } from "../domain/players";

export type GameStatus = "in-progress" | "finished";

export interface LocalGame {
  id: string;
  teamAName: string;
  teamBName: string;
  players: Player[];
  score: ScoreState;
  variant: GameVariant;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoredGameEvent extends ScoreEvent {
  gameId: string;
  sequence: number;
  schemaVersion: number;
}

interface LocalSetting {
  key: string;
  value: string;
}

class TrucoDatabase extends Dexie {
  games!: EntityTable<LocalGame, "id">;
  events!: EntityTable<StoredGameEvent, "eventId">;
  settings!: EntityTable<LocalSetting, "key">;

  constructor() {
    super("truco-intelligence");

    this.version(1).stores({
      games: "id, updatedAt",
      events: "eventId, gameId, sequence, occurredAt"
    });

    this.version(2)
      .stores({
        games: "id, status, createdAt, updatedAt",
        events: "eventId, gameId, [gameId+sequence], [gameId+occurredAt]",
        settings: "key"
      })
      .upgrade(async (transaction) => {
        const games = transaction.table("games");
        const events = transaction.table("events");
        const now = new Date().toISOString();
        const storedGames = await games.toArray();

        for (const game of storedGames) {
          await games.put({
            ...game,
            variant: game.variant ?? DEFAULT_VARIANT,
            status: game.score?.finished ? "finished" : "in-progress",
            createdAt: game.createdAt ?? game.updatedAt ?? now,
            updatedAt: game.updatedAt ?? now
          });
        }

        const storedEvents = await events.toArray();
        for (const event of storedEvents) {
          await events.put({ ...event, gameId: event.gameId ?? "active", schemaVersion: event.schemaVersion ?? 1 });
        }
      });

    this.version(3)
      .stores({
        games: "id, status, createdAt, updatedAt",
        events: "eventId, gameId, [gameId+sequence], [gameId+occurredAt]",
        settings: "key"
      })
      .upgrade(async (transaction) => {
        const games = transaction.table("games");
        const storedGames = await games.toArray();
        for (const game of storedGames) {
          await games.put({
            ...game,
            players: Array.isArray(game.players)
              ? game.players
              : createPlayerRoster((game.variant ?? DEFAULT_VARIANT).playersPerTeam)
          });
        }
      });
  }
}

export const database = new TrucoDatabase();

export function createLocalGame(input?: {
  teamAName?: string;
  teamBName?: string;
  variant?: GameVariant;
  targetScore?: 12 | 15;
}): LocalGame {
  const now = new Date().toISOString();
  const variant = input?.variant ?? DEFAULT_VARIANT;

  return {
    id: crypto.randomUUID(),
    teamAName: input?.teamAName?.trim() || "Dupla 1",
    teamBName: input?.teamBName?.trim() || "Dupla 2",
    players: createPlayerRoster(variant.playersPerTeam),
    score: {
      teamA: 0,
      teamB: 0,
      targetScore: input?.targetScore ?? variant.targetScore,
      finished: false,
      winner: null
    },
    variant,
    status: "in-progress",
    createdAt: now,
    updatedAt: now
  };
}

/** Recupera a partida ativa; migra o registro legado "active" sem descartar dados. */
export async function getActiveGame(): Promise<LocalGame> {
  return database.transaction("rw", database.games, database.settings, database.events, async () => {
    const setting = await database.settings.get("activeGameId");
    if (setting) {
      const selected = await database.games.get(setting.value);
      if (selected) return selected;
    }

    const legacy = await database.games.get("active");
    const game = legacy
      ? {
          ...legacy,
          variant: legacy.variant ?? DEFAULT_VARIANT,
          players: legacy.players ?? createPlayerRoster((legacy.variant ?? DEFAULT_VARIANT).playersPerTeam),
          status: legacy.score.finished ? "finished" as const : "in-progress" as const,
          createdAt: legacy.createdAt ?? legacy.updatedAt
        }
      : createLocalGame();

    await database.games.put(game);
    await database.settings.put({ key: "activeGameId", value: game.id });

    if (!legacy) {
      await database.events.add({
        ...createGameStartedEvent(game.score),
        gameId: game.id,
        sequence: 1,
        schemaVersion: 1
      });
    }

    return game;
  });
}

/** Cria uma nova partida e a define como ativa sem apagar partidas anteriores. */
export async function createNewGame(
  previous: LocalGame,
  targetScore: 12 | 15 = previous.variant.targetScore
): Promise<LocalGame> {
  const next = createLocalGame({
    teamAName: previous.teamAName,
    teamBName: previous.teamBName,
    variant: { ...previous.variant, targetScore },
    targetScore
  });

  await database.transaction("rw", database.games, database.settings, database.events, async () => {
    await database.games.add(next);
    await database.settings.put({ key: "activeGameId", value: next.id });
    await database.events.add({
      ...createGameStartedEvent(next.score),
      gameId: next.id,
      sequence: 1,
      schemaVersion: 1
    });
  });

  return next;
}

/** Seleciona uma partida já persistida como ativa. */
export async function selectGame(gameId: string): Promise<LocalGame | undefined> {
  return database.transaction("rw", database.games, database.settings, async () => {
    const game = await database.games.get(gameId);
    if (!game) return undefined;
    await database.settings.put({ key: "activeGameId", value: gameId });
    return game;
  });
}

export async function listRecentGames(limit = 20): Promise<LocalGame[]> {
  return database.games.orderBy("updatedAt").reverse().limit(limit).toArray();
}

/** Recupera todas as partidas locais para cálculos estatísticos completos. */
export async function listAllGames(): Promise<LocalGame[]> {
  return database.games.orderBy("updatedAt").reverse().toArray();
}

/** Retorna a linha do tempo imutável de uma partida em ordem de sequência. */
export async function listGameEvents(gameId: string): Promise<StoredGameEvent[]> {
  return database.events
    .where("[gameId+sequence]")
    .between([gameId, Dexie.minKey], [gameId, Dexie.maxKey])
    .toArray();
}

/**
 * Persiste snapshot e eventos atomicamente. A sequência é independente por
 * partida; a chave composta impede duas entradas com a mesma sequência.
 * IDs de evento repetidos são ignorados, tornando a gravação idempotente.
 */
export async function saveGameAndEvents(
  game: LocalGame,
  events: readonly ScoreEvent[]
): Promise<void> {
  await database.transaction("rw", database.games, database.events, async () => {
    const previous = await database.events
      .where("[gameId+sequence]")
      .between([game.id, Dexie.minKey], [game.id, Dexie.maxKey])
      .last();
    let sequence = (previous?.sequence ?? 0) + 1;

    await database.games.put({
      ...game,
      status: game.score.finished ? "finished" : "in-progress"
    });

    for (const event of events) {
      const existing = await database.events.get(event.eventId);
      if (existing) continue;

      await database.events.add({
        ...event,
        gameId: game.id,
        sequence: sequence++,
        schemaVersion: 1
      });
    }
  });
}
