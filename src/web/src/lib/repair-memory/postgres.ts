import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  fingerprint,
  GUIDANCE,
  type VerifiedCorrection,
} from "../../simulations/creation-and-editing/memory/context";
import type {
  RepairEpisode,
  RepairLesson,
} from "../../simulations/creation-and-editing/memory/contracts";
import { accountScope, embeddingConfig } from "./config";
import { validateVector } from "./embeddings";

declare global {
  var repairMemoryPool: { url: string; pool: Pool } | undefined;
}
export function memoryPool(): Pool {
  const url = process.env.REPAIR_MEMORY_DATABASE_URL?.trim();
  if (!url || !/^postgres(?:ql)?:\/\//.test(url))
    throw new Error("Repair memory database is not configured");
  if (globalThis.repairMemoryPool && globalThis.repairMemoryPool.url !== url)
    throw new Error("Restart before changing the repair memory database");
  if (!globalThis.repairMemoryPool) {
    const pool = new Pool({
      connectionString: url,
      max: 2,
      connectionTimeoutMillis: 100,
      idleTimeoutMillis: 10000,
      statement_timeout: 100,
      query_timeout: 150,
      lock_timeout: 50,
      idle_in_transaction_session_timeout: 2000,
      application_name: "apertus-repair-memory",
    });
    pool.on("error", () =>
      console.warn("repair_memory: idle_connection_failure"),
    );
    globalThis.repairMemoryPool = { url, pool };
  }
  return globalThis.repairMemoryPool.pool;
}

export async function withMemoryClient<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await memoryPool().connect();
  let failed = false;
  try {
    return await work(client);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    client.release(failed);
  }
}

export async function saveEpisodes(episodes: RepairEpisode[]): Promise<void> {
  if (!episodes.length) return;
  if (episodes.length > 8) throw new Error("Episode batch exceeds bounds");
  for (const episode of episodes) {
    accountScope(episode.scope);
    if (Buffer.byteLength(JSON.stringify(episode)) > 24576)
      throw new Error("Episode exceeds bounds");
  }
  await withMemoryClient((client) =>
    client
      .query(
        `INSERT INTO composer_repair_episodes (id, occurrence, scope_key, stage, contract_key, evidence, outcome)
     SELECT (x->>'id')::uuid, (x->>'occurrence')::uuid, x->>'scope', x->>'stage', x->>'contract', x, x->>'outcome'
     FROM jsonb_array_elements($1::jsonb) x ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(episodes)],
      )
      .then(() => undefined),
  );
}

export async function lookupLessons(
  scope: string | null,
  stage: string,
  contract: string,
  family: string | null,
  vector: number[],
  preventive: boolean,
): Promise<RepairLesson[]> {
  if (scope) accountScope(scope);
  validateVector(vector);
  const version = embeddingConfig().version;
  const result = await withMemoryClient((client) =>
    client.query(
      `SELECT id, lesson_key AS key, scope_key AS scope, stage, contract_key AS contract, family, kind, guidance, revision
     FROM composer_repair_lessons
     WHERE (scope_key = $1 OR scope_key = 'shared') AND status = 'active' AND stage = $2
       AND contract_key = $3 AND ($4::text IS NULL OR family = $4) AND (NOT $5 OR preventive)
       AND embedding_version = $6 AND embedding <=> $7::vector <= 0.45
     ORDER BY embedding <=> $7::vector, scope_key = 'shared', id LIMIT 8`,
      [
        scope,
        stage,
        contract,
        family,
        preventive,
        version,
        JSON.stringify(vector),
      ],
    ),
  );
  const unique = new Map<string, RepairLesson>();
  for (const row of result.rows as RepairLesson[]) {
    // Only application-rendered verified guidance is eligible; stored prose is untrusted.
    if (row.guidance !== GUIDANCE[row.kind] || unique.has(row.key)) continue;
    unique.set(row.key, row);
    if (unique.size === 2) break;
  }
  return [...unique.values()];
}

export async function pendingEpisodes(): Promise<RepairEpisode[]> {
  const result = await withMemoryClient((client) =>
    client.query(
      "SELECT evidence FROM composer_repair_episodes WHERE processing = 'pending' AND processing_failures < 3 AND expires_at > now() ORDER BY created_at, id LIMIT 20",
    ),
  );
  return result.rows.map((row) => row.evidence as RepairEpisode);
}

export async function commitCorrections(
  episode: RepairEpisode,
  corrections: { verified: VerifiedCorrection; vector: number[] }[],
): Promise<boolean> {
  accountScope(episode.scope);
  const version = embeddingConfig().version;
  return withMemoryClient(async (client) => {
    await client.query("BEGIN");
    try {
      const locked = await client.query(
        "SELECT processing FROM composer_repair_episodes WHERE id = $1 AND scope_key = $2 AND expires_at > now() FOR UPDATE",
        [episode.id, episode.scope],
      );
      if (locked.rows[0]?.processing !== "pending") {
        await client.query("ROLLBACK");
        return false;
      }
      const ids: string[] = [];
      for (const { verified, vector } of corrections) {
        validateVector(vector);
        const inserted = await client.query(
          `INSERT INTO composer_repair_lessons (id, scope_key, lesson_key, stage, contract_key, family, kind, guidance, proof, embedding, embedding_version)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector,$11)
           ON CONFLICT (scope_key, lesson_key) DO UPDATE SET updated_at = now()
           WHERE composer_repair_lessons.status <> 'retired' AND composer_repair_lessons.embedding_version = EXCLUDED.embedding_version
           RETURNING id`,
          [
            randomUUID(),
            episode.scope,
            verified.key,
            episode.stage,
            episode.contract,
            verified.family,
            verified.kind,
            GUIDANCE[verified.kind],
            verified.proof,
            JSON.stringify(vector),
            version,
          ],
        );
        if (inserted.rows[0]) ids.push(inserted.rows[0].id);
      }
      await client.query(
        "UPDATE composer_repair_episodes SET processing = $3, lesson_ids = $4 WHERE id = $1 AND scope_key = $2",
        [
          episode.id,
          episode.scope,
          corrections.length ? "processed" : "skipped",
          ids,
        ],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function processingFailed(
  id: string,
  scope: string,
): Promise<void> {
  accountScope(scope);
  await withMemoryClient((client) =>
    client
      .query(
        "UPDATE composer_repair_episodes SET processing_failures = LEAST(3, processing_failures + 1), processing = CASE WHEN processing_failures >= 2 THEN 'skipped' ELSE processing END WHERE id = $1 AND scope_key = $2 AND processing = 'pending'",
        [id, scope],
      )
      .then(() => undefined),
  );
}

export async function inspectLesson(id: string, scope: string) {
  if (scope !== "shared") accountScope(scope);
  const result = await withMemoryClient((client) =>
    client.query(
      "SELECT id, scope_key, lesson_key, stage, contract_key, kind, guidance, proof, status, preventive, revision, reviewer, reviewed_at FROM composer_repair_lessons WHERE id = $1 AND scope_key = $2",
      [id, scope],
    ),
  );
  if (!result.rows[0]) throw new Error("Lesson unavailable");
  return result.rows[0];
}

export async function listLessons(scope: string) {
  if (scope !== "shared") accountScope(scope);
  const result = await withMemoryClient((client) =>
    client.query(
      "SELECT id, stage, kind, status, preventive, updated_at FROM composer_repair_lessons WHERE scope_key = $1 ORDER BY updated_at DESC, id LIMIT 50",
      [scope],
    ),
  );
  return result.rows;
}

export async function shareLesson(
  id: string,
  scope: string,
  reviewer: string,
  digest: string,
): Promise<void> {
  accountScope(scope);
  if (!reviewer || reviewer.length > 100)
    throw new Error("Provide a reviewer identity");
  const lesson = await inspectLesson(id, scope);
  if (
    lesson.status !== "active" ||
    lesson.guidance !== GUIDANCE[lesson.kind as keyof typeof GUIDANCE]
  )
    throw new Error("Only verified active lessons can be shared");
  const expected = fingerprint({
    key: lesson.lesson_key,
    guidance: lesson.guidance,
    proof: lesson.proof,
  });
  if (digest !== expected)
    throw new Error(`Review this sanitized content digest first: ${expected}`);
  await withMemoryClient((client) =>
    client
      .query(
        `INSERT INTO composer_repair_lessons (id,scope_key,lesson_key,stage,contract_key,family,kind,guidance,proof,embedding,embedding_version,reviewer,reviewed_at,reviewed_digest)
     SELECT $3,'shared',lesson_key,stage,contract_key,family,kind,guidance,proof,embedding,embedding_version,$4,now(),$5
     FROM composer_repair_lessons WHERE id = $1 AND scope_key = $2 AND status = 'active'
     ON CONFLICT (scope_key,lesson_key) DO NOTHING`,
        [id, scope, randomUUID(), reviewer, expected],
      )
      .then(() => undefined),
  );
}

export async function retireLesson(
  id: string,
  scope: string,
  reason: string,
): Promise<void> {
  if (scope !== "shared") accountScope(scope);
  if (!reason || reason.length > 200)
    throw new Error("Provide a bounded retirement reason");
  await withMemoryClient((client) =>
    client
      .query(
        "UPDATE composer_repair_lessons SET status = 'retired', preventive = false, retirement_reason = $3, revision = revision + 1, updated_at = now() WHERE id = $1 AND scope_key = $2",
        [id, scope, reason],
      )
      .then(() => undefined),
  );
}

export async function enablePreventive(
  id: string,
  scope: string,
): Promise<void> {
  accountScope(scope);
  const result = await withMemoryClient((client) =>
    client.query(
      `UPDATE composer_repair_lessons l SET preventive = true, revision = revision + 1, updated_at = now()
     WHERE id = $1 AND scope_key = $2 AND status = 'active' AND
       (SELECT count(DISTINCT occurrence) FROM composer_repair_episodes e WHERE e.scope_key = l.scope_key AND e.processing = 'processed' AND l.id = ANY(e.lesson_ids)) >= 3 RETURNING id`,
      [id, scope],
    ),
  );
  if (!result.rowCount)
    throw new Error(
      "Preventive eligibility requires three independent supporting occurrences and an active lesson",
    );
}

export async function cleanupMemory(scope?: string): Promise<void> {
  if (scope) accountScope(scope);
  await withMemoryClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        "DELETE FROM composer_repair_episodes WHERE ($1::text IS NULL AND expires_at < now()) OR scope_key = $1",
        [scope ?? null],
      );
      if (scope)
        await client.query(
          "DELETE FROM composer_repair_lessons WHERE scope_key = $1",
          [scope],
        );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}
