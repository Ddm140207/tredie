import { runMigrations } from "../src/lib/migrate.ts";

runMigrations()
  .then((applied) => {
    if (applied.length === 0) {
      console.log("Database is already up to date.");
      return;
    }
    console.log(`Applied ${applied.length} migration(s):`);
    for (const file of applied) console.log(`  ${file}`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });