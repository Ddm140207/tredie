import "server-only";
import { SqliteRepository } from "./sqlite-repository";
import type { TredieRepository } from "./repository";

/**
 * Persistence service.
 *
 * One embedded SQLite database per instance (`data/tredie.db` by default). The
 * rest of the app only ever sees the `TredieRepository` interface.
 */

export const persistenceMode = "sqlite";

let repository: TredieRepository | null = null;

export function getRepository(): TredieRepository {
  repository ??= new SqliteRepository();
  return repository;
}

export type { TredieRepository, CreateTredieInput, UpdateTredieInput } from "./repository";