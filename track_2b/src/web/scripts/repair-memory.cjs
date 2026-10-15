// Operational entry point uses the installed TypeScript compiler, not the test loader.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = (module, file) => {
  if (!file.startsWith(`${root}${path.sep}`))
    throw new Error("Unexpected TypeScript module");
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(source, file);
};
const { Pool } = require("pg");
const repository = require("../src/lib/repair-memory/postgres.ts");
const {
  fingerprint,
} = require("../src/simulations/creation-and-editing/memory/context.ts");

async function main() {
  const [command, id, scope, argument, confirmation] = process.argv.slice(2);
  if (command !== "migrate") {
    const credential =
      command === "process"
        ? "REPAIR_MEMORY_WORKER_DATABASE_URL"
        : "REPAIR_MEMORY_ADMIN_DATABASE_URL";
    if (!process.env[credential])
      throw new Error(`Set ${credential} for this privileged operation`);
    process.env.REPAIR_MEMORY_DATABASE_URL = process.env[credential];
    globalThis.repairMemoryPool = {
      url: process.env[credential],
      pool: new Pool({
        connectionString: process.env[credential],
        max: 1,
        connectionTimeoutMillis: 2000,
        statement_timeout: 1000,
        query_timeout: 1250,
        lock_timeout: 500,
        idle_in_transaction_session_timeout: 2000,
        application_name: "apertus-repair-memory-operations",
      }),
    };
    globalThis.repairMemoryPool.pool.on("error", () =>
      console.warn("repair_memory: operations_connection_failure"),
    );
  }
  if (command === "migrate") {
    const url = process.env.REPAIR_MEMORY_MIGRATION_DATABASE_URL;
    if (!url)
      throw new Error(
        "Set the privileged REPAIR_MEMORY_MIGRATION_DATABASE_URL",
      );
    const pool = new Pool({
      connectionString: url,
      max: 1,
      connectionTimeoutMillis: 2000,
      statement_timeout: 10000,
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(338193)");
      const exists = await client.query(
        "SELECT to_regclass('composer_repair_episodes') AS name",
      );
      if (!exists.rows[0].name)
        await client.query(
          fs.readFileSync(
            path.join(root, "migrations/repair-memory/001-repair-memory.sql"),
            "utf8",
          ),
        );
      await client.query(
        fs.readFileSync(
          path.join(
            root,
            "migrations/repair-memory/002-shared-review-metadata.sql",
          ),
          "utf8",
        ),
      );
      const version = await client.query(
        "SELECT atttypmod FROM pg_attribute WHERE attrelid = 'composer_repair_lessons'::regclass AND attname = 'embedding'",
      );
      if (version.rows[0]?.atttypmod !== 384)
        throw new Error(
          "Unexpected repair memory schema; inspect migrations before proceeding",
        );
      await client.query("COMMIT");
      console.log("Repair memory schema is ready (384 dimensions).");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
    return;
  }
  if (command === "process")
    console.log(
      await require("../src/lib/repair-memory/extraction.ts").processMemoryBatch(),
    );
  else if (command === "list")
    console.log(JSON.stringify(await repository.listLessons(id), null, 2));
  else if (command === "inspect") {
    const lesson = await repository.inspectLesson(id, scope);
    console.log(
      JSON.stringify(
        {
          ...lesson,
          content_digest: fingerprint({
            key: lesson.lesson_key,
            guidance: lesson.guidance,
            proof: lesson.proof,
          }),
        },
        null,
        2,
      ),
    );
  } else if (command === "share") {
    if (confirmation !== "reviewed-sanitized")
      throw new Error(
        "Review inspect output first; provide reviewer, digest, and reviewed-sanitized confirmation",
      );
    await repository.shareLesson(
      id,
      scope,
      process.env.REPAIR_MEMORY_REVIEWER,
      argument,
    );
  } else if (command === "retire")
    await repository.retireLesson(id, scope, argument);
  else if (command === "prevent") {
    if (argument !== "held-out-evaluation-passed")
      throw new Error(
        "Preventive enablement requires held-out evaluation evidence",
      );
    await repository.enablePreventive(id, scope);
  } else if (command === "cleanup") await repository.cleanupMemory();
  else if (command === "purge") {
    if (scope !== "delete-private-memory")
      throw new Error("Use purge account:<id> delete-private-memory");
    await repository.cleanupMemory(id);
  } else
    throw new Error(
      "Commands: migrate | process | list <scope> | inspect <id> <scope> | share <id> <scope> <digest> reviewed-sanitized | retire <id> <scope> <reason> | prevent <id> <scope> held-out-evaluation-passed | cleanup | purge <scope> delete-private-memory",
    );
}
main()
  .catch((error) => {
    console.error(
      error.message.startsWith("Commands:") || error.message.startsWith("Set ")
        ? error.message
        : `Repair memory command failed${/^[A-Z0-9]{5}$/.test(error.code ?? "") ? ` (${error.code})` : ""}. Check configuration, authorization, and bounded operation requirements.`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (globalThis.repairMemoryPool)
      await globalThis.repairMemoryPool.pool.end();
  });
